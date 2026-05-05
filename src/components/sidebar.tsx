import { NavLink } from "react-router-dom";
import {
  Activity as ActivityIcon,
  Server,
  Shield,
  Stethoscope,
  ScrollText,
  Settings as SettingsIcon,
  Gauge,
  Download,
  ExternalLink,
} from "lucide-react";
import { useAgentState } from "../hooks/use-agent-state";
import { openDashboard } from "../lib/tauri";

const NAV = [
  { to: "/status", label: "Status", icon: Gauge },
  { to: "/servers", label: "MCP Servers", icon: Server },
  { to: "/activity", label: "Activity", icon: ActivityIcon },
  { to: "/policy", label: "DLP & Policy", icon: Shield },
  { to: "/diagnostics", label: "Diagnostics", icon: Stethoscope },
  { to: "/logs", label: "Logs", icon: ScrollText },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
  { to: "/updates", label: "Updates", icon: Download },
];

export default function Sidebar() {
  const daemon = useAgentState((s) => s.daemon);
  const config = useAgentState((s) => s.config);

  const dotColor = !daemon
    ? "bg-accent-warn"
    : daemon.paused_until
      ? "bg-ink-secondary"
      : daemon.running
        ? "bg-accent"
        : "bg-accent-warn";

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border/30 bg-bg-card">
      {/* Brand */}
      <div className="titlebar-drag flex h-14 items-center gap-2 border-b border-border/30 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-accent/10 text-accent font-bold">
          M
        </div>
        <span className="text-sm font-semibold tracking-tight">Medusa</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-bg-elevated text-ink-primary"
                  : "text-ink-secondary hover:bg-bg-elevated/60 hover:text-ink-primary",
              ].join(" ")
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer status block */}
      <div className="border-t border-border/30 p-3 text-xs">
        <button
          onClick={() => openDashboard().catch(() => {})}
          className="mb-3 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-ink-secondary hover:bg-bg-elevated hover:text-ink-primary"
        >
          <span>Open Dashboard</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-center gap-2 px-2">
          <span className={`h-2 w-2 rounded-full ${dotColor}`} />
          <span className="text-ink-primary">
            {daemon?.paused_until ? "Paused" : daemon?.running ? "Protection On" : "Inactive"}
          </span>
        </div>
        <div className="mt-1 px-2 text-ink-secondary">
          v{daemon?.agent_version ?? "?"} • {config?.hostname ?? "—"}
        </div>
      </div>
    </aside>
  );
}
