import PostureScore from "../components/posture-score";
import { useAgentState } from "../hooks/use-agent-state";
import { useEvents, useEventStats } from "../hooks/use-events";
import EventRow from "../components/event-row";
import { formatRelativeTime } from "../lib/utils";
import { forceSyncNow, forceUploadNow, openDashboard, revealMedusaDir } from "../lib/tauri";
import { useState } from "react";
import { RefreshCw, Upload, FolderOpen, ExternalLink } from "lucide-react";

export default function Status() {
  const daemon = useAgentState((s) => s.daemon);
  const stats = useEventStats();
  const { events } = useEvents(8);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await forceSyncNow();
    } finally {
      setSyncing(false);
    }
  };
  const handleUpload = async () => {
    setUploading(true);
    try {
      await forceUploadNow();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PostureScore />

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="MCP Servers" value={daemon?.proxy_count ?? "—"} />
        <Tile label="Events 24h" value={stats?.events_24h ?? "—"} />
        <Tile label="Blocks 24h" value={stats?.blocks_24h ?? "—"} accent />
        <Tile label="Pending upload" value={stats?.pending ?? "—"} />
      </div>

      {/* Quick actions */}
      <div className="rounded-lg border border-border/30 bg-bg-card p-5">
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-secondary">
          Quick Actions
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionBtn icon={RefreshCw} label="Force Policy Refresh" onClick={handleSync} loading={syncing} />
          <ActionBtn icon={Upload} label="Force Telemetry Upload" onClick={handleUpload} loading={uploading} />
          <ActionBtn icon={FolderOpen} label="Reveal Config Folder" onClick={() => revealMedusaDir()} />
          <ActionBtn icon={ExternalLink} label="Open Dashboard" onClick={() => openDashboard()} />
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-lg border border-border/30 bg-bg-card">
        <div className="flex items-center justify-between border-b border-border/30 px-5 py-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-ink-secondary">
            Recent Activity
          </div>
          <div className="text-xs text-ink-secondary">
            Last refresh: {formatRelativeTime(useAgentState.getState().last_refresh)}
          </div>
        </div>
        <div className="grid grid-cols-12 gap-3 border-b border-border/30 px-3 py-2 text-[10px] uppercase tracking-widest text-ink-secondary">
          <div className="col-span-2">Time</div>
          <div className="col-span-1">Verdict</div>
          <div className="col-span-2">Tool</div>
          <div className="col-span-2">Server</div>
          <div className="col-span-2">Rule</div>
          <div className="col-span-3">Reason</div>
        </div>
        {events.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-ink-secondary">
            No events yet — start using an MCP client and they'll appear here.
          </div>
        ) : (
          events.map((e) => <EventRow key={e.id} event={e} />)
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border/30 bg-bg-card p-4">
      <div className="text-xs uppercase tracking-widest text-ink-secondary">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accent ? "text-accent-warn" : "text-ink-primary"}`}>
        {value}
      </div>
    </div>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  loading,
}: {
  icon: typeof RefreshCw;
  label: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 rounded-md border border-border/40 bg-bg-elevated px-3 py-2 text-xs font-medium text-ink-primary hover:bg-bg-elevated/80 disabled:opacity-50"
    >
      <Icon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
      {label}
    </button>
  );
}
