/**
 * 5-step first-run onboarding wizard.
 *
 * Step 1: Welcome
 * Step 2: API key entry
 * Step 3: Discovery (auto-detect MCP clients)
 * Step 4: Permissions explanation
 * Step 5: Done
 */
import { useState } from "react";
import { ArrowRight, ArrowLeft, ExternalLink, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { saveAgentConfig, listServers, openDashboard } from "../lib/tauri";
import { useAgentState } from "../hooks/use-agent-state";

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [discovered, setDiscovered] = useState<{
    clients: number;
    servers: number;
  } | null>(null);
  const refresh = useAgentState((s) => s.refresh);

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(1, s - 1));

  const submitKey = async () => {
    if (!apiKey.startsWith("sk-med_")) {
      setError("API key should start with 'sk-med_'. Get one from medusasec.com/deploy.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await saveAgentConfig({ api_key: apiKey });
      await refresh();
      // Trigger discovery
      const servers = await listServers();
      const uniqueClients = new Set(servers.map((s) => s.client));
      setDiscovered({ clients: uniqueClients.size, servers: servers.length });
      next();
    } catch (e) {
      setError(`Failed to save API key: ${e}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-bg-primary p-8">
      <div className="w-full max-w-2xl rounded-xl border border-border/30 bg-bg-card p-10 shadow-2xl">
        {/* Progress dots */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className={`h-2 rounded-full transition-all ${
                n === step
                  ? "w-8 bg-accent"
                  : n < step
                    ? "w-2 bg-accent/60"
                    : "w-2 bg-border"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10 text-3xl font-bold text-accent">
              M
            </div>
            <h1 className="mb-3 text-3xl font-bold tracking-tight text-ink-primary">
              Welcome to Medusa Sentinel
            </h1>
            <p className="mb-8 text-ink-secondary">
              Endpoint security for MCP infrastructure. Continuous DLP scanning,
              policy enforcement, and audit — all on-device.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={next}
                className="flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-bold text-bg-deep hover:brightness-110"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => openDashboard()}
                className="flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm text-ink-primary hover:bg-bg-elevated"
              >
                Sign up first
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="mb-2 text-2xl font-bold tracking-tight">Connect your account</h2>
            <p className="mb-6 text-sm text-ink-secondary">
              Paste an API key from{" "}
              <button
                onClick={() => openDashboard()}
                className="text-accent underline hover:brightness-110"
              >
                medusasec.com/deploy
              </button>
              .
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-med_..."
              className="w-full rounded-md border border-border bg-bg-elevated px-4 py-3 font-mono text-sm text-ink-primary focus:border-accent focus:outline-none"
              autoFocus
            />
            {error && <p className="mt-3 text-xs text-accent-warn">{error}</p>}
            <div className="mt-6 flex justify-between">
              <button
                onClick={back}
                className="flex items-center gap-2 text-sm text-ink-secondary hover:text-ink-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={submitKey}
                disabled={submitting || !apiKey}
                className="flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-bold text-bg-deep hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Connect
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="mb-2 text-2xl font-bold tracking-tight">Discovery</h2>
            <p className="mb-6 text-sm text-ink-secondary">
              We scanned your machine for MCP clients.
            </p>
            <div className="mb-6 space-y-2">
              <Row done label={`Found ${discovered?.clients ?? 0} MCP client(s)`} />
              <Row done label={`Discovered ${discovered?.servers ?? 0} stdio server(s)`} />
              <Row done label="Daemon installed and running" />
              <Row done label="Connected to dashboard" />
            </div>
            <div className="flex justify-end">
              <button
                onClick={next}
                className="flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-bold text-bg-deep hover:brightness-110"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="mb-2 text-2xl font-bold tracking-tight">What we'll do</h2>
            <p className="mb-6 text-sm text-ink-secondary">
              Medusa proxies your MCP servers to enforce DLP policy. We rewrite
              client configs to route stdio servers through the gateway.
              Original configs are saved as <code className="rounded bg-bg-elevated px-1 font-mono">*.medusa-backup</code> for clean uninstall.
            </p>
            <ul className="mb-8 space-y-2 text-sm text-ink-primary">
              <li>✓ Policy + telemetry are signed and scoped per-customer</li>
              <li>✓ Quitting this app does NOT stop protection</li>
              <li>✓ Uninstall any time with <code className="rounded bg-bg-elevated px-1 font-mono">medusa-agent uninstall</code></li>
            </ul>
            <div className="flex justify-between">
              <button onClick={back} className="text-sm text-ink-secondary hover:text-ink-primary">
                ← Back
              </button>
              <button
                onClick={next}
                className="rounded-md bg-accent px-5 py-2.5 text-sm font-bold text-bg-deep hover:brightness-110"
              >
                I understand
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20">
              <CheckCircle2 className="h-8 w-8 text-accent" />
            </div>
            <h2 className="mb-3 text-2xl font-bold tracking-tight">You're protected</h2>
            <p className="mb-8 text-sm text-ink-secondary">
              The Medusa icon now lives in your menu bar. Click it any time to
              pause, view recent activity, or open this window.
            </p>
            <button
              onClick={onComplete}
              className="rounded-md bg-accent px-6 py-2.5 text-sm font-bold text-bg-deep hover:brightness-110"
            >
              Open Medusa
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-bg-elevated px-4 py-2.5 text-sm">
      {done ? (
        <CheckCircle2 className="h-4 w-4 text-accent" />
      ) : (
        <Circle className="h-4 w-4 text-ink-secondary" />
      )}
      {label}
    </div>
  );
}
