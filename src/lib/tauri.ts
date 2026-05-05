/**
 * Typed wrappers around Tauri `invoke()` calls.
 *
 * Each function corresponds to a Rust command registered in
 * `src-tauri/src/commands/`. Keeping these in one file means the JS
 * surface is small and discoverable.
 */
import { invoke } from "@tauri-apps/api/core";

// ── Types ────────────────────────────────────────────────────────────

export interface AgentConfig {
  customer_id: string;
  api_key: string;
  agent_id: string;
  supabase_url: string;
  dashboard_url: string;

  telemetry_interval_seconds: number;
  telemetry_batch_size: number;
  policy_sync_interval_seconds: number;
  config_watch_interval_seconds: number;
  health_check_interval_seconds: number;
  config_monitor_interval_seconds: number;
  config_monitor_enabled: boolean;
  telemetry_enabled: boolean;
  policy_sync_enabled: boolean;
  config_watch_enabled: boolean;
  auto_update_enabled: boolean;
  auto_update_interval_seconds: number;
  update_channel: string;
  dlp_model_enabled: boolean;
  dlp_confidence_threshold: number;
  telemetry_mode: "metadata_only" | "diagnostic";
  hostname: string;
  os_platform: string;
  installed_at: string;
}

export interface GatewayEvent {
  id: string;
  timestamp: string;
  agent_id: string;
  customer_id: string;
  direction: string;
  message_type: string;
  method: string | null;
  tool_name: string | null;
  server_name: string;
  verdict: string;
  rule_name: string;
  reason: string;
  metadata: Record<string, unknown>;
  uploaded: number;
}

export interface ServerEntry {
  client: string;
  server_name: string;
  command: string;
  args: string[];
  gateway_installed: boolean;
}

export interface DoctorCheckResult {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
  fix?: string;
}

export interface DaemonStatus {
  running: boolean;
  pid: number | null;
  paused_until: string | null;
  proxy_count: number;
  agent_version: string;
}

// ── Commands ─────────────────────────────────────────────────────────

export async function loadAgentConfig(): Promise<AgentConfig | null> {
  return invoke<AgentConfig | null>("load_agent_config");
}

export async function saveAgentConfig(config: Partial<AgentConfig>): Promise<void> {
  return invoke("save_agent_config", { patch: config });
}

export async function loadGatewayPolicy(): Promise<Record<string, unknown> | null> {
  return invoke<Record<string, unknown> | null>("load_gateway_policy");
}

export async function recentEvents(limit = 50, verdictFilter?: string): Promise<GatewayEvent[]> {
  return invoke<GatewayEvent[]>("recent_events", { limit, verdictFilter });
}

export async function eventStats(): Promise<{
  total: number;
  pending: number;
  blocks_24h: number;
  events_24h: number;
}> {
  return invoke("event_stats");
}

export async function listServers(): Promise<ServerEntry[]> {
  return invoke<ServerEntry[]>("list_servers");
}

export async function runDoctor(): Promise<DoctorCheckResult[]> {
  return invoke<DoctorCheckResult[]>("run_doctor");
}

export async function tailLog(lines = 200): Promise<string[]> {
  return invoke<string[]>("tail_log", { lines });
}

export async function daemonStatus(): Promise<DaemonStatus> {
  return invoke<DaemonStatus>("daemon_status");
}

export async function pauseProtection(durationSeconds: number): Promise<void> {
  return invoke("pause_protection", { durationSeconds });
}

export async function resumeProtection(): Promise<void> {
  return invoke("resume_protection");
}

export async function forceSyncNow(): Promise<void> {
  return invoke("force_sync_now");
}

export async function forceUploadNow(): Promise<void> {
  return invoke("force_upload_now");
}

export async function restartDaemon(): Promise<void> {
  return invoke("restart_daemon");
}

export async function revealMedusaDir(): Promise<void> {
  return invoke("reveal_medusa_dir");
}

export async function openDashboard(): Promise<void> {
  return invoke("open_dashboard");
}

export async function checkUpdates(): Promise<{
  current: string;
  latest: string;
  has_update: boolean;
  release_notes: string;
}> {
  return invoke("check_updates");
}

export async function postureScore(): Promise<{
  score: number;
  factors: Array<{ name: string; status: string; weight: number }>;
}> {
  return invoke("posture_score");
}
