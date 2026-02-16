use super::{AIProvider, ModelInfo, ProviderMessage, streaming::StreamSession};
use tauri::AppHandle;

pub struct OllamaProvider;

impl OllamaProvider {
    pub fn new() -> Self {
        Self
    }
    
    fn get_endpoint(&self) -> String {
        std::env::var("OLLAMA_ENDPOINT").unwrap_or_else(|_| "http://localhost:11434".to_string())
    }
    
    fn format_messages(&self, messages: Vec<ProviderMessage>) -> String {
        messages
            .into_iter()
            .map(|m| match m.role.as_str() {
                "system" => format!("System: {}", m.content),
                "user" => format!("Human: {}", m.content),
                "assistant" => format!("Assistant: {}", m.content),
                _ => format!("{}: {}", m.role, m.content),
            })
            .collect::<Vec<_>>()
            .join("\n\n")
    }
}

impl AIProvider for OllamaProvider {
    fn name(&self) -> &str {
        "ollama"
    }
    
    fn generate(
        &self,
        messages: Vec<ProviderMessage>,
        model: Option<String>,
    ) -> Result<String, String> {
        let client = reqwest::blocking::Client::new();
        let endpoint = self.get_endpoint();
        let api_url = format!("{}/api/generate", endpoint);
        
        let prompt = self.format_messages(messages);
        let model_name = model.unwrap_or_else(|| "llama3.2".to_string());
        
        let body = serde_json::json!({
            "model": model_name,
            "prompt": prompt,
            "stream": false
        });
        
        let resp = client
            .post(&api_url)
            .json(&body)
            .send()
            .map_err(|e| format!("Ollama request error: {}", e))?;
        
        let status = resp.status();
        let json: serde_json::Value = resp
            .json()
            .map_err(|e| format!("json parse error: {}", e))?;
        
        if !status.is_success() {
            return Err(format!("Ollama API returned {}: {}", status, json));
        }
        
        let content = json["response"].as_str().unwrap_or("").to_string();
        
        Ok(content)
    }
    
    fn stream(
        &self,
        app: AppHandle,
        messages: Vec<ProviderMessage>,
        model: Option<String>,
    ) -> Result<String, String> {
        let client = reqwest::blocking::Client::new();
        let endpoint = self.get_endpoint();
        let api_url = format!("{}/api/generate", endpoint);
        
        let prompt = self.format_messages(messages);
        let model_name = model.unwrap_or_else(|| "llama3.2".to_string());
        let session_id = uuid::Uuid::new_v4().to_string();
        
        let body = serde_json::json!({
            "model": model_name,
            "prompt": prompt,
            "stream": true
        });
        
        // Spawn thread for streaming response
        let session_id_clone = session_id.clone();
        std::thread::spawn(move || {
            let resp = match client.post(&api_url).json(&body).send() {
                Ok(r) => r,
                Err(_) => return,
            };
            
            if !resp.status().is_success() {
                return;
            }
            
            let reader = std::io::BufReader::new(resp);
            use std::io::BufRead;
            
            let stream = StreamSession::new(session_id_clone, app);
            
            for line in reader.lines().map_while(Result::ok) {
                if line.trim().is_empty() {
                    continue;
                }
                
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
                    if let Some(response) = json["response"].as_str() {
                        stream.emit_chunk(response);
                    }
                    
                    // Check if this is the final response
                    if json["done"].as_bool().unwrap_or(false) {
                        stream.emit_end();
                        break;
                    }
                }
            }
        });
        
        Ok(session_id)
    }
    
    fn list_models(&self) -> Result<Vec<ModelInfo>, String> {
        let client = reqwest::blocking::Client::new();
        let endpoint = self.get_endpoint();
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
            .filter_map(|model| {
                model["name"].as_str().map(|name| ModelInfo {
                    name: name.to_string(),
                    context_length: None,
                    description: None,
                })
            })
            .collect();
        
        Ok(models)
    }
    
    fn requires_api_key(&self) -> bool {
        false // Ollama doesn't require an API key
    }
}
