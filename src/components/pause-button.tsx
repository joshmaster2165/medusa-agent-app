/**
 * "Pause Protection" dropdown — top-right of every page.
 * Calls the daemon's local control endpoint via Tauri command.
 */
import { useState, useRef, useEffect } from "react";
import { Pause, Play, ChevronDown } from "lucide-react";
import { pauseProtection, resumeProtection } from "../lib/tauri";
import { useAgentState } from "../hooks/use-agent-state";
import { formatRelativeTime } from "../lib/utils";

const PAUSE_OPTIONS: Array<{ label: string; seconds: number }> = [
  { label: "5 minutes", seconds: 5 * 60 },
  { label: "30 minutes", seconds: 30 * 60 },
  { label: "1 hour", seconds: 60 * 60 },
  { label: "Until tomorrow (24h)", seconds: 24 * 60 * 60 },
  { label: "Until I resume", seconds: 365 * 24 * 60 * 60 },
];

export default function PauseButton() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const daemon = useAgentState((s) => s.daemon);
  const refresh = useAgentState((s) => s.refresh);

  const isPaused = !!daemon?.paused_until;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handlePause = async (seconds: number) => {
    setOpen(false);
    try {
      await pauseProtection(seconds);
      await refresh();
    } catch (e) {
      console.error("Pause failed:", e);
    }
  };

  const handleResume = async () => {
    try {
      await resumeProtection();
      await refresh();
    } catch (e) {
      console.error("Resume failed:", e);
    }
  };

  if (isPaused) {
    return (
      <button
        onClick={handleResume}
        className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20"
      >
        <Play className="h-3.5 w-3.5" />
        Resume Protection
        <span className="text-ink-secondary">
          (paused {formatRelativeTime(daemon?.paused_until)})
        </span>
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-border/40 bg-bg-elevated px-3 py-1.5 text-xs font-medium text-ink-primary hover:bg-bg-elevated/80"
      >
        <Pause className="h-3.5 w-3.5" />
        Pause Protection
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-md border border-border/40 bg-bg-card shadow-xl">
          {PAUSE_OPTIONS.map((opt) => (
            <button
              key={opt.seconds}
              onClick={() => handlePause(opt.seconds)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-ink-primary hover:bg-bg-elevated"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
