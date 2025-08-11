#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{WindowBuilder, WindowUrl};
use tauri_plugin_deep_link::register as register_deep_link;

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

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle();
            let _ = register_deep_link("vocabkiller", move |link: String| {
                if let Some(qpos) = link.find('?') {
                    let query = &link[qpos + 1..];
                    for part in query.split('&') {
                        let mut kv = part.splitn(2, '=');
                        if let (Some(k), Some(v)) = (kv.next(), kv.next()) {
                            if k == "url" {
                                if let Ok(decoded) = urlencoding::decode(v) {
                                    open_window(&handle, decoded.as_ref());
                                }
                            }
                        }
                    }
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


