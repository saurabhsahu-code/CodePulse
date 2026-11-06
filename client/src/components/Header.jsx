
function Header({ backendStatus, error }) {
  const isConnected =
    backendStatus === "CodePulse API is running";

  return (
    <header className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Dashboard Overview
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Monitor your repository health and code quality.
        </p>
      </div>

      <div className="flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 sm:self-auto">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            isConnected ? "bg-emerald-500" : "bg-red-500"
          }`}
        />

        <span className="text-sm font-medium text-slate-700">
          {error ? "Backend unavailable" : backendStatus}
        </span>
      </div>
    </header>
  );
}

export default Header;
