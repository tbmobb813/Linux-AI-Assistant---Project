# Migration Guide: Old Provider System → Trait-Based System

This guide helps developers migrate from the old monolithic provider system to the new trait-based architecture.

## Table of Contents
1. [Overview](#overview)
2. [For Backend Developers](#for-backend-developers)
3. [For Frontend Developers](#for-frontend-developers)
4. [Breaking Changes](#breaking-changes)
5. [Migration Timeline](#migration-timeline)

## Overview

The provider system has been refactored from a monolithic implementation to a trait-based architecture. This change is **backward compatible** - existing code continues to work without modifications.

### What Changed

**Before:**
- All providers in one file (`commands/provider.rs`, 454 lines)
- Separate command for each provider action
- Hard to add new providers

**After:**
- Trait-based system with pluggable providers
- Unified commands for all providers
- Easy to add new providers (just implement trait)
- Old commands still work (marked deprecated)

## For Backend Developers

### Adding a New Provider

#### Old Way (No Longer Needed)
```rust
// Had to modify commands/provider.rs and add:
// 1. New command function
// 2. New streaming function
// 3. Register in lib.rs
// = 100+ lines of code

#[tauri::command]
pub fn provider_myprovider_generate(...) -> Result<String, String> {
    // Implementation
}

#[tauri::command]
pub fn provider_myprovider_stream(...) -> Result<String, String> {
    // Implementation
}
```

#### New Way (Recommended)
```rust
// Create lib/providers/myprovider.rs (50-150 lines)
use super::{AIProvider, ProviderMessage, ModelInfo};

pub struct MyProvider;

impl AIProvider for MyProvider {
    fn name(&self) -> &str { "myprovider" }
    
    fn generate(&self, messages: Vec<ProviderMessage>, model: Option<String>) 
        -> Result<String, String> {
        // Implementation
    }
    
    fn stream(&self, app: AppHandle, messages: Vec<ProviderMessage>, model: Option<String>) 
        -> Result<String, String> {
        // Implementation
    }
}

// Register in lib/providers/mod.rs
pub mod myprovider;

// Add to ProviderRegistry::new()
registry.register(Arc::new(myprovider::MyProvider::new()));
```

**Benefits:**
- ✅ No modification to command layer
- ✅ Isolated implementation
- ✅ Automatically available via unified commands
- ✅ Testable independently

### Using Providers in Commands

#### Old Way (Still Works)
```rust
#[tauri::command]
pub fn my_command(_conversation_id: String, messages: Vec<ProviderMessage>) 
    -> Result<String, String> {
    provider_openai_generate(_conversation_id, messages, None)
}
```

#### New Way (Recommended)
```rust
use tauri::State;
use crate::lib::providers::ProviderRegistry;

#[tauri::command]
pub fn my_command(
    registry: State<'_, ProviderRegistry>,
    provider_name: String,
    messages: Vec<ProviderMessageCompat>,
) -> Result<String, String> {
    let provider = registry
        .get(&provider_name)
        .ok_or("Provider not found")?;
    
    let messages: Vec<ProviderMessage> = messages.into_iter().map(Into::into).collect();
    provider.generate(messages, None)
}
```

### Implementing Streaming

#### Old Way
```rust
#[tauri::command]
pub fn my_stream(app: AppHandle, ...) -> Result<String, String> {
    let session_id = uuid::Uuid::new_v4().to_string();
    let session_id_clone = session_id.clone();
    
    std::thread::spawn(move || {
        // Manual event emission
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.emit("provider-stream-chunk", payload);
        }
    });
    
    Ok(session_id)
}
```

#### New Way
```rust
use crate::lib::providers::streaming::StreamSession;

fn stream(&self, app: AppHandle, messages: Vec<ProviderMessage>, model: Option<String>) 
    -> Result<String, String> {
    let session_id = uuid::Uuid::new_v4().to_string();
    let session_id_clone = session_id.clone();
    
    std::thread::spawn(move || {
        let stream = StreamSession::new(session_id_clone, app);
        
        for chunk in chunks {
            stream.emit_chunk(&chunk);  // Simplified!
        }
        
        stream.emit_end();  // Simplified!
    });
    
    Ok(session_id)
}
```

## For Frontend Developers

### Calling Provider Commands

#### Old Way (Still Works, Deprecated)
```typescript
// Separate command for each provider
await invoke("provider_openai_generate", {
  conversation_id: "123",
  messages: [...],
  model: "gpt-4"
});

await invoke("provider_anthropic_generate", {
  conversation_id: "123",
  messages: [...],
  model: "claude-3-opus"
});

await invoke("provider_ollama_stream", {
  conversation_id: "123",
  messages: [...],
  model: "llama3.2"
});
```

#### New Way (Recommended)
```typescript
// Single unified command for all providers
await invoke("provider_generate", {
  provider: "openai",  // Just change this string!
  messages: [...],
  model: "gpt-4"
});

await invoke("provider_generate", {
  provider: "anthropic",
  messages: [...],
  model: "claude-3-opus"
});

await invoke("provider_stream", {
  provider: "ollama",
  messages: [...],
  model: "llama3.2"
});
```

**Benefits:**
- ✅ Single command to learn
- ✅ Easy to switch providers
- ✅ Supports future providers automatically

### Listing Available Providers

#### Old Way
```typescript
// Had to hardcode the list
const providers = ["openai", "anthropic", "gemini", "ollama"];
```

#### New Way
```typescript
// Dynamic list from backend
const providers = await invoke<string[]>("list_providers");
// Returns: ["openai", "anthropic", "gemini", "ollama"]
```

### Listing Provider Models

#### New Feature (Not Available Before)
```typescript
const models = await invoke("list_provider_models", {
  provider: "openai"
});
// Returns: [
//   { name: "gpt-4", context_length: 8192, description: "..." },
//   { name: "gpt-4-turbo", context_length: 128000, description: "..." },
//   ...
// ]
```

### Streaming

#### Old Way (Still Works)
```typescript
const sessionId = await invoke("provider_openai_stream", {
  conversation_id: "123",
  messages: [...],
  model: "gpt-4"
});

await listen("provider-stream-chunk", (event) => {
  if (event.payload.session_id === sessionId) {
    console.log(event.payload.chunk);
  }
});

await listen("provider-stream-end", (event) => {
  if (event.payload.session_id === sessionId) {
    console.log("Done!");
  }
});
```

#### New Way (Recommended)
```typescript
const sessionId = await invoke("provider_stream", {
  provider: "openai",  // Unified command
  messages: [...],
  model: "gpt-4"
});

// Event handling is the same
await listen("provider-stream-chunk", (event) => {
  if (event.payload.session_id === sessionId) {
    console.log(event.payload.chunk);
  }
});

await listen("provider-stream-end", (event) => {
  if (event.payload.session_id === sessionId) {
    console.log("Done!");
  }
});
```

### Provider Switching Example

#### Old Way
```typescript
let sessionId;
if (provider === "openai") {
  sessionId = await invoke("provider_openai_stream", {...});
} else if (provider === "ollama") {
  sessionId = await invoke("provider_ollama_stream", {...});
} else {
  // Other providers don't have streaming
  return await invoke("provider_anthropic_generate", {...});
}
```

#### New Way
```typescript
// All providers use the same commands
const sessionId = await invoke("provider_stream", {
  provider: settings.defaultProvider,  // Dynamic!
  messages: [...],
  model: settings.defaultModel
});
```

## Breaking Changes

### None!

This refactor is **fully backward compatible**. All existing commands continue to work:

- ✅ `provider_openai_generate` → Works (deprecated)
- ✅ `provider_openai_stream` → Works (deprecated)
- ✅ `provider_anthropic_generate` → Works (deprecated)
- ✅ `provider_gemini_generate` → Works (deprecated)
- ✅ `provider_ollama_generate` → Works (deprecated)
- ✅ `provider_ollama_stream` → Works (deprecated)

### Deprecation Warnings

If you're using the old commands, you'll see deprecation warnings in the Rust code:

```rust
warning: use of deprecated function `provider_openai_generate`: 
         Use provider_generate with provider='openai'
```

These are **warnings only** - your code will still work.

## Migration Timeline

### Phase 1: Current (Backward Compatible)
- ✅ Old commands work (deprecated)
- ✅ New commands available
- ✅ Both can be used simultaneously

### Phase 2: Recommended (Next Release)
- 🔄 Migrate frontend to use new commands
- 🔄 Update documentation
- ⚠️ Deprecation warnings remain

### Phase 3: Future (v0.2.0+)
- ❌ Remove deprecated commands
- ✅ Only unified commands available
- 📚 Migration guide in release notes

## Migration Checklist

### For Backend
- [ ] Understand new provider trait
- [ ] Review existing provider implementations
- [ ] Add new providers using trait pattern
- [ ] Use ProviderRegistry in new commands
- [ ] Test with unified commands

### For Frontend
- [ ] Review new unified commands
- [ ] Test provider switching
- [ ] Update UI to use list_providers
- [ ] Migrate streaming code (optional)
- [ ] Update tests

## Getting Help

- 📖 See [PROVIDER_ARCHITECTURE.md](../PROVIDER_ARCHITECTURE.md) for architecture details
- 📖 See [IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md) for implementation details
- 📖 See [lib/providers/README.md](../linux-ai-assistant/src-tauri/src/lib/providers/README.md) for API reference
- 🐛 Report issues on GitHub

## Examples

### Complete Frontend Example

```typescript
// lib/providers/unified.ts
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export async function generateWithProvider(
  provider: string,
  messages: Message[],
  model?: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  if (onChunk) {
    // Streaming
    const sessionId = await invoke<string>("provider_stream", {
      provider,
      messages,
      model
    });
    
    let buffer = "";
    
    const unlisten = await listen("provider-stream-chunk", (e: any) => {
      if (e.payload?.session_id === sessionId) {
        buffer += e.payload.chunk;
        onChunk(e.payload.chunk);
      }
    });
    
    await listen("provider-stream-end", (e: any) => {
      if (e.payload?.session_id === sessionId) {
        unlisten();
      }
    });
    
    return buffer;
  } else {
    // Non-streaming
    return await invoke<string>("provider_generate", {
      provider,
      messages,
      model
    });
  }
}

// Usage
const response = await generateWithProvider(
  "openai",
  [{ role: "user", content: "Hello!" }],
  "gpt-4",
  (chunk) => console.log(chunk)
);
```

### Complete Backend Example

```rust
// lib/providers/custom.rs
use super::{AIProvider, ProviderMessage, ModelInfo, streaming::StreamSession};
use tauri::AppHandle;

pub struct CustomProvider {
    api_endpoint: String,
}

impl CustomProvider {
    pub fn new() -> Self {
        Self {
            api_endpoint: "https://api.example.com".to_string(),
        }
    }
}

impl AIProvider for CustomProvider {
    fn name(&self) -> &str {
        "custom"
    }
    
    fn generate(&self, messages: Vec<ProviderMessage>, model: Option<String>) 
        -> Result<String, String> {
        // Your API call here
        Ok("Response".to_string())
    }
    
    fn stream(&self, app: AppHandle, messages: Vec<ProviderMessage>, model: Option<String>) 
        -> Result<String, String> {
        let session_id = uuid::Uuid::new_v4().to_string();
        let session_id_clone = session_id.clone();
        
        std::thread::spawn(move || {
            let stream = StreamSession::new(session_id_clone, app);
            
            // Your streaming logic here
            stream.emit_chunk("Hello ");
            stream.emit_chunk("World!");
            stream.emit_end();
        });
        
        Ok(session_id)
    }
    
    fn list_models(&self) -> Result<Vec<ModelInfo>, String> {
        Ok(vec![
            ModelInfo {
                name: "custom-v1".to_string(),
                context_length: Some(4096),
                description: Some("Custom model".to_string()),
            }
        ])
    }
}
```

## Summary

The new trait-based system is:
- ✅ **Backward Compatible** - All old code works
- ✅ **More Maintainable** - Clear separation of concerns
- ✅ **Easier to Extend** - Just implement a trait
- ✅ **More Testable** - Independent provider testing
- ✅ **Future-Proof** - Foundation for plugins

**Migration is optional but recommended** for new code. Old code continues to work without changes.
