# Linux AI Assistant - Developer Guide

Complete API documentation and development guide for the Linux AI Assistant.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Backend API](#backend-api)
4. [Frontend Components](#frontend-components)
5. [CLI Integration](#cli-integration)
6. [Extension Development](#extension-development)
7. [Contributing](#contributing)

## Architecture Overview

The Linux AI Assistant is built using a modern technology stack:

**Frontend:**

- React 18+ with TypeScript
- Zustand for state management
- Tailwind CSS for styling
- Vite for fast development and optimized builds

**Backend (Tauri):**

- Rust with Tokio async runtime
- SQLite for persistent storage
- Tauri for native desktop integration

**Key Components:**

```
┌─────────────────────────────────────────┐
│         Desktop Application             │
├──────────────────┬──────────────────────┤
│   React Frontend │   Tauri Backend      │
│   ├─ Chat UI    │   ├─ Database        │
│   ├─ Settings   │   ├─ API Integration │
│   └─ Modals     │   └─ System Hooks    │
└──────────────────┴──────────────────────┘
         ↓                    ↓
    CLI Tool           Cloud Providers
                       Local Models
```

## Database Schema

### Conversations Table

```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  archived INTEGER DEFAULT 0,
  pinned INTEGER DEFAULT 0,
  tags TEXT,
  metadata JSON
);
```

**Fields:**

- `id`: Unique identifier (UUID)
- `title`: User-friendly conversation name
- `created_at`: Unix timestamp
- `updated_at`: Last modified timestamp
- `model`: Model used (e.g., "gpt-4", "claude-opus")
- `provider`: Provider name ("openai", "anthropic", "ollama")
- `archived`: Boolean flag (0/1)
- `pinned`: Boolean flag (0/1)
- `tags`: Comma-separated tags for organization
- `metadata`: JSON with additional data

### Messages Table

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  tokens_used INTEGER,
  model TEXT,
  provider TEXT,
  error_message TEXT,
  metadata JSON,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
```

**Fields:**

- `id`: Unique message identifier (UUID)
- `conversation_id`: Reference to parent conversation
- `role`: "user" or "assistant"
- `content`: Message text
- `timestamp`: Unix timestamp
- `tokens_used`: Token count for billing tracking
- `model`: Model that generated this message
- `provider`: Provider used
- `error_message`: Error details if message failed
- `metadata`: JSON with additional data (e.g., images, citations)

### Settings Table

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  type TEXT,
  updated_at INTEGER
);
```

### Full-Text Search

```sql
CREATE VIRTUAL TABLE messages_fts USING fts5(
  content,
  content=messages,
  content_rowid=rowid
);
```

## Backend API

### Command Handler Pattern

All backend commands follow this Rust pattern:

```rust
#[tauri::command]
async fn your_command(
  app_handle: tauri::AppHandle,
  state: tauri::State<'_, AppState>,
  param1: String,
) -> Result<ResponseType, CommandError> {
  // Validate inputs
  // Perform operation
  // Return result or error
}
```

### Available Commands

#### Conversation Commands

```rust
// Create new conversation
create_conversation(title: String, model: String, provider: String) -> Conversation

// Get conversation details
get_conversation(id: String) -> Conversation

// List conversations
list_conversations(
  limit: u32,
  offset: u32,
  archived: Option<bool>
) -> Vec<Conversation>

// Update conversation
update_conversation(id: String, title: String, tags: Vec<String>) -> Conversation

// Delete conversation
delete_conversation(id: String) -> bool

// Archive conversation
archive_conversation(id: String, archived: bool) -> Conversation

// Pin conversation
pin_conversation(id: String, pinned: bool) -> Conversation
```

#### Message Commands

```rust
// Send message to AI
send_message(
  conversation_id: String,
  content: String,
  model: Option<String>,
  provider: Option<String>
) -> Message

// Get message
get_message(id: String) -> Message

// List messages
list_messages(conversation_id: String, limit: u32) -> Vec<Message>

// Delete message
delete_message(id: String) -> bool

// Regenerate message (try again)
regenerate_message(message_id: String) -> Message
```

#### Settings Commands

```rust
// Get setting
get_setting(key: String) -> String

// Set setting
set_setting(key: String, value: String) -> bool

// Get all settings
list_settings() -> HashMap<String, String>

// Reset to defaults
reset_settings() -> bool
```

#### AI Provider Commands

```rust
// List available models
list_models(provider: String) -> Vec<Model>

// Test provider connection
test_provider(provider: String) -> bool

// Download model (for local providers)
download_model(model: String) -> ProgressStream

// Get model info
get_model_info(model: String) -> ModelInfo
```

#### System Commands

```rust
// Window controls
window_toggle() -> bool
window_minimize() -> bool
window_maximize() -> bool
window_close() -> bool

// File operations
open_file_dialog(options: FileDialogOptions) -> Option<PathBuf>
save_file_dialog(options: FileDialogOptions) -> Option<PathBuf>

// System info
get_system_info() -> SystemInfo
```

## Frontend Components

### State Management (Zustand)

**Chat Store:**

```typescript
interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  error: Error | null;

  // Actions
  loadConversations: () => Promise<void>;
  createConversation: (title: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
}
```

**Settings Store:**

```typescript
interface SettingsState {
  providers: Map<string, ProviderConfig>;
  theme: "light" | "dark" | "auto";
  defaultProvider: string;
  defaultModel: string;

  // Actions
  loadSettings: () => Promise<void>;
  updateProvider: (name: string, config: ProviderConfig) => Promise<void>;
  updateTheme: (theme: string) => Promise<void>;
}
```

### React Components

**ChatInterface Component:**

```typescript
interface ChatInterfaceProps {
  conversationId?: string;
}

export function ChatInterface({ conversationId }: ChatInterfaceProps) {
  // Component implementation
}
```

**Settings Component:**

```typescript
interface SettingsProps {
  onClose?: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  // Component implementation
}
```

**Error Boundary:**

```typescript
export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  // Error boundary implementation
}
```

### Error Handling System

```typescript
class ErrorHandler {
  static categorizeError(error: Error, context: string): ErrorCategory;
  static getUserMessage(error: Error, category: ErrorCategory): string;
  static getRecoveryActions(error: Error): RecoveryAction[];
  static isCritical(error: Error, category: ErrorCategory): boolean;
}

function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  fallback?: T,
): Promise<T | null>;
```

## CLI Integration

### IPC Communication

The CLI tool communicates with the desktop app via IPC:

```typescript
// In frontend
const invoke = tauri.invoke;

// CLI sends commands via IPC
invoke("command_name", { param: value })
  .then((result) => console.log(result))
  .catch((error) => console.error(error));
```

### CLI Command Structure

```bash
# Basic command
lai <command> [options] [arguments]

# Examples
lai chat
lai "Your question here"
lai export <conversation-id> --format json
lai models list
lai settings get <key>
```

## Extension Development

### Plugin Architecture

(Future feature - planned for Phase 7)

### Extending the Backend

Add new commands in `src-tauri/src/commands/`:

```rust
// src-tauri/src/commands/custom.rs
#[tauri::command]
pub async fn my_custom_command(
  state: tauri::State<'_, AppState>,
  param: String,
) -> Result<String, String> {
  // Implementation
  Ok("Result".to_string())
}

// Register in src-tauri/src/main.rs
.invoke_handler(tauri::generate_handler![
  my_custom_command,
  // ... other commands
])
```

### Extending the Frontend

Create new React components in `src/components/`:

```typescript
// src/components/MyComponent.tsx
import { useChatStore } from '../lib/stores/chatStore';

export function MyComponent() {
  const { conversations } = useChatStore();

  return (
    <div>
      {/* Your component */}
    </div>
  );
}
```

## Building & Deployment

### Development Build

```bash
# Frontend development server
npm run dev

# Tauri development (full app)
npm run tauri dev
```

### Production Build

```bash
# Build for distribution
npm run build
npm run tauri build

# Output: src-tauri/target/release/bundle/
```

### Distribution Formats

- **AppImage**: `bundle/appimage/linux-ai-assistant_*.AppImage`
- **DEB**: `bundle/deb/linux-ai-assistant_*.deb`
- **RPM**: `bundle/rpm/linux-ai-assistant-*.rpm`

## Testing

### Frontend Testing

```bash
# Run tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Backend Testing

```bash
# Rust tests
cargo test

# With logging
RUST_LOG=debug cargo test
```

## Performance Optimization

### Frontend Optimization

1. **Code Splitting**: Large components loaded on-demand
2. **Lazy Loading**: Modal and settings loaded when needed
3. **Memoization**: Prevent unnecessary re-renders with React.memo
4. **Virtual Lists**: Large message lists use virtualization

### Backend Optimization

1. **Query Optimization**: Indexed database queries
2. **Caching**: In-memory caches for frequently accessed data
3. **Async Operations**: Non-blocking I/O operations
4. **Connection Pooling**: Reuse database connections

### Binary Size Optimization

```toml
# Cargo.toml optimizations
[profile.release]
lto = true
codegen-units = 1
strip = true
opt-level = "z"
```

## Security Considerations

### Input Validation

- All user inputs validated before processing
- SQL injection prevention via parameterized queries
- API key validation before storage

### API Key Management

- Never store keys in plaintext
- Use system keyring when available
- Clear keys from memory after use

### Code Execution Safety

- Sandboxed execution environment
- Resource limits enforced
- Audit trail for all executions

## Debugging

### Enable Debug Logging

```bash
# Frontend
export VITE_DEBUG=1
npm run dev

# Backend
export RUST_LOG=debug
npm run tauri dev
```

### View Logs

```bash
# Application logs
~/.config/linux-ai-assistant/logs/

# System logs
journalctl -u linux-ai-assistant

# CLI logs
export LAI_DEBUG=1
lai command
```

## Contributing

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/tbmobb813/Linux-AI-Assistant
cd Linux-AI-Assistant/linux-ai-assistant

# Install dependencies
npm install

# Setup Rust toolchain (if needed)
rustup update
```

### Making Changes

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and test
3. Run formatter and linter: `npm run format && npm run lint`
4. Run tests: `npm run test`
5. Commit with descriptive messages
6. Push and create pull request

### Code Style

- **TypeScript**: Use strict mode, proper typing
- **Rust**: Follow Rust conventions, use clippy
- **Formatting**: `prettier` for TypeScript, `rustfmt` for Rust

### Testing Requirements

- Unit tests for new functions
- Integration tests for commands
- Performance tests for critical paths
- Error handling tests

## API Reference

### Frontend API

See generated TypeScript types in `src/types/tauri.d.ts`

### Backend API

See Rust documentation:

```bash
cargo doc --open
```

## Resources

- [Tauri Documentation](https://tauri.app)
- [React Documentation](https://react.dev)
- [Zustand Documentation](https://zustand-demo.vercel.app)
- [Rust Book](https://doc.rust-lang.org/book)

---

**Version**: 1.0  
**Last Updated**: October 2025  
**Contributing**: See CONTRIBUTING.md
