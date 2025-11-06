use tauri::State;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct LAISettings {
    pub provider: String,
    pub model: String,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
    pub privacy: Option<PrivacySettings>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PrivacySettings {
    pub local_first: bool,
    pub audit_enabled: bool,
    pub encrypt_conversations: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileContext {
    pub path: String,
    pub content: Option<String>,
    pub last_modified: Option<u64>,
}

/// Get LAI settings for @lai/core initialization
#[tauri::command]
pub async fn get_settings() -> Result<LAISettings, String> {
    // Load from config file or defaults
    // For now, return defaults
    Ok(LAISettings {
        provider: "ollama".to_string(),
        model: "llama2".to_string(),
        temperature: Some(0.7),
        max_tokens: Some(2000),
        privacy: Some(PrivacySettings {
            local_first: false,
            audit_enabled: false,
            encrypt_conversations: false,
        }),
    })
}

// Note: API key management commands are implemented in `provider.rs` as
// `get_api_key` and `set_api_key`. The frontend should call those.

/// Save provider settings
#[tauri::command]
pub async fn save_provider_settings(
    provider: String,
    model: String,
) -> Result<(), String> {
    // Save to config file
    // TODO: Implement actual config saving
    println!("Saving provider: {}, model: {}", provider, model);
    Ok(())
}

/// Get watched files for context
#[tauri::command]
pub async fn get_watched_files() -> Result<Vec<FileContext>, String> {
    // This should return files from your file watcher
    // For now, return empty
    // TODO: Hook up to your existing file watcher
    Ok(vec![])
}
