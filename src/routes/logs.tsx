import { useEffect, useRef, useState } from "react";
import { tailLog } from "../lib/tauri";
import { Pause, Play, Search } from "lucide-react";

const SEVERITIES = ["all", "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] as const;

export default function Logs() {
  const [lines, setLines] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState("");
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>("all");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (paused) return;
      try {
        const next = await tailLog(500);
        if (!cancelled) {
          setLines(next);
          // Auto-scroll to bottom
          requestAnimationFrame(() => {
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
          });
        }
      } catch {
        // ignore
      }
    };
    load();
    const id = setInterval(load, 1500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [paused]);

  const filtered = lines.filter((line) => {
    if (severity !== "all" && !line.includes(severity)) return false;
    if (filter && !line.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPaused((v) => !v)}
          className="flex items-center gap-2 rounded-md border border-border/40 bg-bg-elevated px-3 py-1.5 text-xs hover:bg-bg-elevated/80"
        >
          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          {paused ? "Resume" : "Pause"}
        </button>

        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as (typeof SEVERITIES)[number])}
          className="rounded-md border border-border/40 bg-bg-elevated px-2 py-1.5 text-xs"
        >
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-secondary" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter…"
            className="w-full rounded-md border border-border/40 bg-bg-elevated py-1.5 pl-8 pr-3 text-xs"
          />
        </div>

        <span className="text-xs text-ink-secondary">
          {filtered.length} / {lines.length}
        </span>
      </div>

      {/* Log viewer */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto rounded-lg border border-border/30 bg-bg-deep p-3 font-mono text-[11px]"
      >
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-ink-secondary">No log lines match.</div>
        ) : (
          filtered.map((line, i) => (
            <div
              key={i}
              className={[
                "whitespace-pre-wrap py-0.5",
                line.includes("CRITICAL")
                  ? "text-accent-warn"
                  : line.includes("ERROR")
                    ? "text-accent-warn/90"
                    : line.includes("WARNING")
                      ? "text-amber-300"
                      : "text-ink-primary/85",
              ].join(" ")}
            >
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
