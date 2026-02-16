use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use crate::lib::providers::{ProviderRegistry, ProviderMessage, ModelInfo};

// Re-export ProviderMessage for backward compatibility
#[derive(Deserialize, Serialize)]
pub struct ProviderMessageCompat {
    pub role: String,
    pub content: String,
}

impl From<ProviderMessageCompat> for ProviderMessage {
    fn from(msg: ProviderMessageCompat) -> Self {
        ProviderMessage {
            role: msg.role,
            content: msg.content,
        }
    }
}

// ============================================================================
// NEW UNIFIED COMMANDS
// ============================================================================

#[tauri::command]
pub fn provider_generate(
    registry: State<'_, ProviderRegistry>,
    provider: String,
    messages: Vec<ProviderMessageCompat>,
    model: Option<String>,
) -> Result<String, String> {
    let provider_impl = registry
        .get(&provider)
        .ok_or_else(|| format!("Provider '{}' not found", provider))?;
    
    let messages: Vec<ProviderMessage> = messages.into_iter().map(|m| m.into()).collect();
    provider_impl.generate(messages, model)
}

#[tauri::command]
pub fn provider_stream(
    app: AppHandle,
    registry: State<'_, ProviderRegistry>,
    provider: String,
    messages: Vec<ProviderMessageCompat>,
    model: Option<String>,
) -> Result<String, String> {
    let provider_impl = registry
        .get(&provider)
        .ok_or_else(|| format!("Provider '{}' not found", provider))?;
    
    let messages: Vec<ProviderMessage> = messages.into_iter().map(|m| m.into()).collect();
    provider_impl.stream(app, messages, model)
}

#[tauri::command]
pub fn list_providers(
    registry: State<'_, ProviderRegistry>,
) -> Vec<String> {
    registry.list()
}

#[tauri::command]
pub fn list_provider_models(
    registry: State<'_, ProviderRegistry>,
    provider: String,
) -> Result<Vec<ModelInfo>, String> {
    let provider_impl = registry
        .get(&provider)
        .ok_or_else(|| format!("Provider '{}' not found", provider))?;
    
    provider_impl.list_models()
}

// ============================================================================
// BACKWARD COMPATIBILITY COMMANDS (DEPRECATED)
// ============================================================================

#[tauri::command]
#[deprecated(note = "Use provider_generate with provider='openai'")]
pub fn provider_openai_generate(
    registry: State<'_, ProviderRegistry>,
    _conversation_id: String,
    messages: Vec<ProviderMessageCompat>,
    model: Option<String>,
) -> Result<String, String> {
    provider_generate(registry, "openai".to_string(), messages, model)
}

#[tauri::command]
#[deprecated(note = "Use provider_stream with provider='openai'")]
pub fn provider_openai_stream(
    app: AppHandle,
    registry: State<'_, ProviderRegistry>,
    _conversation_id: String,
    messages: Vec<ProviderMessageCompat>,
    model: Option<String>,
) -> Result<String, String> {
    provider_stream(app, registry, "openai".to_string(), messages, model)
}

#[tauri::command]
#[deprecated(note = "Use provider_generate with provider='anthropic'")]
pub fn provider_anthropic_generate(
    registry: State<'_, ProviderRegistry>,
    _conversation_id: String,
    messages: Vec<ProviderMessageCompat>,
    model: Option<String>,
) -> Result<String, String> {
    provider_generate(registry, "anthropic".to_string(), messages, model)
}

#[tauri::command]
#[deprecated(note = "Use provider_generate with provider='gemini'")]
pub fn provider_gemini_generate(
    registry: State<'_, ProviderRegistry>,
    _conversation_id: String,
    messages: Vec<ProviderMessageCompat>,
    model: Option<String>,
) -> Result<String, String> {
    provider_generate(registry, "gemini".to_string(), messages, model)
}

#[tauri::command]
#[deprecated(note = "Use provider_generate with provider='ollama'")]
pub fn provider_ollama_generate(
    registry: State<'_, ProviderRegistry>,
    _conversation_id: String,
    messages: Vec<ProviderMessageCompat>,
    model: Option<String>,
) -> Result<String, String> {
    provider_generate(registry, "ollama".to_string(), messages, model)
}

#[tauri::command]
#[deprecated(note = "Use provider_stream with provider='ollama'")]
pub fn provider_ollama_stream(
    app: AppHandle,
    registry: State<'_, ProviderRegistry>,
    _conversation_id: String,
    messages: Vec<ProviderMessageCompat>,
    model: Option<String>,
) -> Result<String, String> {
    provider_stream(app, registry, "ollama".to_string(), messages, model)
}

#[tauri::command]
pub fn ollama_list_models() -> Result<Vec<String>, String> {
    let client = reqwest::blocking::Client::new();
    let endpoint =
        std::env::var("OLLAMA_ENDPOINT").unwrap_or_else(|_| "http://localhost:11434".to_string());
    let api_url = format!("{}/api/tags", endpoint);

    let resp = client
        .get(&api_url)
        .send()
        .map_err(|e| format!("Ollama request error: {}", e))?;

    let status = resp.status();
    let json: serde_json::Value = resp
        .json()
        .map_err(|e| format!("json parse error: {}", e))?;

    if !status.is_success() {
        return Err(format!("Ollama API returned {}: {}", status, json));
    }

    let models = json["models"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter_map(|model| model["name"].as_str())
        .map(|name| name.to_string())
        .collect();

    Ok(models)
}

#[tauri::command]
pub fn ollama_pull_model(model: String) -> Result<String, String> {
    let client = reqwest::blocking::Client::new();
    let endpoint =
        std::env::var("OLLAMA_ENDPOINT").unwrap_or_else(|_| "http://localhost:11434".to_string());
    let api_url = format!("{}/api/pull", endpoint);

    let body = serde_json::json!({
        "name": model,
        "stream": false
    });

    let resp = client
        .post(&api_url)
        .json(&body)
        .send()
        .map_err(|e| format!("Ollama pull request error: {}", e))?;

    let status = resp.status();

    if !status.is_success() {
        let error_text = resp.text().unwrap_or_default();
        return Err(format!("Ollama pull failed {}: {}", status, error_text));
    }

    Ok(format!("Successfully pulled model: {}", model))
}

#[tauri::command]
pub fn ollama_check_connection() -> Result<bool, String> {
    let client = reqwest::blocking::Client::new();
    let endpoint =
        std::env::var("OLLAMA_ENDPOINT").unwrap_or_else(|_| "http://localhost:11434".to_string());
    let api_url = format!("{}/api/version", endpoint);

    match client.get(&api_url).send() {
        Ok(resp) => Ok(resp.status().is_success()),
        Err(_) => Ok(false),
    }
}

// ============================================================================
// API KEY MANAGEMENT (UNCHANGED)
// ============================================================================

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

pub fn prefer_keyring_or_env(service: &str, env_name: &str) -> Result<String, String> {
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
    #[allow(unreachable_code)]
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
    #[allow(unreachable_code)]
    Err("keyring unsupported on this platform".into())
}
