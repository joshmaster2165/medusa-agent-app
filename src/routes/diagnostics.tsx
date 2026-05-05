import { useState } from "react";
import { runDoctor, type DoctorCheckResult } from "../lib/tauri";
import { CheckCircle2, AlertTriangle, XCircle, Play, Copy, Loader2 } from "lucide-react";

export default function Diagnostics() {
  const [results, setResults] = useState<DoctorCheckResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const r = await runDoctor();
      setResults(r);
    } catch (e) {
      setError(`Diagnostic failed: ${e}`);
    } finally {
      setRunning(false);
    }
  };

  const copy = () => {
    if (!results) return;
    const lines = results.map(
      (r) => `[${r.status.toUpperCase()}] ${r.name}: ${r.message}${r.fix ? ` — fix: ${r.fix}` : ""}`,
    );
    navigator.clipboard.writeText(lines.join("\n")).catch(() => {});
  };

  const failures = results?.filter((r) => r.status === "fail").length ?? 0;
  const warnings = results?.filter((r) => r.status === "warn").length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-border/30 bg-bg-card p-5">
        <div>
          <div className="text-sm font-semibold">Run all 10 diagnostic checks</div>
          <div className="mt-0.5 text-xs text-ink-secondary">
            Verifies config, daemon, store, DLP model, MCP discovery, network,
            API key, policy sync, telemetry, and recent errors.
          </div>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-bold text-bg-deep hover:brightness-110 disabled:opacity-50"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Run Diagnostics
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-accent-warn/30 bg-accent-warn/10 px-4 py-3 text-sm text-accent-warn">
          {error}
        </div>
      )}

      {results && (
        <div className="rounded-lg border border-border/30 bg-bg-card">
          <div className="flex items-center justify-between border-b border-border/30 px-5 py-3">
            <div className="text-xs font-semibold uppercase tracking-widest text-ink-secondary">
              Results
            </div>
            <div className="flex items-center gap-3 text-xs">
              {failures > 0 && <span className="text-accent-warn">{failures} failed</span>}
              {warnings > 0 && <span className="text-amber-300">{warnings} warning</span>}
              {failures === 0 && warnings === 0 && (
                <span className="text-accent">All checks passed</span>
              )}
              <button
                onClick={copy}
                className="flex items-center gap-1.5 rounded-md border border-border/40 px-2 py-1 hover:bg-bg-elevated"
              >
                <Copy className="h-3 w-3" />
                Copy
              </button>
            </div>
          </div>
          <div>
            {results.map((r, i) => (
              <div
                key={i}
                className="flex gap-4 border-b border-border/20 px-5 py-3 last:border-b-0"
              >
                <StatusIcon status={r.status} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{r.name}</div>
                  <div className="mt-0.5 text-xs text-ink-secondary">{r.message}</div>
                  {r.fix && (
                    <div className="mt-1 text-xs text-amber-300">→ {r.fix}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: "pass" | "warn" | "fail" }) {
  if (status === "pass") return <CheckCircle2 className="h-5 w-5 text-accent" />;
  if (status === "warn") return <AlertTriangle className="h-5 w-5 text-amber-300" />;
  return <XCircle className="h-5 w-5 text-accent-warn" />;
}
