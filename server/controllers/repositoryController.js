import { validateGitHubUrl } from "../utils/githubValidator.js";
import { getRepositoryDetails } from "../services/githubService.js";

export const validateRepository = async (req, res) => {
  try {
    const { repositoryUrl } = req.body;

    // Step 1: Validate URL structure.
    const validation = validateGitHubUrl(repositoryUrl);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    // Step 2: Verify repository using GitHub API.
    const result = await getRepositoryDetails(
      validation.owner,
      validation.repository
    );

    if (!result.success) {
      return res.status(result.statusCode).json({
        success: false,
        message: result.message,
      });
    }

    // Step 3: Return repository details.
    return res.status(200).json({
      success: true,
      message: "Repository validated successfully.",
      data: result.data,
    });
  } catch (error) {
    console.error("Repository validation error:", error);

    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return res.status(504).json({
        success: false,
        message: "GitHub request timed out. Please try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};