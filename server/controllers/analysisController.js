
import { validateGitHubUrl } from "../utils/githubValidator.js";

import {
  getRepositoryDetails,
  getRepositoryTree,
  getRepositoryCommits,
} from "../services/githubService.js";

import { analyzeFileTree } from "../utils/fileAnalyzer.js";
import { analyzeRepositoryHealth } from "../utils/healthAnalyzer.js";
import { analyzeFileSizeAnomalies } from "../utils/anomalyAnalyzer.js";
import { analyzeRepositoryActivity } from "../utils/activityAnalyzer.js";
import { collectSourceCodeMetrics } from "../services/metricsCollectionService.js";


export const createUnavailableMetrics = (eligibleSourceFiles, explanation) => ({
  status: "unavailable",
  dataCompleteness: "unavailable",
  isComplete: false,
  summary: {
    totalLines: 0,
    blankLines: 0,
    nonBlankLines: 0,
    blankLinePercentage: 0,
    singleLineCommentLines: 0,
    blockCommentLines: 0,
    totalCommentLines: 0,
    commentLinePercentage: 0,
    commentSupportedFiles: 0,
    commentUnsupportedFiles: 0,
  },
  fileCounts: {
    eligibleSourceFiles: Array.isArray(eligibleSourceFiles)
      ? eligibleSourceFiles.length
      : 0,
    analyzed: 0,
    skipped: 0,
    failed: 0,
    commentSupported: 0,
    commentUnsupported: 0,
  },
  skippedFiles: [],
  failedFiles: [],
  languages: {},
  limits: {
    maxFilesAnalyzed: 50,
    maxFileSizeBytes: 262144,
    concurrencyLimit: 4,
    perFileTimeoutMs: 6000,
    globalTimeoutMs: 20000,
  },
  explanation:
    explanation || "Source-code metrics analysis was unavailable.",
});

export const analyzeRepository = async (req, res, options = {}) => {
  try {
    // Step 1: Validate repository URL.
    const validation = validateGitHubUrl(req.body.repositoryUrl);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const { owner, repository } = validation;

    // Step 2: Retrieve repository metadata.
    const repositoryResult = await getRepositoryDetails(
      owner,
      repository
    );

    if (!repositoryResult.success) {
      return res.status(repositoryResult.statusCode).json({
        success: false,
        message: repositoryResult.message,
      });
    }

    const metadata = repositoryResult.data;
    // Step 3: Retrieve and analyze recent commit activity.
    const activitySince = new Date(
      Date.now() - 90 * 24 * 60 * 60 * 1000
    ).toISOString();

    const activityResult = await getRepositoryCommits(
      owner,
      repository,
      activitySince
    );

    // Keep activity analysis separate from core repository analysis.
    // A GitHub activity request failure should not stop file analysis.
    const activity = activityResult.success
      ? analyzeRepositoryActivity(activityResult.data, {
        pagination: activityResult.pagination,
      })
      : {
        status: "unavailable",
        dataCompleteness: "unavailable",
        explanation: activityResult.message,
      };

    // Step 3: Retrieve repository file tree.
    const treeResult = await getRepositoryTree(
      owner,
      repository,
      metadata.defaultBranch
    );

    if (!treeResult.success) {
      return res.status(treeResult.statusCode).json({
        success: false,
        message: treeResult.message,
      });
    }

    // Step 4: Analyze the retrieved file tree.
    const analysis = analyzeFileTree(treeResult.data.tree);

    // Step 5: Run file-size anomaly detection.
    const anomalies = analyzeFileSizeAnomalies(
      analysis.sourceFileSizes
    );

    // Keep eligible source files for metrics collection before deleting internal property.
    const eligibleSourceFiles = analysis.sourceFileSizes;

    // Keep the raw source-file size list internal.
    const treeAnalysis = { ...analysis };
    delete treeAnalysis.sourceFileSizes;

    // Step 6: Add file-tree completeness information.
    const tree = {
      ...treeAnalysis,
      truncated: treeResult.data.truncated,
      completeness: treeResult.data.truncated
        ? "incomplete"
        : "complete",
    };

    // Step 7: Calculate repository health indicators.
    const health = analyzeRepositoryHealth(metadata, tree);

    // Step 8: Retrieve and analyze advanced source-code metrics.
    // Isolate metrics collection so an unexpected failure never breaks core analysis.
    const collectMetrics =
      options?.collectMetrics ||
      req?._collectMetrics ||
      collectSourceCodeMetrics;

    let metrics;
    try {
      const metricsResult = await collectMetrics(
        owner,
        repository,
        eligibleSourceFiles,
        {
          treeTruncated: treeResult.data.truncated,
        }
      );

      metrics = metricsResult?.success
        ? metricsResult.data
        : createUnavailableMetrics(
            eligibleSourceFiles,
            metricsResult?.message
          );
    } catch (metricsError) {
      console.error("Source metrics collection error:", metricsError);
      metrics = createUnavailableMetrics(
        eligibleSourceFiles,
        "Source-code metrics analysis encountered an unexpected internal error."
      );
    }

    // Step 9: Return structured analysis results.
    return res.status(200).json({
      success: true,
      message: tree.truncated
        ? "Repository analysis completed with a truncated file tree."
        : "Repository analysis completed successfully.",

      data: {
        metadata,
        tree,
        health,
        activity,
        anomalies: {
          ...anomalies,
          sourceTreeTruncated: tree.truncated,
        },
        metrics,
      },
    });
  } catch (error) {
    console.error("Repository analysis error:", error);

    if (
      error.name === "TimeoutError" ||
      error.name === "AbortError"
    ) {
      return res.status(504).json({
        success: false,
        message: "GitHub request timed out. Please try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error during repository analysis.",
    });
  }
};
