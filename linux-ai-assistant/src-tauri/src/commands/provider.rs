use serde::{Deserialize, Serialize};
use std::collections::HashMap;
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

fn get_keyring_secret(service: &str) -> Option<String> {
    #[cfg(any(target_os = "linux", target_os = "macos", target_os = "windows"))]
    {
        if let Ok(entry) = keyring::Entry::new("linux-ai-assistant", service) {
            if let Ok(secret) = entry.get_password() {
                if !secret.is_empty() {
                    return Some(secret);
                }
            }
        }
    }
    None
}

fn prefer_keyring_or_env(service: &str, env_name: &str) -> Result<String, String> {
    if let Some(s) = get_keyring_secret(service) {
        return Ok(s);
    }
    std::env::var(env_name).map_err(|_| format!("{} not set", env_name))
}

#[tauri::command]
pub fn set_api_key(provider: String, key: String) -> Result<(), String> {
    #[cfg(any(target_os = "linux", target_os = "macos", target_os = "windows"))]
    {
        let entry = keyring::Entry::new("linux-ai-assistant", &provider)
            .map_err(|e| format!("keyring entry error: {}", e))?;
        entry
            .set_password(&key)
            .map_err(|e| format!("keyring set failed: {}", e))?;
        return Ok(());
    }
    Err("keyring unsupported on this platform".into())
}

#[tauri::command]
pub fn get_api_key(provider: String) -> Result<String, String> {
    #[cfg(any(target_os = "linux", target_os = "macos", target_os = "windows"))]
    {
        let entry = keyring::Entry::new("linux-ai-assistant", &provider)
            .map_err(|e| format!("keyring entry error: {}", e))?;
        let val = entry
            .get_password()
            .map_err(|e| format!("keyring get failed: {}", e))?;
        return Ok(val);
    }
    Err("keyring unsupported on this platform".into())
}

#[tauri::command]
pub fn provider_anthropic_generate(
    _conversation_id: String,
    messages: Vec<ProviderMessage>,
    model: Option<String>,
) -> Result<String, String> {
    let api_key = prefer_keyring_or_env("anthropic", "ANTHROPIC_API_KEY")?;
    let client = reqwest::blocking::Client::new();
    let api_url = "https://api.anthropic.com/v1/messages";
    // Collapse messages into a single user prompt for simplicity
    let prompt = messages
        .into_iter()
        .map(|m| format!("{}: {}", m.role, m.content))
        .collect::<Vec<_>>()
        .join("\n\n");
    let body = serde_json::json!({
        "model": model.unwrap_or_else(|| "claude-3-5-sonnet-20240620".to_string()),
        "max_tokens": 1024,
        "messages": [ { "role": "user", "content": prompt } ]
    });
    let resp = client
        .post(api_url)
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .json(&body)
        .send()
        .map_err(|e| format!("request error: {}", e))?;
    let status = resp.status();
    let json: serde_json::Value = resp
        .json()
        .map_err(|e| format!("json parse error: {}", e))?;
    if !status.is_success() {
        return Err(format!("Anthropic API returned {}: {}", status, json));
    }
    let content = json["content"]
        .get(0)
        .and_then(|c| c.get("text"))
        .and_then(|t| t.as_str())
        .unwrap_or("")
        .to_string();
    Ok(content)
}

#[tauri::command]
pub fn provider_gemini_generate(
    _conversation_id: String,
    messages: Vec<ProviderMessage>,
    model: Option<String>,
) -> Result<String, String> {
    let api_key = prefer_keyring_or_env("gemini", "GEMINI_API_KEY")?;
    let model_name = model.unwrap_or_else(|| "gemini-1.5-flash".to_string());
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model_name, api_key
    );
    let client = reqwest::blocking::Client::new();
    let text = messages
        .into_iter()
        .map(|m| format!("{}: {}", m.role, m.content))
        .collect::<Vec<_>>()
        .join("\n\n");
    let body = serde_json::json!({
        "contents": [ { "parts": [ { "text": text } ] } ]
    });
    let resp = client
        .post(&url)
        .json(&body)
        .send()
        .map_err(|e| format!("request error: {}", e))?;
    let status = resp.status();
    let json: serde_json::Value = resp
        .json()
        .map_err(|e| format!("json parse error: {}", e))?;
    if !status.is_success() {
        return Err(format!("Gemini API returned {}: {}", status, json));
    }
    let content = json["candidates"]
        .get(0)
        .and_then(|c| c.get("content"))
        .and_then(|ct| ct.get("parts"))
        .and_then(|p| p.get(0))
        .and_then(|p| p.get("text"))
        .and_then(|t| t.as_str())
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
