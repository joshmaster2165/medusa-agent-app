/**
 * Big circular posture score widget shown on the Status page.
 */
import { useEffect, useState } from "react";
import { postureScore } from "../lib/tauri";

export default function PostureScore() {
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await postureScore();
        if (!cancelled) setScore(r.score);
      } catch {
        // ignore
      }
    };
    load();
    const id = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const color =
    score === null
      ? "text-ink-secondary"
      : score >= 80
        ? "text-accent"
        : score >= 50
          ? "text-accent-warn"
          : "text-accent-warn";

  const label =
    score === null
      ? "—"
      : score >= 80
        ? "Strong"
        : score >= 50
          ? "Adequate"
          : "Needs attention";

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border/30 bg-bg-card p-5">
      <div className={`relative flex h-20 w-20 items-center justify-center rounded-full ${color}`}>
        <svg className="absolute inset-0" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="44"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            strokeDasharray={`${((score ?? 0) / 100) * 276} 276`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            opacity="0.9"
          />
          <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="6" fill="none" opacity="0.15" />
        </svg>
        <span className="text-xl font-bold">{score ?? "—"}</span>
      </div>
      <div>
        <div className="text-xs uppercase tracking-widest text-ink-secondary">
          Posture Score
        </div>
        <div className={`text-lg font-semibold ${color}`}>{label}</div>
        <div className="text-xs text-ink-secondary">
          Based on coverage, DLP health, policy sync, and recent errors.
        </div>
      </div>
    </div>
  );
}
