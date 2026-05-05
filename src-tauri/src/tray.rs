/*!
Tray menu event handler.
*/

use tauri::{AppHandle, Manager};

pub fn on_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    match event.id().as_ref() {
        "show" => {
            if let Some(window) = app.get_webview_window("main") {
                window.show().ok();
                window.set_focus().ok();
            }
        }
        "pause" => {
            // Default tray-pause = 1 hour. The full window has the picker.
            tauri::async_runtime::spawn({
                let app = app.clone();
                async move {
                    if let Err(e) =
                        crate::commands::daemon::pause_protection_inner(3600).await
                    {
                        log::warn!("tray pause failed: {e}");
                    }
                    refresh_tray_tooltip(&app).await;
                }
            });
        }
        "resume" => {
            tauri::async_runtime::spawn({
                let app = app.clone();
                async move {
                    if let Err(e) = crate::commands::daemon::resume_protection_inner().await {
                        log::warn!("tray resume failed: {e}");
                    }
                    refresh_tray_tooltip(&app).await;
                }
            });
        }
        "sync" => {
            tauri::async_runtime::spawn(async move {
                if let Err(e) = crate::commands::daemon::force_sync_now_inner().await {
                    log::warn!("tray sync failed: {e}");
                }
            });
        }
        "upload" => {
            tauri::async_runtime::spawn(async move {
                if let Err(e) = crate::commands::daemon::force_upload_now_inner().await {
                    log::warn!("tray upload failed: {e}");
                }
            });
        }
        "dashboard" => {
            let _ = open::that("https://medusasec.com");
        }
        "quit" => {
            // Tray dropdown gets the explicit "(Daemon keeps running ✓)"
            // text in the React UI; here we just exit the app.
            app.exit(0);
        }
        _ => {}
    }
}

async fn refresh_tray_tooltip(app: &AppHandle) {
    if let Ok(status) = crate::commands::daemon::daemon_status_inner().await {
        let tooltip = if status.paused_until.is_some() {
            "Medusa — Protection Paused".to_string()
        } else if status.running {
            format!(
                "Medusa — Protection On • {} server(s) proxied",
                status.proxy_count
            )
        } else {
            "Medusa — Daemon Stopped".to_string()
        };
        if let Some(tray) = app.tray_by_id("medusa-tray") {
            let _ = tray.set_tooltip(Some(tooltip));
        }
    }
}
