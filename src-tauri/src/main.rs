#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{AppHandle, Manager, WindowUrl, WindowBuilder};

fn open_always_on_top(app: &AppHandle, url: &str, label: &str) {
    // Basic allow: http/https only
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return;
    }

    let _ = WindowBuilder::new(app, label.to_string(), WindowUrl::External(url.parse().unwrap()))
        .title("PopFS")
        .inner_size(480.0, 720.0)
        .resizable(true)
        .always_on_top(true)
        .build();
}

fn handle_deeplink(app: &AppHandle, deeplink: &str) {
    // expected: vocabkiller://open?url=<encoded>
    if let Some(query_start) = deeplink.find("?") {
        let query = &deeplink[query_start + 1..];
        for part in query.split('&') {
            let mut kv = part.splitn(2, '=');
            if let (Some(k), Some(v)) = (kv.next(), kv.next()) {
                if k == "url" {
                    let decoded = urlencoding::decode(v).unwrap_or_default().to_string();
                    let label = format!("fv-{}", chrono::Utc::now().timestamp_millis());
                    open_always_on_top(app, &decoded, &label);
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


