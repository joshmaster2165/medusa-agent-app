/**
 * Settings — every CLI flag and YAML knob, made accessible as toggles.
 * Writes to ~/.medusa/agent-config.yaml. The daemon mtime-polls and
 * picks up changes within 5s.
 */
import { useEffect, useState } from "react";
import { useAgentState } from "../hooks/use-agent-state";
import { saveAgentConfig, type AgentConfig, restartDaemon } from "../lib/tauri";
import { Save, Loader2, RefreshCw } from "lucide-react";
import {
  enable as enableAutostart,
  disable as disableAutostart,
  isEnabled as isAutostartEnabled,
} from "@tauri-apps/plugin-autostart";
import { setNotificationLevel } from "../hooks/use-notifications";

export default function Settings() {
  const config = useAgentState((s) => s.config);
  const refresh = useAgentState((s) => s.refresh);
  const [draft, setDraft] = useState<Partial<AgentConfig>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autostart, setAutostart] = useState<boolean>(false);
  const [notifLevel, setNotifLevel] = useState<"all" | "critical" | "off">(
    () => (localStorage.getItem("medusa.notif_level") as "all" | "critical" | "off") || "critical",
  );

  useEffect(() => {
    setDraft({});
    isAutostartEnabled()
      .then(setAutostart)
      .catch(() => setAutostart(false));
  }, [config?.agent_id]);

  const handleAutostart = async (next: boolean) => {
    setAutostart(next);
    try {
      if (next) await enableAutostart();
      else await disableAutostart();
    } catch (e) {
      console.error("Autostart toggle failed:", e);
    }
  };

  const handleNotifLevel = (level: "all" | "critical" | "off") => {
    setNotifLevel(level);
    setNotificationLevel(level);
  };

  if (!config) {
    return (
      <div className="rounded-lg border border-border/30 bg-bg-card p-12 text-center text-sm text-ink-secondary">
        No agent config loaded. Complete onboarding first.
      </div>
    );
  }

  const get = <K extends keyof AgentConfig>(key: K): AgentConfig[K] =>
    (key in draft ? draft[key] : config[key]) as AgentConfig[K];

  const set = <K extends keyof AgentConfig>(key: K, value: AgentConfig[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveAgentConfig(draft);
      setDraft({});
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const dirty = Object.keys(draft).length > 0;

  return (
    <div className="space-y-6 pb-20">
      {/* Sticky save bar */}
      {dirty && (
        <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-6 flex items-center justify-between border-b border-accent/30 bg-bg-card px-6 py-3 backdrop-blur">
          <div className="text-xs text-accent">Unsaved changes</div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-accent px-4 py-1.5 text-xs font-bold text-bg-deep hover:brightness-110 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </button>
        </div>
      )}
      {saved && (
        <div className="rounded-md border border-accent/30 bg-accent/10 px-4 py-2 text-xs text-accent">
          Saved. Daemon will pick up changes within 5 seconds.
        </div>
      )}

      <Section title="Telemetry & Privacy">
        <Radio
          label="Telemetry mode"
          options={[
            { value: "metadata_only", label: "Metadata only (recommended)" },
            { value: "diagnostic", label: "Diagnostic (uploads full content)" },
          ]}
          value={get("telemetry_mode")}
          onChange={(v) => set("telemetry_mode", v as AgentConfig["telemetry_mode"])}
        />
        <Toggle
          label="Upload telemetry to dashboard"
          value={get("telemetry_enabled")}
          onChange={(v) => set("telemetry_enabled", v)}
        />
        <NumberRow
          label="Telemetry upload interval (seconds)"
          value={get("telemetry_interval_seconds")}
          onChange={(v) => set("telemetry_interval_seconds", v)}
        />
      </Section>

      <Section title="DLP">
        <Toggle
          label="Enable DLP model scanning"
          value={get("dlp_model_enabled")}
          onChange={(v) => set("dlp_model_enabled", v)}
        />
        <Slider
          label="DLP confidence threshold"
          value={get("dlp_confidence_threshold")}
          onChange={(v) => set("dlp_confidence_threshold", v)}
          min={0}
          max={1}
          step={0.05}
        />
      </Section>

      <Section title="Daemon Behavior">
        <Toggle
          label="Sync policy from dashboard"
          value={get("policy_sync_enabled")}
          onChange={(v) => set("policy_sync_enabled", v)}
        />
        <Toggle
          label="Watch MCP client configs for new servers"
          value={get("config_watch_enabled")}
          onChange={(v) => set("config_watch_enabled", v)}
        />
        <Toggle
          label="Run config security monitoring"
          value={get("config_monitor_enabled")}
          onChange={(v) => set("config_monitor_enabled", v)}
        />
        <NumberRow
          label="Policy sync interval (seconds)"
          value={get("policy_sync_interval_seconds")}
          onChange={(v) => set("policy_sync_interval_seconds", v)}
        />
        <NumberRow
          label="Config watch interval (seconds)"
          value={get("config_watch_interval_seconds")}
          onChange={(v) => set("config_watch_interval_seconds", v)}
        />
      </Section>

      <Section title="Auto-Update">
        <Toggle
          label="Enable automatic updates"
          value={get("auto_update_enabled")}
          onChange={(v) => set("auto_update_enabled", v)}
        />
        <Radio
          label="Channel"
          options={[
            { value: "stable", label: "Stable" },
            { value: "beta", label: "Beta" },
          ]}
          value={get("update_channel")}
          onChange={(v) => set("update_channel", v)}
        />
      </Section>

      <Section title="Desktop App">
        <Toggle
          label="Open Medusa app at login"
          value={autostart}
          onChange={handleAutostart}
        />
        <Radio
          label="Show notifications"
          options={[
            { value: "all", label: "All blocks + coaching" },
            { value: "critical", label: "Critical only (recommended)" },
            { value: "off", label: "Off" },
          ]}
          value={notifLevel}
          onChange={handleNotifLevel}
        />
      </Section>

      <Section title="Identity">
        <KV label="Agent ID" value={config.agent_id} mono />
        <KV label="Customer ID" value={config.customer_id || "—"} mono />
        <KV label="Hostname" value={config.hostname} mono />
        <KV label="Installed at" value={config.installed_at} mono />
        <KV label="Supabase URL" value={config.supabase_url} mono />
      </Section>

      <Section title="Advanced">
        <button
          onClick={() => restartDaemon()}
          className="flex items-center gap-2 rounded-md border border-border/40 bg-bg-elevated px-3 py-2 text-xs hover:bg-bg-elevated/80"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Restart Daemon
        </button>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/30 bg-bg-card">
      <div className="border-b border-border/30 px-5 py-3 text-xs font-semibold uppercase tracking-widest text-ink-secondary">
        {title}
      </div>
      <div className="space-y-1 p-3">{children}</div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-bg-elevated/40"
    >
      <span className="text-ink-primary">{label}</span>
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${
          value ? "bg-accent" : "bg-bg-elevated"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-bg-deep transition-all ${
            value ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function Radio<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="px-2 py-2">
      <div className="mb-2 text-sm text-ink-primary">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={[
              "rounded-md px-3 py-1.5 text-xs",
              value === o.value
                ? "bg-accent/15 text-accent"
                : "border border-border/40 bg-bg-elevated text-ink-secondary hover:text-ink-primary",
            ].join(" ")}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function NumberRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-2 py-2">
      <span className="text-sm text-ink-primary">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 rounded-md border border-border/40 bg-bg-elevated px-2 py-1 text-right font-mono text-xs"
      />
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="px-2 py-2">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-ink-primary">{label}</span>
        <span className="font-mono text-xs text-ink-secondary">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </div>
  );
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 px-2 py-1.5 text-sm">
      <span className="text-ink-secondary">{label}</span>
      <span className={`max-w-[60%] truncate text-right ${mono ? "font-mono text-xs" : ""} text-ink-primary`}>
        {value}
      </span>
    </div>
  );
}
