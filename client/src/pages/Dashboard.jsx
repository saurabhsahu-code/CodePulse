
const demoMetrics = [
  {
    title: "Maintainability",
    value: "82/100",
    description: "Illustrative maintainability score",
    icon: "◈",
    color: "blue",
  },
  {
    title: "Complexity",
    value: "14",
    description: "Illustrative high-complexity files",
    icon: "⌘",
    color: "amber",
  },
  {
    title: "Dependency Health",
    value: "76%",
    description: "Illustrative dependency health",
    icon: "⬡",
    color: "emerald",
  },
  {
    title: "Anomalies",
    value: "3",
    description: "Illustrative detected issues",
    icon: "⚠",
    color: "red",
  },
];

const recentActivity = [
  {
    title: "Repository scan completed",
    description: "Sample activity · Code quality analysis",
    time: "Today",
    status: "Completed",
  },
  {
    title: "Dependency analysis",
    description: "Sample activity · Dependency health check",
    time: "Yesterday",
    status: "Completed",
  },
  {
    title: "Anomaly detection",
    description: "Sample activity · Code pattern analysis",
    time: "Yesterday",
    status: "Review",
  },
];

const colorStyles = {
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-amber-50 text-amber-700",
  emerald: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
};

function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Demonstration data notice */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <p className="text-sm font-medium text-blue-800">
          Demonstration Dashboard
        </p>
        <p className="mt-1 text-xs text-blue-700">
          All repository metrics and activities below are sample
          data. Real analysis will be connected in a later milestone.
        </p>
      </div>

      {/* Repository summary */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-slate-500">
              SELECTED REPOSITORY
            </p>

            <h2 className="mt-2 text-xl font-bold text-slate-900">
              codepulse-demo
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Sample repository · JavaScript
            </p>
          </div>

          <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
            Demo repository
          </span>
        </div>
      </section>

      {/* Health score and metrics */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Repository Health
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Key indicators of repository quality and maintenance.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {demoMetrics.map((metric) => (
            <article
              key={metric.title}
              className="rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  {metric.title}
                </p>

                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${colorStyles[metric.color]}`}
                >
                  {metric.icon}
                </span>
              </div>

              <p className="mt-4 text-3xl font-bold text-slate-900">
                {metric.value}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                {metric.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900">
            Recent Activity
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Latest repository analysis events.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {recentActivity.map((activity) => (
            <div
              key={activity.title}
              className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
            >
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  {activity.title}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  {activity.description}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    activity.status === "Completed"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {activity.status}
                </span>

                <span className="text-xs text-slate-400">
                  {activity.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
