/**
 * Validates and extracts the owner and repository name
 * from a GitHub repository URL.
 */

export const validateGitHubUrl = (repositoryUrl) => {
  if (typeof repositoryUrl !== "string" || !repositoryUrl.trim()) {
    return {
      valid: false,
      message: "Repository URL is required.",
    };
  }

  try {
    const url = new URL(repositoryUrl.trim());

    // Only accept HTTPS GitHub URLs.
    if (
      url.protocol !== "https:" ||
      url.hostname.toLowerCase() !== "github.com" ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return {
        valid: false,
        message: "Please provide a valid HTTPS GitHub repository URL.",
      };
    }

    const pathParts = url.pathname.split("/").filter(Boolean);

    if (pathParts.length !== 2) {
      return {
        valid: false,
        message: "URL must contain both a GitHub owner and repository name.",
      };
    }

    const [owner, rawRepository] = pathParts;

    const repository = rawRepository.replace(/\.git$/i, "");

    const ownerPattern = /^(?!-)[a-zA-Z0-9-]{1,39}(?<!-)$/;
    const repositoryPattern = /^[a-zA-Z0-9._-]+$/;

    if (
      !ownerPattern.test(owner) ||
      !repositoryPattern.test(repository) ||
      repository === "." ||
      repository === ".."
    ) {
      return {
        valid: false,
        message: "Invalid GitHub owner or repository name.",
      };
    }

    return {
      valid: true,
      owner,
      repository,
    };
  } catch {
    return {
      valid: false,
      message: "Invalid repository URL.",
    };
  }
};