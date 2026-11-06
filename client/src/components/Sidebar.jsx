
const navigationItems = [
  { label: "Overview", icon: "◫", active: true },
  { label: "Repository Analysis", icon: "⌘", active: false },
  { label: "Anomalies", icon: "⚠", active: false },
  { label: "Recommendations", icon: "✧", active: false },
];

function Sidebar() {
  return (
    <aside className="flex min-h-screen w-64 flex-col border-r border-slate-200 bg-white px-5 py-6">
      {/* Brand */}
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
          C
        </div>

        <div>
          <h1 className="text-xl font-bold text-slate-900">
            CodePulse
          </h1>
          <p className="text-xs text-slate-500">
            Repository Intelligence
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Workspace
        </p>

        <div className="space-y-2">
          {navigationItems.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium ${
                item.active
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 pt-5">
        <p className="text-xs text-slate-500">
          CodePulse v0.1.0
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Repository Health Platform
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
