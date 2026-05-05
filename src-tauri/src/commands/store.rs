/*!
Reads from the agent's local SQLite event store at `~/.medusa/agent.db`.

The daemon uses WAL mode, so concurrent reads from this app don't block
the daemon's writes.
*/

use chrono::{DateTime, Duration, Utc};
use rusqlite::{Connection, OpenFlags};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::Path;

use crate::paths;

#[derive(Debug, Serialize, Deserialize)]
pub struct GatewayEvent {
    pub id: String,
    pub timestamp: String,
    pub agent_id: String,
    pub customer_id: String,
    pub direction: String,
    pub message_type: String,
    pub method: Option<String>,
    pub tool_name: Option<String>,
    pub server_name: String,
    pub verdict: String,
    pub rule_name: String,
    pub reason: String,
    pub metadata: Value,
    pub uploaded: i64,
}

#[derive(Debug, Serialize)]
pub struct EventStats {
    pub total: i64,
    pub pending: i64,
    pub blocks_24h: i64,
    pub events_24h: i64,
}

#[derive(Debug, Serialize)]
pub struct ServerEntry {
    pub client: String,
    pub server_name: String,
    pub command: String,
    pub args: Vec<String>,
    pub gateway_installed: bool,
}

fn open_readonly(path: &Path) -> Result<Connection, String> {
    let conn = Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .map_err(|e| e.to_string())?;
    // WAL is set at db-create time by the daemon; we just need to be a polite reader.
    let _ = conn.execute_batch("PRAGMA busy_timeout = 5000;");
    Ok(conn)
}

#[tauri::command]
pub fn recent_events(
    limit: u32,
    verdict_filter: Option<String>,
) -> Result<Vec<GatewayEvent>, String> {
    let path = paths::agent_db();
    if !path.exists() {
        return Ok(vec![]);
    }
    let conn = open_readonly(&path)?;
    let limit = limit.clamp(1, 1000);

    let (sql, params): (&str, Vec<Box<dyn rusqlite::ToSql>>) = match verdict_filter.as_deref() {
        Some(v) if !v.is_empty() => (
            "SELECT id, timestamp, agent_id, customer_id, direction, message_type,
                    method, tool_name, server_name, verdict, rule_name, reason,
                    metadata, uploaded
             FROM events
             WHERE verdict = ?1
             ORDER BY timestamp DESC LIMIT ?2",
            vec![Box::new(v.to_string()), Box::new(limit as i64)],
        ),
        _ => (
            "SELECT id, timestamp, agent_id, customer_id, direction, message_type,
                    method, tool_name, server_name, verdict, rule_name, reason,
                    metadata, uploaded
             FROM events ORDER BY timestamp DESC LIMIT ?1",
            vec![Box::new(limit as i64)],
        ),
    };

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|b| b.as_ref()).collect();
    let rows = stmt
        .query_map(rusqlite::params_from_iter(param_refs), |row| {
            let metadata_str: String = row.get(12).unwrap_or_default();
            let metadata: Value =
                serde_json::from_str(&metadata_str).unwrap_or(Value::Object(Default::default()));
            Ok(GatewayEvent {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                agent_id: row.get(2)?,
                customer_id: row.get(3)?,
                direction: row.get(4)?,
                message_type: row.get(5)?,
                method: row.get(6)?,
                tool_name: row.get(7)?,
                server_name: row.get(8)?,
                verdict: row.get(9)?,
                rule_name: row.get(10)?,
                reason: row.get(11)?,
                metadata,
                uploaded: row.get(13)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut out = Vec::with_capacity(limit as usize);
    for r in rows {
        match r {
            Ok(e) => out.push(e),
            Err(e) => log::warn!("event row error: {e}"),
        }
    }
    Ok(out)
}

#[tauri::command]
pub fn event_stats() -> Result<EventStats, String> {
    let path = paths::agent_db();
    if !path.exists() {
        return Ok(EventStats {
            total: 0,
            pending: 0,
            blocks_24h: 0,
            events_24h: 0,
        });
    }
    let conn = open_readonly(&path)?;
    let total: i64 = conn
        .query_row("SELECT COUNT(*) FROM events", [], |r| r.get(0))
        .unwrap_or(0);
    let pending: i64 = conn
        .query_row("SELECT COUNT(*) FROM events WHERE uploaded = 0", [], |r| {
            r.get(0)
        })
        .unwrap_or(0);

    let cutoff: DateTime<Utc> = Utc::now() - Duration::hours(24);
    let cutoff_iso = cutoff.to_rfc3339();

    let events_24h: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM events WHERE timestamp >= ?1",
            [&cutoff_iso],
            |r| r.get(0),
        )
        .unwrap_or(0);
    let blocks_24h: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM events WHERE timestamp >= ?1 AND verdict IN ('block','coach','redact')",
            [&cutoff_iso],
            |r| r.get(0),
        )
        .unwrap_or(0);

    Ok(EventStats {
        total,
        pending,
        blocks_24h,
        events_24h,
    })
}

/// Spawn `medusa-agent` with the right subcommand to enumerate MCP servers.
/// We shell out instead of duplicating the discovery logic in Rust.
#[tauri::command]
pub fn list_servers() -> Result<Vec<ServerEntry>, String> {
    use std::process::Command;
    let output = Command::new("medusa-agent")
        .args(["status", "--json"])
        .output()
        .map_err(|e| format!("Failed to invoke medusa-agent: {e}"))?;
    if !output.status.success() {
        return Ok(vec![]);
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let parsed: Value = serde_json::from_str(&stdout).unwrap_or(Value::Null);
    let mut entries = Vec::new();
    if let Some(clients) = parsed.get("clients").and_then(|c| c.as_array()) {
        for client in clients {
            let client_name = client
                .get("client")
                .and_then(|c| c.as_str())
                .unwrap_or("?")
                .to_string();
            if let Some(servers) = client.get("servers").and_then(|s| s.as_array()) {
                for server in servers {
                    entries.push(ServerEntry {
                        client: client_name.clone(),
                        server_name: server
                            .get("name")
                            .and_then(|s| s.as_str())
                            .unwrap_or("?")
                            .to_string(),
                        command: server
                            .get("command")
                            .and_then(|s| s.as_str())
                            .unwrap_or("")
                            .to_string(),
                        args: server
                            .get("args")
                            .and_then(|a| a.as_array())
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|v| v.as_str().map(String::from))
                                    .collect()
                            })
                            .unwrap_or_default(),
                        gateway_installed: server
                            .get("gateway_installed")
                            .and_then(|v| v.as_bool())
                            .unwrap_or(false),
                    });
                }
            }
        }
    }
    Ok(entries)
}
