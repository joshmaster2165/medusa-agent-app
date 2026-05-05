/*!
Resolves all paths under ~/.medusa/.
*/

use std::path::PathBuf;

fn medusa_dir() -> PathBuf {
    if let Ok(custom) = std::env::var("MEDUSA_DIR") {
        return PathBuf::from(custom);
    }
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join(".medusa")
}

pub fn agent_config_yaml() -> PathBuf {
    medusa_dir().join("agent-config.yaml")
}

pub fn gateway_policy_yaml() -> PathBuf {
    medusa_dir().join("gateway-policy.yaml")
}

pub fn agent_db() -> PathBuf {
    medusa_dir().join("agent.db")
}

pub fn agent_log() -> PathBuf {
    medusa_dir().join("logs").join("agent.log")
}

pub fn medusa_dir_path() -> PathBuf {
    medusa_dir()
}
