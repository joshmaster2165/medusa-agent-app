/*!
Wraps `medusa-agent doctor --json` and reads the agent log file.
*/

use serde::{Deserialize, Serialize};
use std::fs;
use std::process::Command;

use crate::paths;

#[derive(Debug, Serialize, Deserialize)]
pub struct DoctorCheckResult {
    pub name: String,
    pub status: String,
    pub message: String,
    #[serde(default)]
    pub fix: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DoctorReport {
    results: Vec<DoctorCheckResult>,
}

#[tauri::command]
pub fn run_doctor() -> Result<Vec<DoctorCheckResult>, String> {
    let output = Command::new("medusa-agent")
        .args(["doctor", "--json"])
        .output()
        .map_err(|e| format!("Failed to invoke medusa-agent: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    if stdout.trim().is_empty() {
        return Err(format!(
            "medusa-agent doctor returned no output (status: {})",
            output.status
        ));
    }
    let report: DoctorReport = serde_json::from_str(&stdout)
        .map_err(|e| format!("Failed to parse doctor JSON: {e}"))?;
    Ok(report.results)
}

#[tauri::command]
pub fn tail_log(lines: u32) -> Result<Vec<String>, String> {
    let path = paths::agent_log();
    if !path.exists() {
        return Ok(vec![]);
    }
    let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let all: Vec<&str> = contents.lines().collect();
    let take = (lines as usize).min(all.len());
    let start = all.len().saturating_sub(take);
    Ok(all[start..].iter().map(|s| s.to_string()).collect())
}

#[derive(Debug, Serialize)]
pub struct PostureFactor {
    name: String,
    status: String,
    weight: f32,
}

#[derive(Debug, Serialize)]
pub struct PostureResult {
    score: u32,
    factors: Vec<PostureFactor>,
}

/// Compute a 0-100 posture score from local signals. Mirrors the
/// dashboard's calculation but does it on-device for the Status page.
#[tauri::command]
pub fn posture_score() -> Result<PostureResult, String> {
    let mut factors: Vec<PostureFactor> = Vec::new();
    let mut score: f32 = 100.0;

    // Daemon running?
    let daemon_running = match crate::commands::daemon::daemon_status_inner_blocking() {
        Ok(s) => s.running,
        Err(_) => false,
    };
    factors.push(PostureFactor {
        name: "Daemon running".to_string(),
        status: if daemon_running { "ok" } else { "fail" }.to_string(),
        weight: 25.0,
    });
    if !daemon_running {
        score -= 25.0;
    }

    // DLP model present?
    let dlp_present = paths::medusa_dir_path().join("models").exists();
    factors.push(PostureFactor {
        name: "DLP model loaded".to_string(),
        status: if dlp_present { "ok" } else { "warn" }.to_string(),
        weight: 15.0,
    });
    if !dlp_present {
        score -= 15.0;
    }

    // Pending events backlog?
    let stats = crate::commands::store::event_stats().unwrap_or(crate::commands::store::EventStats {
        total: 0,
        pending: 0,
        blocks_24h: 0,
        events_24h: 0,
    });
    let healthy_queue = stats.pending < 1000;
    factors.push(PostureFactor {
        name: "Telemetry queue".to_string(),
        status: if healthy_queue { "ok" } else { "warn" }.to_string(),
        weight: 10.0,
    });
    if !healthy_queue {
        score -= 10.0;
    }

    // Recent error?
    if let Some(_) = read_last_error() {
        factors.push(PostureFactor {
            name: "Recent errors".to_string(),
            status: "warn".to_string(),
            weight: 15.0,
        });
        score -= 15.0;
    } else {
        factors.push(PostureFactor {
            name: "Recent errors".to_string(),
            status: "ok".to_string(),
            weight: 15.0,
        });
    }

    // Config file present + has api key
    let config_ok = paths::agent_config_yaml().exists();
    factors.push(PostureFactor {
        name: "Agent configured".to_string(),
        status: if config_ok { "ok" } else { "fail" }.to_string(),
        weight: 20.0,
    });
    if !config_ok {
        score -= 20.0;
    }

    Ok(PostureResult {
        score: score.max(0.0).round() as u32,
        factors,
    })
}

fn read_last_error() -> Option<String> {
    use rusqlite::Connection;
    let path = paths::agent_db();
    if !path.exists() {
        return None;
    }
    let conn = Connection::open_with_flags(
        &path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .ok()?;
    conn.query_row(
        "SELECT value FROM agent_state WHERE key = 'last_error'",
        [],
        |row| row.get::<_, String>(0),
    )
    .ok()
}
