#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{WindowBuilder, WindowUrl};
use tauri_plugin_deep_link::register as register_deep_link;

fn get_browser_homepage() -> String {
    // Default to a useful homepage - users can navigate anywhere from here
    "https://www.google.com".to_string()
}

fn open_window(app: &tauri::AppHandle, url: &str) {
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return;
    }
    let label = format!("fv-{}", chrono::Utc::now().timestamp_millis());
    let _ = WindowBuilder::new(app, label, WindowUrl::External(url.parse().unwrap()))
        .title("PopFS - Floating Browser")
        .inner_size(1024.0, 768.0)
        .resizable(true)
        .always_on_top(true)
        .build();
}

fn open_browser_window(app: &tauri::AppHandle) {
    let homepage = get_browser_homepage();
    open_window(app, &homepage);
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle();
            let _ = register_deep_link("vocabkiller", move |link: String| {
                // Check if this is a request to open browser homepage
                if link.contains("action=browser") || link.contains("open-browser") {
                    open_browser_window(&handle);
                    return;
                }
                
                // Handle specific URLs
                if let Some(qpos) = link.find('?') {
                    let query = &link[qpos + 1..];
                    for part in query.split('&') {
                        let mut kv = part.splitn(2, '=');
                        if let (Some(k), Some(v)) = (kv.next(), kv.next()) {
                            if k == "url" {
                              if let Ok(decoded) = urlencoding::decode(v) {
                                  open_window(&handle, decoded.as_ref());
                              }
                            return;
                        }
                    }
                }
                
                // Default: open browser homepage if no specific URL provided
                open_browser_window(&handle);
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


