import type { GatewayEvent } from "../lib/tauri";
import { formatTimestamp } from "../lib/utils";

const VERDICT_COLORS: Record<string, string> = {
  allow: "text-ink-secondary",
  block: "text-accent-warn",
  coach: "text-amber-300",
  redact: "text-blue-300",
  allowed_paused: "text-ink-secondary italic",
};

export default function EventRow({ event }: { event: GatewayEvent }) {
  const verdictClass = VERDICT_COLORS[event.verdict] ?? "text-ink-primary";

  return (
    <div className="grid grid-cols-12 gap-3 border-b border-border/20 px-3 py-2 text-xs hover:bg-bg-elevated/40">
      <div className="col-span-2 font-mono text-ink-secondary">
        {formatTimestamp(event.timestamp)}
      </div>
      <div className={`col-span-1 font-mono uppercase ${verdictClass}`}>
        {event.verdict}
      </div>
      <div className="col-span-2 truncate font-mono text-ink-primary">
        {event.tool_name ?? event.method ?? event.message_type}
      </div>
      <div className="col-span-2 truncate text-ink-secondary">{event.server_name || "—"}</div>
      <div className="col-span-2 truncate text-ink-secondary">{event.rule_name || "—"}</div>
      <div className="col-span-3 truncate text-ink-secondary">{event.reason || "—"}</div>
    </div>
  );
}
