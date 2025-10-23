// src-tauri/src/commands/mod.rs
// Export all command modules

pub mod conversations;
pub mod messages;
pub mod settings;

// src-tauri/src/commands/conversations.rs
// Tauri commands for conversation operations

use crate::database::{conversations::*, Database};
use tauri::State;

#[tauri::command]
pub async fn create_conversation(
    db: State<'_, Database>,
    title: String,
    model: String,
    provider: String,
    system_prompt: Option<String>,
) -> Result<Conversation, String> {
    let conn = db.conn().lock().map_err(|e| e.to_string())?;
    
    let new_conv = NewConversation {
        title,
        model,
        provider,
        system_prompt,
    };
    
    Conversation::create(&conn, new_conv).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_conversation(
    db: State<'_, Database>,
    id: String,
) -> Result<Option<Conversation>, String> {
    let conn = db.conn().lock().map_err(|e| e.to_string())?;
    Conversation::get_by_id(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_all_conversations(
    db: State<'_, Database>,
    limit: i64,
) -> Result<Vec<Conversation>, String> {
    let conn = db.conn().lock().map_err(|e| e.to_string())?;
    Conversation::get_all(&conn, limit).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_conversation_title(
    db: State<'_, Database>,
    id: String,
    title: String,
) -> Result<(), String> {
    let conn = db.conn().lock().map_err(|e| e.to_string())?;
    Conversation::update_title(&conn, &id, &title).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_conversation(
    db: State<'_, Database>,
    id: String,
) -> Result<(), String> {
    let conn = db.conn().lock().map_err(|e| e.to_string())?;
    Conversation::delete(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_conversations(
    db: State<'_, Database>,
    query: String,
    limit: i64,
) -> Result<Vec<Conversation>, String> {
    let conn = db.conn().lock().map_err(|e| e.to_string())?;
    Conversation::search(&conn, &query, limit).map_err(|e| e.to_string())
}

// src-tauri/src/commands/messages.rs
// Tauri commands for message operations

use crate::database::{messages::*, Database};
use tauri::State;

#[tauri::command]
pub async fn create_message(
    db: State<'_, Database>,
    conversation_id: String,
    role: String,
    content: String,
    tokens_used: Option<i64>,
) -> Result<Message, String> {
    let conn = db.conn().lock().map_err(|e| e.to_string())?;
    
    let new_msg = NewMessage {
        conversation_id,
        role,
        content,
        tokens_used,
    };
    
    Message::create(&conn, new_msg).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_conversation_messages(
    db: State<'_, Database>,
    conversation_id: String,
) -> Result<Vec<Message>, String> {
    let conn = db.conn().lock().map_err(|e| e.to_string())?;
    Message::get_by_conversation(&conn, &conversation_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_last_messages(
    db: State<'_, Database>,
    conversation_id: String,
    n: i64,
) -> Result<Vec<Message>, String> {
    let conn = db.conn().lock().map_err(|e| e.to_string())?;
    Message::get_last_n(&conn, &conversation_id, n).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_messages(
    db: State<'_, Database>,
    query: String,
    limit: i64,
) -> Result<Vec<Message>, String> {
    let conn = db.conn().lock().map_err(|e| e.to_string())?;
    Message::search(&conn, &query, limit).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_message(
    db: State<'_, Database>,
    id: String,
) -> Result<(), String> {
    let conn = db.conn().lock().map_err(|e| e.to_string())?;
    Message::delete(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_conversation_token_count(
    db: State<'_, Database>,
    conversation_id: String,
) -> Result<i64, String> {
    let conn = db.conn().lock().map_err(|e| e.to_string())?;
    Message::get_conversation_token_count(&conn, &conversation_id).map_err(|e| e.to_string())
}

// src-tauri/src/commands/settings.rs
// Tauri commands for settings operations

use crate::database::{settings::*, Database};
use tauri::State;

#[tauri::command]
pub async fn set_setting(
    db: State<'_, Database>,
    key: String,
    value: String,
) -> Result<(), String> {
    let conn = db.conn().lock().map_err(|e| e.to_string())?;
    Setting::set(&conn, &key, &value).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_setting(
    db: State<'_, Database>,
    key: String,
) -> Result<Option<String>, String> {
    let conn = db.conn().lock().map_err(|e| e.to_string())?;
    Setting::get(&conn, &key).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_all_settings(
    db: State<'_, Database>,
) -> Result<Vec<Setting>, String> {
    let conn = db.conn().lock().map_err(|e| e.to_string())?;
    Setting::get_all(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_setting(
    db: State<'_, Database>,
    key: String,
) -> Result<(), String> {
    let conn = db.conn().lock().map_err(|e| e.to_string())?;
    Setting::delete(&conn, &key).map_err(|e| e.to_string())
}

// src-tauri/src/main.rs
// Updated main.rs with database integration

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod commands;

use database::Database;
use std::path::PathBuf;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // Get app data directory
            let app_data_dir = app.path().app_data_dir()
                .expect("Failed to get app data directory");
            
            // Create directory if it doesn't exist
            std::fs::create_dir_all(&app_data_dir)
                .expect("Failed to create app data directory");
            
            // Database path
            let db_path = app_data_dir.join("database.db");
            
            // Initialize database
            let db = Database::new(db_path)
                .expect("Failed to initialize database");
            
            // Add database to app state
            app.manage(db);
            
            println!("Database initialized successfully!");
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Conversation commands
            commands::conversations::create_conversation,
            commands::conversations::get_conversation,
            commands::conversations::get_all_conversations,
            commands::conversations::update_conversation_title,
            commands::conversations::delete_conversation,
            commands::conversations::search_conversations,
            // Message commands
            commands::messages::create_message,
            commands::messages::get_conversation_messages,
            commands::messages::get_last_messages,
            commands::messages::search_messages,
            commands::messages::delete_message,
            commands::messages::get_conversation_token_count,
            // Settings commands
            commands::settings::set_setting,
            commands::settings::get_setting,
            commands::settings::get_all_settings,
            commands::settings::delete_setting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// src-tauri/Cargo.toml (Updated dependencies)
// Add this to your existing Cargo.toml

/*
[dependencies]
tauri = { version = "2.0", features = ["protocol-asset"] }
tauri-plugin-notification = "2.0"
tauri-plugin-global-shortcut = "2.0"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.12", features = ["json", "stream"] }
rusqlite = { version = "0.31", features = ["bundled"] }
uuid = { version = "1.8", features = ["v4", "serde"] }
*/