use crate::database::{
    conversations::{Conversation, NewConversationWithId},
    messages::{Message, NewMessageWithId},
    Database,
};
use serde::{Deserialize, Serialize};
use tauri::{Manager, State};

#[derive(Serialize, Deserialize)]
pub struct ExportedConversation {
    pub id: String,
    pub title: String,
    pub provider: String,
    pub model: String,
    pub system_prompt: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub messages: Vec<ExportedMessage>,
}

#[derive(Serialize, Deserialize)]
pub struct ExportedMessage {
    pub id: String,
    pub role: String,
    pub content: String,
    pub timestamp: i64,
    pub tokens_used: Option<i64>,
}

#[derive(Serialize, Deserialize)]
pub struct ExportData {
    pub version: String,
    pub export_timestamp: i64,
    pub conversations: Vec<ExportedConversation>,
}

#[tauri::command]
pub fn export_conversations_json(
    db: State<'_, Database>,
    conversation_ids: Option<Vec<String>>,
) -> Result<String, String> {
    let conn = db.conn().lock().map_err(|e| e.to_string())?;

    // Get conversations to export (all if none specified)
    let conversations = if let Some(ids) = conversation_ids {
        let mut result = Vec::new();
        for id in ids {
            match Conversation::get_by_id(&conn, &id) {
                Ok(Some(conv)) => result.push(conv),
                Ok(None) => continue,
                Err(e) => return Err(format!("Failed to get conversation {}: {}", id, e)),
            }
        }
        result
    } else {
        Conversation::get_all(&conn, 1000) // Get up to 1000 conversations
            .map_err(|e| format!("Failed to get conversations: {}", e))?
    };

    let mut exported_conversations = Vec::new();

    for conv in conversations {
        let messages = Message::get_by_conversation(&conn, &conv.id)
            .map_err(|e| format!("Failed to get messages for conversation {}: {}", conv.id, e))?;

        let exported_messages: Vec<ExportedMessage> = messages
            .into_iter()
            .map(|msg| ExportedMessage {
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp,
                tokens_used: msg.tokens_used,
            })
            .collect();

        exported_conversations.push(ExportedConversation {
            id: conv.id,
            title: conv.title,
            provider: conv.provider,
            model: conv.model,
            system_prompt: conv.system_prompt,
            created_at: conv.created_at,
            updated_at: conv.updated_at,
            messages: exported_messages,
        });
    }

    let export_data = ExportData {
        version: "1.0.0".to_string(),
        export_timestamp: chrono::Utc::now().timestamp(),
        conversations: exported_conversations,
    };

    serde_json::to_string_pretty(&export_data)
        .map_err(|e| format!("Failed to serialize export data: {}", e))
}

#[tauri::command]
pub fn export_conversation_markdown(
    db: State<'_, Database>,
    conversation_id: String,
) -> Result<String, String> {
    let conn = db.conn().lock().map_err(|e| e.to_string())?;

    let conversation = Conversation::get_by_id(&conn, &conversation_id)
        .map_err(|e| format!("Failed to get conversation: {}", e))?
        .ok_or_else(|| "Conversation not found".to_string())?;

    let messages = Message::get_by_conversation(&conn, &conversation_id)
        .map_err(|e| format!("Failed to get messages: {}", e))?;

    let mut markdown = String::new();

    // Header
    markdown.push_str(&format!("# {}\n\n", conversation.title));
    markdown.push_str(&format!("**Provider:** {}\n", conversation.provider));
    markdown.push_str(&format!("**Model:** {}\n", conversation.model));
    markdown.push_str(&format!(
        "**Created:** {}\n",
        chrono::DateTime::from_timestamp(conversation.created_at, 0)
            .map(|dt| dt.format("%Y-%m-%d %H:%M:%S UTC").to_string())
            .unwrap_or_else(|| "Unknown".to_string())
    ));
    markdown.push_str("\n---\n\n");

    // Messages
    for msg in messages {
        let role_header = match msg.role.as_str() {
            "user" => "## 👤 User",
            "assistant" => "## 🤖 Assistant",
            "system" => "## ⚙️ System",
            _ => &format!("## {}", msg.role),
        };

        markdown.push_str(&format!("{}\n\n", role_header));
        markdown.push_str(&format!("{}\n\n", msg.content));

        if let Some(tokens) = msg.tokens_used {
            markdown.push_str(&format!("*Tokens used: {}*\n\n", tokens));
        }

        markdown.push_str("---\n\n");
    }

    Ok(markdown)
}

