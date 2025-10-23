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
    let new_msg = NewMessage { conversation_id, role, content, tokens_used };
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
