import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "./components/layout";
import Onboarding from "./components/onboarding";
import Status from "./routes/status";
import Servers from "./routes/servers";
import Activity from "./routes/activity";
import Policy from "./routes/policy";
import Diagnostics from "./routes/diagnostics";
import Logs from "./routes/logs";
import Settings from "./routes/settings";
import Updates from "./routes/updates";
import { useAgentState } from "./hooks/use-agent-state";

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const refresh = useAgentState((s) => s.refresh);

  useEffect(() => {
    // On boot, decide whether to run the onboarding wizard.
    // If agent-config.yaml is missing or has no api_key, show it.
    refresh().then((state) => {
      const needsOnboarding =
        !state.config_loaded ||
        !state.config?.api_key ||
        state.config.api_key.trim() === "";
      setShowOnboarding(needsOnboarding);
    });
  }, [refresh]);

  if (showOnboarding === null) {
    return (
      <div className="flex h-full items-center justify-center text-ink-secondary">
        Loading…
      </div>
    );
  }

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/status" replace />} />
        <Route path="/status" element={<Status />} />
        <Route path="/servers" element={<Servers />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/policy" element={<Policy />} />
        <Route path="/diagnostics" element={<Diagnostics />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/updates" element={<Updates />} />
      </Routes>
    </Layout>
  );
}
