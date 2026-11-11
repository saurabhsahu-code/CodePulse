
import { useState } from "react";

function Dashboard() {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async (event) => {
    event.preventDefault();

    if (!repositoryUrl.trim()) {
      setError("Please enter a GitHub repository URL.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const response = await fetch("/api/repositories/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repositoryUrl: repositoryUrl.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Repository analysis failed."
        );
      }

      setAnalysis(result.data);
    } catch (err) {
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const metadata = analysis?.metadata;
  const tree = analysis?.tree;
  const health = analysis?.health;

  const languageDistribution = Object.entries(
    tree?.languages ?? {}
  )
    .map(([language, count]) => ({
      language,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const totalLanguageFiles = languageDistribution.reduce(
    (total, item) => total + item.count,
    0
  );

  const languageColors = [
    "bg-blue-500",
    "bg-violet-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-orange-500",
  ];

  const healthIndicators = health
    ? [
      { key: "maintenance", label: "Maintenance Activity" },
      { key: "repositoryStatus", label: "Repository Status" },
      { key: "issueTracking", label: "Issue Tracking" },
      { key: "openWorkItems", label: "Open Work Items" },
      { key: "documentation", label: "Documentation" },
      { key: "codebase", label: "Codebase Composition" },
      { key: "analysisCompleteness", label: "Analysis Completeness" },
    ].map((item) => ({
      ...item,
      ...health.indicators[item.key],
    }))
    : [];

  const statusStyles = {
    good: "bg-emerald-50 text-emerald-700",
    moderate: "bg-amber-50 text-amber-700",
    needs_attention: "bg-red-50 text-red-700",
    info: "bg-blue-50 text-blue-700",
    unknown: "bg-slate-100 text-slate-600",
  };

  const anomalyData = analysis?.anomalies;
  const anomalyFiles = anomalyData?.anomalies ?? [];

  const languageThresholds = Object.entries(
    anomalyData?.thresholdsByLanguage ?? {}
  ).map(([language, details]) => ({
    language,
    ...details,
  }));

  const anomalyStatusStyles = {
    completed: "bg-emerald-50 text-emerald-700",
    insufficient_data: "bg-amber-50 text-amber-700",
  };

  const formatIndicatorValue = (key, value) => {
    if (key === "codebase") {
      return `${value.totalFiles.toLocaleString()} files · ${Object.keys(value.languages).length
        } languages`;
    }

    if (typeof value === "boolean") {
      return value ? "Enabled / Found" : "Disabled / Not Found";
    }

    return String(value);
  };

  const repositoryMetrics = metadata
    ? [
      { label: "Stars", value: metadata.stars.toLocaleString() },
      { label: "Forks", value: metadata.forks.toLocaleString() },
      { label: "Open Issues", value: metadata.openIssues.toLocaleString() },
      { label: "Primary Language", value: metadata.language || "Not specified" },
    ]
    : [];

  return (
    <div className="space-y-6">
      {/* Repository input */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">
          Analyze a GitHub Repository
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Enter a public GitHub repository URL to analyze its health,
          codebase structure, and file-size anomalies.
        </p>

        <form
          onSubmit={handleAnalyze}
          className="mt-5 flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="url"
            value={repositoryUrl}
            onChange={(event) => setRepositoryUrl(event.target.value)}
            placeholder="https://github.com/facebook/react"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Analyzing..." : "Analyze Repository"}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>

      {/* Repository overview */}
      {metadata && (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Analyzed Repository
                </p>

                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  {metadata.fullName}
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  {metadata.description || "No description available."}
                </p>

                <a
                  href={metadata.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  View on GitHub →
                </a>
              </div>

              <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                {metadata.isPublic ? "Public Repository" : "Private Repository"}
              </span>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500">
                Default branch:{" "}
                <span className="font-semibold text-slate-700">
                  {metadata.defaultBranch}
                </span>
              </p>
            </div>
          </section>

          {/* Repository metrics */}
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Repository Overview
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Live information retrieved from GitHub.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {repositoryMetrics.map((metric) => (
                <article
                  key={metric.label}
                  className="rounded-xl border border-slate-200 bg-white p-5"
                >
                  <p className="text-sm font-medium text-slate-500">
                    {metric.label}
                  </p>

                  <p className="mt-3 break-words text-2xl font-bold text-slate-900">
                    {metric.value}
                  </p>
                </article>
              ))}
            </div>
          </section>

          {/* Codebase summary */}
          {tree && (
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold text-slate-900">
                Codebase Summary
              </h2>

              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "Total Files", value: tree.totalFiles },
                  { label: "Directories", value: tree.totalDirectories },
                  { label: "Source Files", value: tree.sourceFiles },
                  { label: "Supporting Files", value: tree.supportingFiles },
                ].map((metric) => (
                  <div key={metric.label}>
                    <p className="text-xs text-slate-500">{metric.label}</p>
                    <p className="mt-2 text-xl font-bold text-slate-900">
                      {metric.value.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {/* Repository health indicators */}
      {health && (
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Repository Health
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Explainable indicators based on repository metadata
              and codebase analysis.
            </p>
          </div>

          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">
              Overall Health Status
            </p>

            <span
              className={`mt-3 inline-block rounded-full px-4 py-2 text-sm font-semibold ${statusStyles[health.overallStatus] ||
                statusStyles.unknown
                }`}
            >
              {health.overallStatus.replaceAll("_", " ").toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {healthIndicators.map((indicator) => (
              <article
                key={indicator.key}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-800">
                    {indicator.label}
                  </h3>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[indicator.status] ||
                      statusStyles.unknown
                      }`}
                  >
                    {indicator.status.replaceAll("_", " ")}
                  </span>
                </div>

                <p className="mt-4 text-xl font-bold text-slate-900">
                  {formatIndicatorValue(
                    indicator.key,
                    indicator.value
                  )}
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {indicator.explanation}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
      {/* File-size anomaly dashboard */}
      {anomalyData && (
        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              File-Size Anomalies
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Unusually large source files detected using
              language-specific statistical thresholds.
            </p>
          </div>

          {/* Detection summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Detection Status
                </p>

                <span
                  className={`mt-2 inline-block rounded-full px-3 py-1.5 text-xs font-semibold ${anomalyStatusStyles[anomalyData.status] ||
                    "bg-slate-100 text-slate-600"
                    }`}
                >
                  {anomalyData.status.replaceAll("_", " ").toUpperCase()}
                </span>
              </div>

              <div className="text-right">
                <p className="text-sm text-slate-500">
                  Detected Anomalies
                </p>

                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {anomalyData.anomalyCount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">
                  Files Analyzed
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {anomalyData.sampleSize.toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Detection Method
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {anomalyData.method}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              {anomalyData.explanation}
            </p>
          </div>

          {/* Language-specific thresholds */}
          <div>
            <h3 className="mb-3 text-base font-bold text-slate-900">
              Language Detection Thresholds
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {languageThresholds.map((item) => (
                <article
                  key={item.language}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <h4 className="font-semibold text-slate-800">
                    {item.language}
                  </h4>

                  <p className="mt-3 text-xl font-bold text-slate-900">
                    {item.formattedThreshold}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Upper size threshold
                  </p>

                  <div className="mt-3 flex justify-between gap-2 text-xs text-slate-500">
                    <span>
                      Sample: {item.sampleSize.toLocaleString()}
                    </span>
                    <span>
                      Anomalies: {item.anomalyCount}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Detected files */}
          <div>
            <div className="mb-3">
              <h3 className="text-base font-bold text-slate-900">
                Detected Files
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Files exceeding their language-specific upper thresholds.
              </p>
            </div>

            {anomalyFiles.length > 0 ? (
              <div className="space-y-3">
                {anomalyFiles.map((file, index) => (
                  <article
                    key={`${file.path}-${index}`}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="break-all text-sm font-semibold text-slate-900">
                          {file.path}
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          {file.language}
                        </p>
                      </div>

                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        Anomaly
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-slate-500">
                          File Size
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {file.formattedSize}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Detection Threshold
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {file.formattedThreshold}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs leading-5 text-slate-600">
                      {file.explanation}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
                <p className="font-medium text-slate-700">
                  No file-size anomalies detected.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  No analyzed files exceeded their language-specific thresholds.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Language distribution */}
      {tree && (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Language Distribution
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Breakdown of source files by detected programming language.
            </p>
          </div>

          {languageDistribution.length > 0 ? (
            <div className="mt-6 space-y-5">
              <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100">
                {languageDistribution.map((item, index) => {
                  const percentage =
                    (item.count / totalLanguageFiles) * 100;

                  return (
                    <div
                      key={item.language}
                      className={`${languageColors[index % languageColors.length]} h-full`}
                      style={{ width: `${percentage}%` }}
                      title={`${item.language}: ${percentage.toFixed(1)}%`}
                    />
                  );
                })}
              </div>

              <div className="space-y-4">
                {languageDistribution.map((item, index) => {
                  const percentage =
                    (item.count / totalLanguageFiles) * 100;

                  return (
                    <div key={item.language}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-3 w-3 rounded-sm ${languageColors[index % languageColors.length]
                              }`}
                          />

                          <span className="text-sm font-medium text-slate-700">
                            {item.language}
                          </span>
                        </div>

                        <div className="text-right text-sm">
                          <span className="font-semibold text-slate-900">
                            {item.count.toLocaleString()}
                          </span>

                          <span className="ml-2 text-slate-500">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${languageColors[index % languageColors.length]
                            }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="border-t border-slate-100 pt-4 text-xs text-slate-500">
                Total language-classified files:{" "}
                {totalLanguageFiles.toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
              No language distribution data is available for this repository.
            </p>
          )}
        </section>
      )}

    </div>
  );
}

export default Dashboard;
