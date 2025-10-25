use serde::{Deserialize, Serialize};
use tauri::Emitter;
use tauri::Manager;

#[derive(Deserialize, Serialize)]
pub struct ProviderMessage {
    pub role: String,
    pub content: String,
}

#[tauri::command]
pub fn provider_openai_generate(
    _conversation_id: String,
    messages: Vec<ProviderMessage>,
    model: Option<String>,
) -> Result<String, String> {
    // Read API key from environment
    let api_key =
        std::env::var("OPENAI_API_KEY").map_err(|_| "OPENAI_API_KEY not set".to_string())?;

    let client = reqwest::blocking::Client::new();

    let api_url = "https://api.openai.com/v1/chat/completions";

    // Map our messages into the OpenAI chat format
    let msgs: Vec<serde_json::Value> = messages
        .into_iter()
        .map(|m| serde_json::json!({"role": m.role, "content": m.content}))
        .collect();

    let model_name = model.unwrap_or_else(|| "gpt-3.5-turbo".to_string());
    let body = serde_json::json!({
        "model": model_name,
        "messages": msgs,
        "temperature": 0.7
    });

    let resp = client
        .post(api_url)
        .bearer_auth(api_key)
        .json(&body)
        .send()
        .map_err(|e| format!("request error: {}", e))?;

    let status = resp.status();
    let json: serde_json::Value = resp
        .json()
        .map_err(|e| format!("json parse error: {}", e))?;

    if !status.is_success() {
        return Err(format!("OpenAI API returned {}: {}", status, json));
    }

    let content = json["choices"]
        .get(0)
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    Ok(content)
}

#[tauri::command]
pub fn provider_openai_stream(
    app: tauri::AppHandle,
    conversation_id: String,
    messages: Vec<ProviderMessage>,
    model: Option<String>,
) -> Result<String, String> {
    // Generate final content using existing generator (best-effort). If OPENAI_API_KEY
    // is not present, fall back to a deterministic mock.
    let final_content = match provider_openai_generate(conversation_id.clone(), messages, model) {
        Ok(c) => c,
        Err(_) => format!("Mock response to conversation {}", conversation_id),
    };

    let session_id = uuid::Uuid::new_v4().to_string();

    // Spawn a thread to emit chunks to the frontend via Tauri events.
    let session_id_clone = session_id.clone();
    std::thread::spawn(move || {
        let parts: Vec<String> = final_content
            .split_whitespace()
            .map(|s| format!("{} ", s))
            .collect();

        for p in parts {
            // best-effort emit; ignore errors
            let payload = serde_json::json!({"session_id": session_id_clone, "chunk": p});
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.emit("provider-stream-chunk", payload.clone());
            }
            std::thread::sleep(std::time::Duration::from_millis(50));
        }

        let payload = serde_json::json!({"session_id": session_id_clone});
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.emit("provider-stream-end", payload.clone());
        }
    });

    Ok(session_id)
}
