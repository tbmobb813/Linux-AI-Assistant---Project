# Provider Architecture

This document describes the trait-based provider architecture implemented in the Linux AI Assistant.

## Overview

The AI provider system has been refactored from a monolithic implementation (454 lines) into a modular, trait-based architecture (273 lines in command layer + provider implementations).

## Directory Structure

```
linux-ai-assistant/src-tauri/src/
├── lib/
│   └── providers/
│       ├── mod.rs              # Provider trait + registry (97 lines)
│       ├── streaming.rs        # Shared streaming utilities (36 lines)
│       ├── openai.rs           # OpenAI implementation (131 lines)
│       ├── anthropic.rs        # Anthropic (Claude) implementation (130 lines)
│       ├── gemini.rs           # Google Gemini implementation (130 lines)
│       └── ollama.rs           # Ollama implementation (169 lines)
├── commands/
│   └── provider.rs             # Thin command layer (273 lines)
└── lib.rs                      # Updated registration
```

## Core Components

### AIProvider Trait

Located in `lib/providers/mod.rs`, this trait defines the interface all providers must implement:

```rust
pub trait AIProvider: Send + Sync {
    fn name(&self) -> &str;
    fn generate(&self, messages: Vec<ProviderMessage>, model: Option<String>) -> Result<String, String>;
    fn stream(&self, app: AppHandle, messages: Vec<ProviderMessage>, model: Option<String>) -> Result<String, String>;
    fn list_models(&self) -> Result<Vec<ModelInfo>, String>;
    fn requires_api_key(&self) -> bool;
}
```

### ProviderRegistry

The registry manages all available providers and allows for dynamic provider lookup:

```rust
pub struct ProviderRegistry {
    providers: HashMap<String, Arc<dyn AIProvider>>,
}
```

Providers are registered during application initialization in `lib.rs`.

### StreamSession

Located in `lib/providers/streaming.rs`, this helper manages streaming sessions by emitting chunks to the frontend via Tauri events.

## Provider Implementations

### OpenAI (openai.rs)
- Supports GPT-3.5-turbo, GPT-4, GPT-4-turbo
- Uses OpenAI chat completions API
- Simulated streaming (splits final response into chunks)

### Anthropic (anthropic.rs)
- Supports Claude 3 models (Opus, Sonnet, Haiku)
- Uses Anthropic messages API
- Simulated streaming

### Gemini (gemini.rs)
- Supports Gemini 1.5 Flash, Pro, and legacy models
- Uses Google Generative Language API
- Simulated streaming

### Ollama (ollama.rs)
- Supports all locally installed Ollama models
- Uses local Ollama API endpoint
- **True streaming** support via server-sent events
- No API key required

## Command Layer

The command layer in `commands/provider.rs` has been simplified to just dispatch to the registry:

### New Unified Commands

- `provider_generate(provider, messages, model)` - Generate response (non-streaming)
- `provider_stream(provider, messages, model)` - Generate streaming response
- `list_providers()` - List all available providers
- `list_provider_models(provider)` - List models for a specific provider

### Backward Compatibility

All existing commands are maintained as deprecated wrappers:
- `provider_openai_generate` → `provider_generate("openai", ...)`
- `provider_openai_stream` → `provider_stream("openai", ...)`
- `provider_anthropic_generate` → `provider_generate("anthropic", ...)`
- `provider_gemini_generate` → `provider_generate("gemini", ...)`
- `provider_ollama_generate` → `provider_generate("ollama", ...)`
- `provider_ollama_stream` → `provider_stream("ollama", ...)`

## Benefits

1. **Extensibility**: Add new providers by implementing the `AIProvider` trait
2. **Testability**: Each provider can be tested independently
3. **Maintainability**: Provider logic is isolated in dedicated files
4. **Code Reduction**: Command layer reduced by 40% (454 → 273 lines)
5. **Future-Proof**: Foundation for plugin system and additional capabilities

## Adding a New Provider

To add a new AI provider:

1. Create a new file in `lib/providers/` (e.g., `cohere.rs`)
2. Implement the `AIProvider` trait
3. Register the provider in `ProviderRegistry::new()` in `mod.rs`
4. That's it! The provider is now available via unified commands

Example:

```rust
// lib/providers/cohere.rs
use super::{AIProvider, ProviderMessage, ModelInfo};

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
    
    fn generate(&self, messages: Vec<ProviderMessage>, model: Option<String>) -> Result<String, String> {
        // Implementation
    }
    
    fn stream(&self, app: AppHandle, messages: Vec<ProviderMessage>, model: Option<String>) -> Result<String, String> {
        // Implementation
    }
}
```

Then add to registry:
```rust
// lib/providers/mod.rs
pub mod cohere;

impl ProviderRegistry {
    pub fn new() -> Self {
        // ...
        registry.register(Arc::new(cohere::CohereProvider::new()));
        // ...
    }
}
```

## Migration Notes

### Frontend Code

Frontend code can continue using the existing provider commands (backward compatible) or migrate to the new unified commands:

**Old way (still works):**
```typescript
await invoke("provider_openai_generate", { conversation_id, messages, model });
```

**New way (recommended):**
```typescript
await invoke("provider_generate", { provider: "openai", messages, model });
```

### API Key Management

API key management remains unchanged and is handled through the existing `set_api_key`, `get_api_key`, and internal `prefer_keyring_or_env` functions.

## Future Enhancements

This architecture sets the foundation for:
- Plugin system (load providers at runtime)
- Additional capabilities (embeddings, image generation)
- Provider-specific features (function calling, tool use)
- Dynamic model discovery
- Provider health checks
