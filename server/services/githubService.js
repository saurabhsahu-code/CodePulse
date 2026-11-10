
const GITHUB_API = "https://api.github.com";

const getGitHubHeaders = () => ({
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "CodePulse",
});

// Handles GitHub API responses consistently.
const handleGitHubResponse = async (response) => {
  if (response.ok) {
    return {
      success: true,
      data: await response.json(),
    };
  }

  if (response.status === 404) {
    return {
      success: false,
      statusCode: 404,
      message: "Repository or requested resource not found.",
    };
  }

  if (
    response.status === 429 ||
    (response.status === 403 &&
      response.headers.get("x-ratelimit-remaining") === "0")
  ) {
    return {
      success: false,
      statusCode: 429,
      message: "GitHub API rate limit exceeded.",
    };
  }

  if (response.status === 403) {
    return {
      success: false,
      statusCode: 403,
      message: "GitHub denied the API request.",
    };
  }

  return {
    success: false,
    statusCode: 502,
    message: "Unable to retrieve information from GitHub.",
  };
};

// Feature 3.1: Retrieve repository metadata.
export const getRepositoryDetails = async (owner, repository) => {
  const response = await fetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`,
    {
      method: "GET",
      headers: getGitHubHeaders(),
      signal: AbortSignal.timeout(10000),
    }
  );

  const result = await handleGitHubResponse(response);

  if (!result.success) {
    return result;
  }

  const data = result.data;

  return {
    success: true,
    data: {
      id: data.id,
      name: data.name,
      fullName: data.full_name,
      owner: data.owner.login,
      description: data.description,
      url: data.html_url,
      isPublic: !data.private,
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      defaultBranch: data.default_branch,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      pushedAt: data.pushed_at,
      archived: data.archived,
      disabled: data.disabled,
      hasIssues: data.has_issues,
      language: data.language,
    },
  };
};

// Feature 3.2: Retrieve the repository file tree.
export const getRepositoryTree = async (
  owner,
  repository,
  defaultBranch
) => {
  const response = await fetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
    {
      method: "GET",
      headers: getGitHubHeaders(),
      signal: AbortSignal.timeout(20000),
    }
  );

  const result = await handleGitHubResponse(response);

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    data: {
      tree: result.data.tree,
      truncated: result.data.truncated,
    },
  };
};
