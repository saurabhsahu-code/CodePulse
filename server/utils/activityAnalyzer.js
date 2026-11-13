
const ANALYSIS_PERIOD_DAYS = 90;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Feature 3.7: Analyze repository commit activity.
export const analyzeRepositoryActivity = (
  commits,
  options = {}
) => {
  const now = options.now ?? new Date();
  const periodDays = options.periodDays ?? ANALYSIS_PERIOD_DAYS;

  const validCommits = Array.isArray(commits)
    ? commits.filter((commit) => {
      return (
        commit &&
        typeof commit.date === "string" &&
        !Number.isNaN(Date.parse(commit.date))
      );
    })
    : [];

  const periodStart = new Date(
    now.getTime() - periodDays * DAY_IN_MS
  );

  const recentCommits = validCommits
    .filter((commit) => {
      const commitDate = new Date(commit.date);

      return (
        commitDate >= periodStart &&
        commitDate <= now
      );
    })
    .sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    );

  const commitsByDay = {};

  for (const commit of recentCommits) {
    const day = commit.date.slice(0, 10);

    commitsByDay[day] = (commitsByDay[day] ?? 0) + 1;
  }

  const contributors = new Set(
    recentCommits
      .map((commit) => commit.author)
      .filter(Boolean)
  );

  const latestCommit = recentCommits[0] ?? null;

  const daysSinceLastCommit = latestCommit
    ? Math.floor(
      (now.getTime() - new Date(latestCommit.date).getTime()) /
      DAY_IN_MS
    )
    : null;

  const commitCount = recentCommits.length;

  const commitsPerDay = Number(
    (commitCount / periodDays).toFixed(2)
  );

  const commitsPerWeek = Number(
    (commitCount / (periodDays / 7)).toFixed(2)
  );

  let activityStatus = "inactive";
  let explanation = "No commits were found during the analysis period.";

  if (commitCount > 0) {
    if (daysSinceLastCommit <= 7) {
      activityStatus = "active";
      explanation =
        "Recent commit activity was detected within the last 7 days.";
    } else if (daysSinceLastCommit <= 30) {
      activityStatus = "moderate";
      explanation =
        "The repository has recent activity, but its latest commit was more than 7 days ago.";
    } else {
      activityStatus = "low";
      explanation =
        "The latest commit is more than 30 days old.";
    }
  }

  return {
    status: "completed",
    pagination: options.pagination ?? null,
    dataCompleteness: options.pagination?.status ?? "unknown",
    analysisPeriodDays: periodDays,
    commitCount,
    commitsPerDay,
    commitsPerWeek,
    contributorCount: contributors.size,
    contributors: [...contributors],
    latestCommit: latestCommit
      ? {
        sha: latestCommit.sha,
        url: latestCommit.url,
        author: latestCommit.author,
        authorName: latestCommit.authorName,
        date: latestCommit.date,
      }
      : null,
    daysSinceLastCommit,
    commitsByDay,
    activityStatus,
    explanation,
  };
};
