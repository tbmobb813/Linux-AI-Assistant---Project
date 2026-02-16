use super::{AIProvider, ModelInfo, ProviderMessage, streaming::StreamSession};
use tauri::AppHandle;

pub struct GeminiProvider;

impl GeminiProvider {
    pub fn new() -> Self {
        Self
    }
    
    fn get_api_key(&self) -> Result<String, String> {
        crate::commands::provider::prefer_keyring_or_env("gemini", "GEMINI_API_KEY")
    }
}

impl AIProvider for GeminiProvider {
    fn name(&self) -> &str {
        "gemini"
    }
    
    fn generate(
        &self,
        messages: Vec<ProviderMessage>,
        model: Option<String>,
    ) -> Result<String, String> {
        let api_key = self.get_api_key()?;
        let model_name = model.unwrap_or_else(|| "gemini-1.5-flash".to_string());
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent",
            model_name
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
            .header("Authorization", format!("Bearer {}", api_key))
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
                name: "gemini-1.5-flash".to_string(),
                context_length: Some(1000000),
                description: Some("Fast and efficient model".to_string()),
            },
            ModelInfo {
                name: "gemini-1.5-pro".to_string(),
                context_length: Some(2000000),
                description: Some("Most capable Gemini model".to_string()),
            },
            ModelInfo {
                name: "gemini-pro".to_string(),
                context_length: Some(32000),
                description: Some("Balanced performance".to_string()),
            },
        ])
    }
}
