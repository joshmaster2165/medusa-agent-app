import { useState } from "react";
import { useEvents } from "../hooks/use-events";
import EventRow from "../components/event-row";

const VERDICTS = ["all", "allow", "block", "coach", "redact"] as const;

export default function Activity() {
  const [verdict, setVerdict] = useState<(typeof VERDICTS)[number]>("all");
  const { events, loading } = useEvents(200, verdict === "all" ? undefined : verdict);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {VERDICTS.map((v) => (
          <button
            key={v}
            onClick={() => setVerdict(v)}
            className={[
              "rounded-md px-3 py-1.5 text-xs font-medium uppercase tracking-widest transition-colors",
              verdict === v
                ? "bg-accent/15 text-accent"
                : "border border-border/40 bg-bg-elevated text-ink-secondary hover:text-ink-primary",
            ].join(" ")}
          >
            {v}
          </button>
        ))}
        <span className="ml-auto text-xs text-ink-secondary">
          {events.length} event{events.length === 1 ? "" : "s"} {loading && "(loading…)"}
        </span>
      </div>

      <div className="rounded-lg border border-border/30 bg-bg-card">
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
            No events match the current filter.
          </div>
        ) : (
          events.map((e) => <EventRow key={e.id} event={e} />)
        )}
      </div>
    </div>
  );
}
