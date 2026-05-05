import { useEffect, useState } from "react";
import { loadGatewayPolicy, openDashboard } from "../lib/tauri";
import { ExternalLink } from "lucide-react";

export default function Policy() {
  const [policy, setPolicy] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    loadGatewayPolicy()
      .then(setPolicy)
      .catch(() => setPolicy(null));
  }, []);

  const policies = (policy?.policies as Record<string, unknown>) ?? {};
  const dataProtection = (policies.data_protection as Record<string, unknown>) ?? {};

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border/30 bg-bg-card p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-secondary">
            Synced Policy
          </h2>
          <button
            onClick={() => openDashboard()}
            className="flex items-center gap-1.5 text-xs text-accent hover:brightness-110"
          >
            Edit in Dashboard
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
        <p className="text-xs text-ink-secondary">
          Policies are managed centrally from the Medusa dashboard for fleet
          consistency. This page shows what's currently active on this endpoint.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Data Protection">
          <Toggle label="Block secrets" value={!!dataProtection.block_secrets} />
          <Toggle label="Block PII" value={!!dataProtection.block_pii} />
          <Toggle label="Block prompt injections" value={!!dataProtection.block_injections} />
          <Toggle label="Scan responses" value={!!dataProtection.scan_responses} />
          <Toggle label="Scan code blocks" value={!!dataProtection.scan_code} />
          <Toggle label="Scan base64-encoded content" value={!!dataProtection.scan_base64} />
          <Toggle label="Redact requests (instead of blocking)" value={!!dataProtection.redact_requests} />
          <KV label="Injection action" value={(dataProtection.injection_action as string) || "—"} />
          <KV
            label="Confidence threshold"
            value={String(dataProtection.dlp_confidence_threshold ?? 0.5)}
          />
        </Card>

        <Card title="Tools & Servers">
          <KV label="Blocked tools" value={renderList(policies.blocked_tools)} />
          <KV label="Blocked tool patterns" value={renderList(policies.blocked_tool_patterns)} />
          <KV label="Blocked servers" value={renderList(policies.blocked_servers)} />
          <KV label="Allowed servers" value={renderList(policies.allowed_servers)} />
          <KV label="Approved servers" value={renderList(policies.approved_servers)} />
          <KV label="Max calls/min" value={String(policies.max_calls_per_minute ?? "—")} />
        </Card>

        <Card title="Coaching">
          <Toggle
            label="Coaching enabled"
            value={!!(policies.coaching as Record<string, unknown>)?.enabled}
          />
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/30 bg-bg-card">
      <div className="border-b border-border/30 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-ink-secondary">
        {title}
      </div>
      <div className="space-y-1 p-3">{children}</div>
    </div>
  );
}

function Toggle({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-bg-elevated/40">
      <span className="text-ink-primary">{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
          value ? "bg-accent/15 text-accent" : "bg-bg-elevated text-ink-secondary"
        }`}
      >
        {value ? "On" : "Off"}
      </span>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md px-2 py-1.5 text-sm">
      <span className="text-ink-secondary">{label}</span>
      <span className="max-w-[60%] truncate text-right font-mono text-xs text-ink-primary">{value}</span>
    </div>
  );
}

function renderList(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return "—";
  if (value.length <= 3) return value.join(", ");
  return `${value.slice(0, 3).join(", ")} +${value.length - 3} more`;
}