#[tauri::command]
pub async fn save_export_file(
    app: tauri::AppHandle,
    content: String,
    filename: String,
) -> Result<String, String> {
    use std::sync::mpsc;
    use std::sync::{Arc, Mutex};
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = mpsc::channel();

    app.dialog()
        .file()
        .set_file_name(&filename)
        .save_file(move |file_path| {
            let _ = tx.send(file_path);
        });

    // Wait for the dialog to complete
    let file_path = rx.recv().unwrap();

    let file_path = file_path.ok_or_else(|| "User cancelled file save".to_string())?;
    let path = file_path
        .as_path()
        .ok_or_else(|| "Invalid file path".to_string())?;

    std::fs::write(path, content).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(path.to_string_lossy().to_string())
}
#[tauri::command]
pub fn import_conversations_json(
    db: State<'_, Database>,
    json_content: String,
) -> Result<String, String> {
    let conn = db.conn().lock().map_err(|e| e.to_string())?;

    let export_data: ExportData =
        serde_json::from_str(&json_content).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let mut imported_count = 0;
    let mut skipped_count = 0;

    for conv in export_data.conversations {
        // Check if conversation already exists
        if Conversation::get_by_id(&conn, &conv.id)
            .map_err(|e| e.to_string())?
            .is_some()
        {
            skipped_count += 1;
            continue;
        }

        // Create conversation
        let conversation = NewConversationWithId {
            id: conv.id.clone(),
            title: conv.title,
            provider: conv.provider,
            model: conv.model,
            system_prompt: conv.system_prompt,
            created_at: conv.created_at,
            updated_at: conv.updated_at,
        };

        Conversation::create_with_id(&conn, conversation)
            .map_err(|e| format!("Failed to create conversation {}: {}", conv.id, e))?;

        // Import messages
        for msg in conv.messages {
            let msg_id = msg.id.clone();
            let message = NewMessageWithId {
                id: msg.id,
                conversation_id: conv.id.clone(),
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp,
                tokens_used: msg.tokens_used,
            };

            Message::create_with_id(&conn, message)
                .map_err(|e| format!("Failed to create message {}: {}", msg_id, e))?;
        }

        imported_count += 1;
    }

    Ok(format!(
        "Import completed: {} conversations imported, {} skipped (already exist)",
        imported_count, skipped_count
    ))
}

#[tauri::command]
pub async fn load_import_file(app: tauri::AppHandle) -> Result<String, String> {
    use std::sync::{Arc, Mutex};
    use std::thread;
    use std::time::Duration;
    use tauri_plugin_dialog::DialogExt;

    let result = Arc::new(Mutex::new(None));
    let result_clone = result.clone();

    app.dialog()
        .file()
        .add_filter("JSON files", &["json"])
        .pick_file(move |file_path| {
            let mut res = result_clone.lock().unwrap();
            *res = Some(file_path);
        });

    // Wait for the dialog to complete
    let file_path = loop {
        thread::sleep(Duration::from_millis(10));
        let res = result.lock().unwrap();
        if let Some(ref path_opt) = *res {
            break path_opt.clone();
        }
    };

    let file_path = file_path.ok_or_else(|| "User cancelled file selection".to_string())?;
    let path = file_path
        .as_path()
        .ok_or_else(|| "Invalid file path".to_string())?;

    std::fs::read_to_string(path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub fn export_single_conversation_json(
    db: State<'_, Database>,
    conversation_id: String,
) -> Result<String, String> {
    export_conversations_json(db, Some(vec![conversation_id]))
}

#[tauri::command]
pub async fn save_single_conversation_export(
    app: tauri::AppHandle,
    conversation_id: String,
    format: String,
    title: String,
) -> Result<String, String> {
    let db = app.state::<Database>();

    let (content, extension) = match format.as_str() {
        "json" => {
            let content = export_single_conversation_json(db.clone(), conversation_id)?;
            (content, "json")
        }
        "markdown" => {
            let content = export_conversation_markdown(db.clone(), conversation_id)?;
            (content, "md")
        }
        _ => return Err("Invalid format. Supported: json, markdown".to_string()),
    };

    let filename = format!(
        "{}_{}.{}",
        title
            .chars()
            .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            })
            .collect::<String>()
            .trim_end_matches('_'),
        chrono::Utc::now().format("%Y%m%d_%H%M%S"),
        extension
    );

    save_export_file(app, content, filename).await
}
