// Add to imports
mod commands;
use commands::chat::{get_settings, get_watched_files, save_provider_settings};
use commands::provider::{get_api_key, set_api_key};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_settings,
            get_api_key,
            set_api_key,
            save_provider_settings,
            get_watched_files,
            // ... your other commands
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
