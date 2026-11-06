
import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";

function App() {
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [error, setError] = useState("");

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch("/api/health");

        if (!response.ok) {
          throw new Error("Backend request failed");
        }

        const data = await response.json();
        setBackendStatus(data.message);
        setError("");
      } catch (err) {
        setError(err.message);
        setBackendStatus("Backend connection failed");
      }
    };

    checkBackend();
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="min-w-0 flex-1 p-6 sm:p-8">
        <Header
          backendStatus={backendStatus}
          error={error}
        />

        <Dashboard />
      </main>
    </div>
  );
}

export default App;
