#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, WindowBuilder, WindowUrl};

fn open_window(app: &tauri::AppHandle, url: &str) {
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return;
    }
    let label = format!("fv-{}", chrono::Utc::now().timestamp_millis());
    let _ = WindowBuilder::new(app, label, WindowUrl::External(url.parse().unwrap()))
        .title("PopFS")
        .inner_size(480.0, 720.0)
        .resizable(true)
        .always_on_top(true)
        .build();
}

fn handle_deeplink(app: &tauri::AppHandle, link: &str) {
    if let Some(qpos) = link.find('?') {
        let query = &link[qpos + 1..];
        for part in query.split('&') {
            let mut kv = part.splitn(2, '=');
            if let (Some(k), Some(v)) = (kv.next(), kv.next()) {
                if k == "url" {
                    if let Ok(decoded) = urlencoding::decode(v) {
                        open_window(app, decoded.as_ref());
                    }
                }
            }
        }
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init("vocabkiller", |app, url| {
            handle_deeplink(&app.app_handle(), &url);
        }))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
