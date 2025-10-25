use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn toggle_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        match window.is_visible() {
            Ok(true) => window.hide().map_err(|e| e.to_string()),
            _ => {
                window.show().map_err(|e| e.to_string())?;
                window.set_focus().map_err(|e| e.to_string())
            }
        }
    } else {
        Err("Main window not found".to_string())
    }
}
