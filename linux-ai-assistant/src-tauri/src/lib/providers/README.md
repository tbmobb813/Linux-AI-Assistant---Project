# AI Providers Module

This module contains the trait-based AI provider system for the Linux AI Assistant.

## Quick Start

### Using Providers from Commands

```rust
use tauri::State;
use crate::lib::providers::{ProviderRegistry, ProviderMessage};

#[tauri::command]
fn my_command(registry: State<'_, ProviderRegistry>) -> Result<String, String> {
    // Get a provider
    let provider = registry
        .get("openai")
        .ok_or("Provider not found")?;
    
    // Generate a response
    let messages = vec![
        ProviderMessage {
            role: "user".to_string(),
            content: "Hello!".to_string(),
        }
    ];
    
    provider.generate(messages, Some("gpt-4".to_string()))
}
```

### Adding a New Provider

1. Create a new file in `lib/providers/`, e.g., `cohere.rs`:

```rust
use super::{AIProvider, ProviderMessage, ModelInfo};
use tauri::AppHandle;

pub struct CohereProvider;

impl CohereProvider {
    pub fn new() -> Self {
        Self
    }
}

impl AIProvider for CohereProvider {
    fn name(&self) -> &str {
        "cohere"
    }
    
    fn generate(
        &self,
        messages: Vec<ProviderMessage>,
        model: Option<String>,
    ) -> Result<String, String> {
        // Your implementation here
        Ok("Response".to_string())
    }
    
    fn stream(
        &self,
        app: AppHandle,
        messages: Vec<ProviderMessage>,
        model: Option<String>,
    ) -> Result<String, String> {
        // Your streaming implementation here
        let session_id = uuid::Uuid::new_v4().to_string();
        Ok(session_id)
    }
}
```

2. Add the module to `mod.rs`:

```rust
pub mod cohere;
```

3. Register it in `ProviderRegistry::new()`:

```rust
registry.register(Arc::new(cohere::CohereProvider::new()));
```

That's it! Your provider is now available via:
- `provider_generate("cohere", messages, model)`
- `provider_stream("cohere", messages, model)`

## Architecture

### AIProvider Trait

The core trait that all providers must implement:

```rust
pub trait AIProvider: Send + Sync {
    /// Unique identifier (e.g., "openai", "anthropic")
    fn name(&self) -> &str;
    
    /// Generate a non-streaming response
    fn generate(
        &self,
        messages: Vec<ProviderMessage>,
        model: Option<String>,
    ) -> Result<String, String>;
    
    /// Generate a streaming response
    fn stream(
        &self,
        app: AppHandle,
        messages: Vec<ProviderMessage>,
        model: Option<String>,
    ) -> Result<String, String>;
    
    /// List available models (optional)
    fn list_models(&self) -> Result<Vec<ModelInfo>, String> {
        Ok(vec![])
    }
    
    /// Whether this provider requires an API key
    fn requires_api_key(&self) -> bool {
        true
    }
}
```

### ProviderRegistry

Manages all registered providers:

```rust
pub struct ProviderRegistry {
    providers: HashMap<String, Arc<dyn AIProvider>>,
}

impl ProviderRegistry {
    pub fn new() -> Self;
    pub fn register(&mut self, provider: Arc<dyn AIProvider>);
    pub fn get(&self, name: &str) -> Option<Arc<dyn AIProvider>>;
    pub fn list(&self) -> Vec<String>;
}
```

### StreamSession

Helper for managing streaming responses:

```rust
pub struct StreamSession {
    session_id: String,
    app: AppHandle,
}

impl StreamSession {
    pub fn new(session_id: String, app: AppHandle) -> Self;
    pub fn emit_chunk(&self, chunk: &str);
    pub fn emit_end(&self);
}
```

## Built-in Providers

### OpenAI
- **Models**: GPT-3.5-turbo, GPT-4, GPT-4-turbo
- **Streaming**: Simulated (splits final response)
- **API Key**: Required (from keyring or OPENAI_API_KEY env var)

### Anthropic
- **Models**: Claude 3 Opus, Sonnet, Haiku
- **Streaming**: Simulated
- **API Key**: Required (from keyring or ANTHROPIC_API_KEY env var)

### Gemini
- **Models**: Gemini 1.5 Flash, Pro, legacy models
- **Streaming**: Simulated
- **API Key**: Required (from keyring or GEMINI_API_KEY env var)

### Ollama
- **Models**: Any locally installed model
- **Streaming**: True streaming via SSE
- **API Key**: Not required
- **Endpoint**: Configurable via OLLAMA_ENDPOINT env var (default: http://localhost:11434)

## Event System

Streaming providers emit events to the frontend:

### provider-stream-chunk
```json
{
  "session_id": "uuid-here",
  "chunk": "text chunk"
}
```

### provider-stream-end
```json
{
  "session_id": "uuid-here"
}
```

## API Key Management

Providers use the existing keyring system via `prefer_keyring_or_env()`:

```rust
fn get_api_key(&self) -> Result<String, String> {
    crate::commands::provider::prefer_keyring_or_env("provider_name", "ENV_VAR_NAME")
}
```

This checks:
1. Keyring entry for "linux-ai-assistant/provider_name"
2. Environment variable ENV_VAR_NAME
3. Returns error if neither exists

## Testing

To test a provider implementation:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_provider_name() {
        let provider = MyProvider::new();
        assert_eq!(provider.name(), "myprovider");
    }
    
    #[test]
    fn test_generate() {
        let provider = MyProvider::new();
        let messages = vec![
            ProviderMessage {
                role: "user".to_string(),
                content: "test".to_string(),
            }
        ];
        
        let result = provider.generate(messages, None);
        assert!(result.is_ok());
    }
}
```

## Error Handling

All provider methods return `Result<T, String>`:
- **Ok(value)**: Successful response
- **Err(message)**: Error message string

Common error scenarios:
- API key missing
- Network request failed
- Invalid API response
- Model not available

## Performance

### Memory
Each provider is wrapped in `Arc<dyn AIProvider>` for efficient sharing.

### Threading
- Generate methods run on the current thread (blocking)
- Stream methods spawn a new thread for async processing

### Caching
Providers are created once at startup and reused throughout the application lifecycle.

## Future Enhancements

Planned features:
- [ ] Dynamic provider loading (plugins)
- [ ] Provider health checks
- [ ] Model capability detection
- [ ] Embeddings support
- [ ] Image generation support
- [ ] Function calling / tool use
- [ ] Cost tracking per provider
- [ ] Rate limiting support
