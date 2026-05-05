/*!
Medusa Agent App — Tauri entry point.

Wires up the tray icon, registers the React-callable commands defined in
`commands/`, and configures the window to start hidden (the user opens
it from the tray).
*/

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    Manager, WindowEvent,
};

mod commands;
mod paths;
mod tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ));

    builder = builder.invoke_handler(tauri::generate_handler![
        commands::config::load_agent_config,
        commands::config::save_agent_config,
        commands::config::load_gateway_policy,
        commands::store::recent_events,
        commands::store::event_stats,
        commands::store::list_servers,
        commands::doctor::run_doctor,
        commands::doctor::tail_log,
        commands::doctor::posture_score,
        commands::daemon::daemon_status,
        commands::daemon::pause_protection,
        commands::daemon::resume_protection,
        commands::daemon::force_sync_now,
        commands::daemon::force_upload_now,
        commands::daemon::restart_daemon,
        commands::daemon::reveal_medusa_dir,
        commands::daemon::open_dashboard,
        commands::daemon::check_updates,
    ]);

    builder
        .setup(|app| {
            // Build tray icon + menu
            let show_item = MenuItemBuilder::with_id("show", "Open Medusa…").build(app)?;
            let pause_item =
                MenuItemBuilder::with_id("pause", "Pause Protection — 1 hour").build(app)?;
            let resume_item =
                MenuItemBuilder::with_id("resume", "Resume Protection").build(app)?;
            let sync_item =
                MenuItemBuilder::with_id("sync", "Force Policy Refresh").build(app)?;
            let upload_item =
                MenuItemBuilder::with_id("upload", "Force Telemetry Upload").build(app)?;
            let dashboard_item =
                MenuItemBuilder::with_id("dashboard", "Open Dashboard…").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quit Medusa App").build(app)?;

            let menu = MenuBuilder::new(app)
                .items(&[&show_item])
                .separator()
                .items(&[&pause_item, &resume_item, &sync_item, &upload_item])
                .separator()
                .items(&[&dashboard_item])
                .separator()
                .items(&[&quit_item])
                .build()?;

            let _tray = TrayIconBuilder::with_id("medusa-tray")
                .menu(&menu)
                .show_menu_on_left_click(true)
                .tooltip("Medusa — Protection On")
                .on_menu_event(tray::on_menu_event)
                .build(app)?;

            // Show window on first launch (user expects to see it)
            if let Some(window) = app.get_webview_window("main") {
                window.show().ok();
                window.set_focus().ok();
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Don't quit — hide to tray. User must explicitly Quit
                // via the tray menu. This is the same UX as Slack /
                // Discord / 1Password.
                window.hide().ok();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
