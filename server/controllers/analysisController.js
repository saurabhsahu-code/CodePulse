
import { validateGitHubUrl } from "../utils/githubValidator.js";

import {
  getRepositoryDetails,
  getRepositoryTree,
} from "../services/githubService.js";

import { analyzeFileTree } from "../utils/fileAnalyzer.js";
import { analyzeRepositoryHealth } from "../utils/healthAnalyzer.js";

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

    // Step 5: Add file-tree completeness information.
    const tree = {
      ...analysis,
      truncated: treeResult.data.truncated,
      completeness: treeResult.data.truncated
        ? "incomplete"
        : "complete",
    };

    // Step 6: Calculate repository health indicators.
    const health = analyzeRepositoryHealth(metadata, tree);

    // Step 7: Return structured analysis results.
    return res.status(200).json({
      success: true,
      message: tree.truncated
        ? "Repository analysis completed with a truncated file tree."
        : "Repository analysis completed successfully.",

      data: {
        metadata,
        tree,
        health,
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
