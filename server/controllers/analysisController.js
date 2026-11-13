
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


export const analyzeRepository = async (req, res) => {
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

    // Step 8: Return structured analysis results.
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
