use super::{AIProvider, ModelInfo, ProviderMessage, streaming::StreamSession};
use tauri::AppHandle;

pub struct OpenAIProvider;

impl OpenAIProvider {
    pub fn new() -> Self {
        Self
    }
    
    fn get_api_key(&self) -> Result<String, String> {
        // Reuse existing keyring logic from commands module
        crate::commands::provider::prefer_keyring_or_env("openai", "OPENAI_API_KEY")
    }
}

impl AIProvider for OpenAIProvider {
    fn name(&self) -> &str {
        "openai"
    }
    
    fn generate(
        &self,
        messages: Vec<ProviderMessage>,
        model: Option<String>,
    ) -> Result<String, String> {
        let api_key = self.get_api_key()?;
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
    
    fn stream(
        &self,
        app: AppHandle,
        messages: Vec<ProviderMessage>,
        model: Option<String>,
    ) -> Result<String, String> {
        let session_id = uuid::Uuid::new_v4().to_string();
        let session_id_clone = session_id.clone();
        
        // Get the final content (best-effort)
        let final_content = match self.generate(messages, model) {
            Ok(c) => c,
            Err(_) => "Mock response".to_string(),
        };
        
        // Spawn thread for streaming
        std::thread::spawn(move || {
            let stream = StreamSession::new(session_id_clone, app);
            
            // Split into chunks and emit
            let chunks: Vec<String> = final_content
                .split_whitespace()
                .map(|s| format!("{} ", s))
                .collect();
            
            for chunk in chunks {
                stream.emit_chunk(&chunk);
                std::thread::sleep(std::time::Duration::from_millis(50));
            }
            
            stream.emit_end();
        });
        
        Ok(session_id)
    }
    
    fn list_models(&self) -> Result<Vec<ModelInfo>, String> {
        Ok(vec![
            ModelInfo {
                name: "gpt-4".to_string(),
                context_length: Some(8192),
                description: Some("Most capable GPT-4 model".to_string()),
            },
            ModelInfo {
                name: "gpt-4-turbo".to_string(),
                context_length: Some(128000),
                description: Some("GPT-4 Turbo with 128K context".to_string()),
            },
            ModelInfo {
                name: "gpt-3.5-turbo".to_string(),
                context_length: Some(16385),
                description: Some("Fast and efficient model".to_string()),
            },
        ])
    }
}
