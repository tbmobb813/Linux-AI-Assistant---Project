// Consolidated Tauri entrypoint: initializes database, registers plugins and commands
// This is the authoritative run() that `src/main.rs` calls.
pub mod database;
pub mod commands;

use std::path::PathBuf;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    // Plugins
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_global_shortcut::Builder::new().build())
    // Optional: attach a log plugin during debug for easier troubleshooting
    .setup(|app| {
      if cfg!(debug_assertions) {
        let _ = app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        );
      }

      // Prepare app data directory and DB
      let app_data_dir = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data directory");

      std::fs::create_dir_all(&app_data_dir)
        .expect("Failed to create app data directory");

      let db_path: PathBuf = app_data_dir.join("database.db");

      let db = database::Database::new(db_path)
        .expect("Failed to initialize database");

      app.manage(db);

      println!("Database initialized successfully!");

      Ok(())
    })
    // Register Tauri commands implemented in `src-tauri/src/commands`
    .invoke_handler(tauri::generate_handler![
      // conversations
      commands::conversations::create_conversation,
      commands::conversations::get_conversation,
      commands::conversations::get_all_conversations,
      commands::conversations::update_conversation_title,
      commands::conversations::delete_conversation,
      commands::conversations::search_conversations,

      // messages
      commands::messages::create_message,
      commands::messages::get_conversation_messages,
      commands::messages::get_last_messages,
      commands::messages::search_messages,
      commands::messages::delete_message,
      commands::messages::get_conversation_token_count,

      // settings
      commands::settings::set_setting,
      commands::settings::get_setting,
      commands::settings::get_all_settings,
      commands::settings::delete_setting,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
