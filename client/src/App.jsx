
import { useEffect, useState } from "react";

function App() {
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [error, setError] = useState("");

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(
          "/api/health"
        );

        if (!response.ok) {
          throw new Error("Backend request failed");
        }

        const data = await response.json();

        setBackendStatus(data.message);
      } catch (err) {
        setError(err.message);
        setBackendStatus("Backend connection failed");
      }
    };

    checkBackend();
  }, []);

  return (
    <main>
      <h1>CodePulse</h1>

      <p>Repository Health Monitoring Platform</p>

      <h2>Backend Connection</h2>

      <p>{backendStatus}</p>

      {error && <p>Error: {error}</p>}
    </main>
  );
}

export default App;
