/*!
Calls the daemon's local control endpoint at `http://127.0.0.1:27183`.
The endpoint is loopback-only, no auth needed.
*/

use serde::{Deserialize, Serialize};

const CONTROL_BASE: &str = "http://127.0.0.1:27183";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DaemonStatus {
    pub running: bool,
    pub pid: Option<u32>,
    pub paused_until: Option<String>,
    pub proxy_count: u32,
    pub agent_version: String,
}

#[tauri::command]
pub async fn daemon_status() -> Result<DaemonStatus, String> {
    daemon_status_inner().await
}

pub async fn daemon_status_inner() -> Result<DaemonStatus, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(800))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .get(format!("{CONTROL_BASE}/status"))
        .send()
        .await
        .map_err(|_| "Daemon control endpoint unreachable".to_string())?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }
    resp.json::<DaemonStatus>().await.map_err(|e| e.to_string())
}

/// Synchronous variant for the posture-score command (which can't be async
/// because of how Tauri schedules our handlers).
pub fn daemon_status_inner_blocking() -> Result<DaemonStatus, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_millis(800))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .get(format!("{CONTROL_BASE}/status"))
        .send()
        .map_err(|_| "Daemon control endpoint unreachable".to_string())?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }
    resp.json::<DaemonStatus>().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pause_protection(duration_seconds: u64) -> Result<(), String> {
    pause_protection_inner(duration_seconds).await
}

pub async fn pause_protection_inner(duration_seconds: u64) -> Result<(), String> {
    let body = serde_json::json!({ "duration_seconds": duration_seconds });
    post_json("/pause", body).await.map(|_| ())
}

#[tauri::command]
pub async fn resume_protection() -> Result<(), String> {
    resume_protection_inner().await
}

pub async fn resume_protection_inner() -> Result<(), String> {
    post_json("/resume", serde_json::json!({})).await.map(|_| ())
}

#[tauri::command]
pub async fn force_sync_now() -> Result<(), String> {
    force_sync_now_inner().await
}

pub async fn force_sync_now_inner() -> Result<(), String> {
    post_json("/sync_now", serde_json::json!({})).await.map(|_| ())
}

#[tauri::command]
pub async fn force_upload_now() -> Result<(), String> {
    force_upload_now_inner().await
}

pub async fn force_upload_now_inner() -> Result<(), String> {
    post_json("/upload_now", serde_json::json!({})).await.map(|_| ())
}

#[tauri::command]
pub async fn restart_daemon() -> Result<(), String> {
    post_json("/restart", serde_json::json!({})).await.map(|_| ())
}

#[tauri::command]
pub fn reveal_medusa_dir() -> Result<(), String> {
    let path = crate::paths::medusa_dir_path();
    if !path.exists() {
        std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    open::that(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_dashboard() -> Result<(), String> {
    open::that("https://medusasec.com").map_err(|e| e.to_string())
}

#[derive(Debug, Serialize)]
pub struct UpdateInfo {
    pub current: String,
    pub latest: String,
    pub has_update: bool,
    pub release_notes: String,
}

/// Stub — wires up to the Tauri updater plugin in Phase 6.
#[tauri::command]
pub async fn check_updates() -> Result<UpdateInfo, String> {
    let current = env!("CARGO_PKG_VERSION").to_string();
    Ok(UpdateInfo {
        current: current.clone(),
        latest: current,
        has_update: false,
        release_notes: "".to_string(),
    })
}

async fn post_json(path: &str, body: serde_json::Value) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .post(format!("{CONTROL_BASE}{path}"))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Daemon unreachable: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }
    resp.json::<serde_json::Value>()
        .await
        .map_err(|e| e.to_string())
}
