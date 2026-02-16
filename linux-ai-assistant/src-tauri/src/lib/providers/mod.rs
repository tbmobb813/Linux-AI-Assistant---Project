use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::AppHandle;

pub mod streaming;
pub mod openai;
pub mod anthropic;
pub mod gemini;
pub mod ollama;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub name: String,
    pub context_length: Option<u32>,
    pub description: Option<String>,
}

/// Trait that all AI providers must implement
pub trait AIProvider: Send + Sync {
    /// Unique identifier for this provider (e.g., "openai", "anthropic")
    fn name(&self) -> &str;
    
    /// Generate a response (non-streaming)
    fn generate(
        &self,
        messages: Vec<ProviderMessage>,
        model: Option<String>,
    ) -> Result<String, String>;
    
    /// Generate a streaming response
    /// Returns a session ID that will be used to emit chunks
    fn stream(
        &self,
        app: AppHandle,
        messages: Vec<ProviderMessage>,
        model: Option<String>,
    ) -> Result<String, String>;
    
    /// List available models for this provider
    fn list_models(&self) -> Result<Vec<ModelInfo>, String> {
        Ok(vec![]) // Default implementation: no models
    }
    
    /// Check if this provider requires an API key
    fn requires_api_key(&self) -> bool {
        true // Most providers require API keys
    }
}

/// Registry for managing AI providers
pub struct ProviderRegistry {
    providers: HashMap<String, Arc<dyn AIProvider>>,
}

impl ProviderRegistry {
    pub fn new() -> Self {
        let mut registry = Self {
            providers: HashMap::new(),
        };
        
        // Register built-in providers
        registry.register(Arc::new(openai::OpenAIProvider::new()));
        registry.register(Arc::new(anthropic::AnthropicProvider::new()));
        registry.register(Arc::new(gemini::GeminiProvider::new()));
        registry.register(Arc::new(ollama::OllamaProvider::new()));
        
        registry
    }
    
    pub fn register(&mut self, provider: Arc<dyn AIProvider>) {
        self.providers.insert(provider.name().to_string(), provider);
    }
    
    pub fn get(&self, name: &str) -> Option<Arc<dyn AIProvider>> {
        self.providers.get(name).cloned()
    }
    
    pub fn list(&self) -> Vec<String> {
        self.providers.keys().cloned().collect()
    }
}

impl Default for ProviderRegistry {
    fn default() -> Self {
        Self::new()
    }
}
