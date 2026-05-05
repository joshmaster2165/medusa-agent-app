/*!
Read/write `~/.medusa/agent-config.yaml` and `~/.medusa/gateway-policy.yaml`.

The daemon mtime-polls these files every ~5 seconds, so a write here
is picked up by the daemon within that window — no extra IPC needed.
*/

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;

use crate::paths;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct AgentConfig {
    pub customer_id: String,
    pub api_key: String,
    pub agent_id: String,
    pub supabase_url: String,
    pub dashboard_url: String,

    #[serde(default = "default_60")]
    pub telemetry_interval_seconds: u64,
    #[serde(default = "default_100")]
    pub telemetry_batch_size: u64,
    #[serde(default = "default_300")]
    pub policy_sync_interval_seconds: u64,
    #[serde(default = "default_5")]
    pub config_watch_interval_seconds: u64,
    #[serde(default = "default_60")]
    pub health_check_interval_seconds: u64,
    #[serde(default = "default_300")]
    pub config_monitor_interval_seconds: u64,
    #[serde(default = "true_default")]
    pub config_monitor_enabled: bool,
    #[serde(default = "true_default")]
    pub telemetry_enabled: bool,
    #[serde(default = "true_default")]
    pub policy_sync_enabled: bool,
    #[serde(default = "true_default")]
    pub config_watch_enabled: bool,
    #[serde(default = "true_default")]
    pub auto_update_enabled: bool,
    #[serde(default = "default_3600")]
    pub auto_update_interval_seconds: u64,
    #[serde(default = "stable_default")]
    pub update_channel: String,
    #[serde(default = "true_default")]
    pub dlp_model_enabled: bool,
    #[serde(default = "default_05")]
    pub dlp_confidence_threshold: f32,
    #[serde(default = "metadata_only_default")]
    pub telemetry_mode: String,
    #[serde(default)]
    pub hostname: String,
    #[serde(default)]
    pub os_platform: String,
    #[serde(default)]
    pub installed_at: String,
}

fn default_60() -> u64 {
    60
}
fn default_100() -> u64 {
    100
}
fn default_300() -> u64 {
    300
}
fn default_5() -> u64 {
    5
}
fn default_3600() -> u64 {
    3600
}
fn default_05() -> f32 {
    0.5
}
fn true_default() -> bool {
    true
}
fn stable_default() -> String {
    "stable".to_string()
}
fn metadata_only_default() -> String {
    "metadata_only".to_string()
}

#[tauri::command]
pub fn load_agent_config() -> Result<Option<AgentConfig>, String> {
    let path = paths::agent_config_yaml();
    if !path.exists() {
        return Ok(None);
    }
    let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let config: AgentConfig = serde_yaml::from_str(&contents).map_err(|e| e.to_string())?;
    Ok(Some(config))
}

#[tauri::command]
pub fn save_agent_config(patch: Value) -> Result<(), String> {
    let path = paths::agent_config_yaml();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // Read existing config (or default)
    let existing: Value = if path.exists() {
        let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_yaml::from_str(&contents).unwrap_or(Value::Null)
    } else {
        Value::Null
    };

    // Merge patch in
    let merged = merge_value(existing, patch);

    // Validate by round-trip through AgentConfig (catches bad shapes)
    let _validated: AgentConfig =
        serde_yaml::from_value(serde_yaml::to_value(&merged).map_err(|e| e.to_string())?)
            .map_err(|e| format!("Invalid config: {e}"))?;

    let yaml = serde_yaml::to_string(&merged).map_err(|e| e.to_string())?;
    write_atomic(&path, &yaml).map_err(|e| e.to_string())?;

    // Restrict to user-only on Unix.
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(&path, fs::Permissions::from_mode(0o600));
    }

    Ok(())
}

#[tauri::command]
pub fn load_gateway_policy() -> Result<Option<Value>, String> {
    let path = paths::gateway_policy_yaml();
    if !path.exists() {
        return Ok(None);
    }
    let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let policy: Value = serde_yaml::from_str(&contents).map_err(|e| e.to_string())?;
    Ok(Some(policy))
}

fn merge_value(base: Value, patch: Value) -> Value {
    match (base, patch) {
        (Value::Object(mut b), Value::Object(p)) => {
            for (k, v) in p {
                b.insert(k.clone(), merge_value(b.get(&k).cloned().unwrap_or(Value::Null), v));
            }
            Value::Object(b)
        }
        (_, patch) => patch,
    }
}

fn write_atomic(path: &std::path::Path, contents: &str) -> Result<()> {
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, contents).context("write tmp")?;
    fs::rename(&tmp, path).context("rename tmp")?;
    Ok(())
}
