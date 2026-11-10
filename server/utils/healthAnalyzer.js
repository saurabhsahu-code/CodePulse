
const getMaintenanceStatus = (pushedAt) => {
  if (!pushedAt) {
    return {
      value: null,
      status: "unknown",
      explanation: "Last push date is unavailable.",
    };
  }

  const pushDate = new Date(pushedAt);

  if (Number.isNaN(pushDate.getTime())) {
    return {
      value: null,
      status: "unknown",
      explanation: "Last push date is invalid.",
    };
  }

  const daysSinceLastPush = Math.floor(
    (Date.now() - pushDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastPush < 0) {
    return {
      value: daysSinceLastPush,
      status: "unknown",
      explanation: "Last push date is in the future.",
    };
  }

  let status;
  let explanation;

  if (daysSinceLastPush <= 30) {
    status = "good";
    explanation = "The repository has received a recent code push.";
  } else if (daysSinceLastPush <= 90) {
    status = "moderate";
    explanation = "The repository has not received a code push recently.";
  } else {
    status = "needs_attention";
    explanation = "No code push has been detected in over 90 days.";
  }

  return {
    value: daysSinceLastPush,
    status,
    explanation,
  };
};

const getRepositoryStatus = (metadata) => {
  if (metadata.disabled) {
    return {
      value: "disabled",
      status: "needs_attention",
      explanation: "GitHub has disabled this repository.",
    };
  }

  if (metadata.archived) {
    return {
      value: "archived",
      status: "info",
      explanation: "This repository has been archived by its owner.",
    };
  }

  return {
    value: "active",
    status: "good",
    explanation: "The repository is not archived or disabled.",
  };
};

const getIssueTrackingStatus = (hasIssues) => {
  if (typeof hasIssues !== "boolean") {
    return {
      value: null,
      status: "unknown",
      explanation: "Issue-tracking information is unavailable.",
    };
  }

  return {
    value: hasIssues,
    status: hasIssues ? "good" : "info",
    explanation: hasIssues
      ? "GitHub issue tracking is enabled."
      : "GitHub issue tracking is disabled.",
  };
};

const getOpenWorkItemsStatus = (openIssues) => {
  if (!Number.isFinite(openIssues) || openIssues < 0) {
    return {
      value: null,
      status: "unknown",
      explanation: "Open work-item information is unavailable.",
    };
  }

  return {
    value: openIssues,
    status: "info",
    explanation:
      "This count includes open issues and pull requests. It is informational, not a quality score.",
  };
};

const getDocumentationStatus = (hasReadme) => {
  if (typeof hasReadme !== "boolean") {
    return {
      value: null,
      status: "unknown",
      explanation: "Documentation information is unavailable.",
    };
  }

  return {
    value: hasReadme,
    status: hasReadme ? "good" : "needs_attention",
    explanation: hasReadme
      ? "A README file was found in the repository."
      : "No README file was found in the analyzed file tree.",
  };
};

const getCodebaseStatus = (tree) => {
  if (
    !Number.isFinite(tree.totalFiles) ||
    !Number.isFinite(tree.sourceFiles) ||
    !Number.isFinite(tree.supportingFiles) ||
    tree.totalFiles < 0 ||
    tree.sourceFiles < 0 ||
    tree.supportingFiles < 0
  ) {
    return {
      value: null,
      status: "unknown",
      explanation: "Codebase composition could not be evaluated.",
    };
  }

  return {
    value: {
      totalFiles: tree.totalFiles,
      sourceFiles: tree.sourceFiles,
      supportingFiles: tree.supportingFiles,
      languages: tree.languages,
    },
    status: "info",
    explanation:
      "File counts and language distribution describe repository composition, not code quality.",
  };
};

const getAnalysisCompletenessStatus = (tree) => {
  if (typeof tree.truncated !== "boolean") {
    return {
      value: null,
      status: "unknown",
      explanation: "File-tree completeness information is unavailable.",
    };
  }

  return {
    value: tree.completeness,
    status: tree.truncated ? "needs_attention" : "good",
    explanation: tree.truncated
      ? "GitHub returned an incomplete file tree. Some files may be missing from the analysis."
      : "The complete file tree was retrieved successfully.",
  };
};

export const analyzeRepositoryHealth = (metadata, tree) => {
  const indicators = {
    maintenance: getMaintenanceStatus(metadata.pushedAt),
    repositoryStatus: getRepositoryStatus(metadata),
    issueTracking: getIssueTrackingStatus(metadata.hasIssues),
    openWorkItems: getOpenWorkItemsStatus(metadata.openIssues),
    documentation: getDocumentationStatus(tree.hasReadme),
    codebase: getCodebaseStatus(tree),
    analysisCompleteness: getAnalysisCompletenessStatus(tree),
  };

  const statuses = Object.values(indicators).map(
    (indicator) => indicator.status
  );

  let overallStatus = "good";

  if (statuses.includes("needs_attention")) {
    overallStatus = "needs_attention";
  } else if (statuses.includes("unknown")) {
    overallStatus = "incomplete";
  } else if (statuses.includes("moderate")) {
    overallStatus = "moderate";
  }

  return {
    overallStatus,
    indicators,
  };
};
