const GITHUB_API = "https://api.github.com";

export const getRepositoryDetails = async (owner, repository) => {
  const response = await fetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "CodePulse",
      },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (response.status === 404) {
    return {
      success: false,
      statusCode: 404,
      message: "Repository not found or is not publicly accessible.",
    };
  }

  if (response.status === 403 || response.status === 429) {
    const remaining = response.headers.get("x-ratelimit-remaining");

    if (remaining === "0" || response.status === 429) {
      return {
        success: false,
        statusCode: 429,
        message: "GitHub API rate limit exceeded. Please try again later.",
      };
    }

    return {
      success: false,
      statusCode: 403,
      message: "GitHub denied the repository request.",
    };
  }

  if (!response.ok) {
    return {
      success: false,
      statusCode: 502,
      message: "Unable to retrieve repository information from GitHub.",
    };
  }

  const data = await response.json();

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
      language: data.language,
    },
  };
};