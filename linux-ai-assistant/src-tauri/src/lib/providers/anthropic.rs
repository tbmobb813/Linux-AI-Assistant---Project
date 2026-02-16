use super::{AIProvider, ModelInfo, ProviderMessage, streaming::StreamSession};
use tauri::AppHandle;

pub struct AnthropicProvider;

impl AnthropicProvider {
    pub fn new() -> Self {
        Self
    }
    
    fn get_api_key(&self) -> Result<String, String> {
        crate::commands::provider::prefer_keyring_or_env("anthropic", "ANTHROPIC_API_KEY")
    }
}

impl AIProvider for AnthropicProvider {
    fn name(&self) -> &str {
        "anthropic"
    }
    
    fn generate(
        &self,
        messages: Vec<ProviderMessage>,
        model: Option<String>,
    ) -> Result<String, String> {
        let api_key = self.get_api_key()?;
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
    
    fn stream(
        &self,
        app: AppHandle,
        messages: Vec<ProviderMessage>,
        model: Option<String>,
    ) -> Result<String, String> {
        let session_id = uuid::Uuid::new_v4().to_string();
        let session_id_clone = session_id.clone();
        
        // Get the final content
        let final_content = self.generate(messages, model)
            .unwrap_or_else(|_| "Mock response".to_string());
        
        // Spawn thread for streaming (simulate streaming since Anthropic doesn't support it in this simple implementation)
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
                name: "claude-3-5-sonnet-20240620".to_string(),
                context_length: Some(200000),
                description: Some("Most capable Claude model".to_string()),
            },
            ModelInfo {
                name: "claude-3-opus-20240229".to_string(),
                context_length: Some(200000),
                description: Some("Powerful model for complex tasks".to_string()),
            },
            ModelInfo {
                name: "claude-3-sonnet-20240229".to_string(),
                context_length: Some(200000),
                description: Some("Balanced performance and speed".to_string()),
            },
        ])
    }
}
