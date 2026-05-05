import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./sidebar";
import PauseButton from "./pause-button";
import { useAgentState } from "../hooks/use-agent-state";
import { useNotifications } from "../hooks/use-notifications";

const TITLES: Record<string, string> = {
  "/status": "Status",
  "/servers": "MCP Servers",
  "/activity": "Activity",
  "/policy": "DLP & Policy",
  "/diagnostics": "Diagnostics",
  "/logs": "Logs",
  "/settings": "Settings",
  "/updates": "Updates",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const refresh = useAgentState((s) => s.refresh);
  useNotifications();

  // Poll daemon state every 2s
  useEffect(() => {
    refresh();
    const id = setInterval(() => refresh(), 2000);
    return () => clearInterval(id);
  }, [refresh]);

  const title = TITLES[location.pathname] ?? "";

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="titlebar-drag flex h-14 items-center justify-between border-b border-border/30 bg-bg-primary px-6">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <div className="no-drag">
            <PauseButton />
          </div>
        </header>
        <div className="no-drag flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
