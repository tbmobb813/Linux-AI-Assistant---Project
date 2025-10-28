# Linux AI Desktop Assistant - Project Documentation

[![CI](https://github.com/tbmobb813/Linux-AI-Assistant---Project/actions/workflows/ci.yml/badge.svg?branch=fix/move-tauri-backend)](https://github.com/tbmobb813/Linux-AI-Assistant---Project/actions/workflows/ci.yml)
[![CodeQL](https://github.com/tbmobb813/Linux-AI-Assistant---Project/actions/workflows/codeql.yml/badge.svg?branch=fix/move-tauri-backend)](https://github.com/tbmobb813/Linux-AI-Assistant---Project/actions/workflows/codeql.yml)
[![Codecov](https://codecov.io/gh/tbmobb813/Linux-AI-Assistant---Project/branch/main/graph/badge.svg)](https://codecov.io/gh/tbmobb813/Linux-AI-Assistant---Project)

## Project Overview

Mission Statement
Build a native Linux desktop AI assistant that provides first-class support for Linux users, addressing the platform neglect from major AI providers while delivering superior system integration, developer workflow optimization, and privacy-respecting architecture.

Core Value Propositions
Native Linux Experience: True desktop integration with system-level features
Multi-Model Support: Access GPT, Claude, Gemini, and local models from one interface
Developer-First Design: Deep integration with terminal, git, and development workflows
Privacy & Transparency: Clear data handling with local processing options
Performance Optimized: Resource-efficient native application, not a web wrapper
Technical Architecture
Primary Tech Stack Decision: Tauri
Rationale: Tauri chosen over Electron for the following reasons:

Smaller binary size (3-5MB vs 100MB+)
Lower memory footprint (uses system webview)
Better security model with Rust backend
Appeals to Linux user values (performance, efficiency)
Native performance for system integration
Core Technologies
Frontend Layer
Framework: React 18+

- Component-based architecture for chat interface
- Hooks for state management
- Suspense for async operations

Styling: Tailwind CSS 3+

- Utility-first approach
- Custom theming for Linux desktop integration
- Dark/Light mode support

UI Components: shadcn/ui

- Accessible, customizable components
- Radix UI primitives
- Designed for modern applications

State Management: Zustand

- Lightweight alternative to Redux
- Perfect for chat state, settings, conversations
- Built-in persistence middleware

## Important note

This repository's history was rewritten on 2025-10-23 to remove historical build artifacts and vendor files (for example: `node_modules/`, `linux-ai-assistant/dist/`, and Rust `target/` directories). Please see `docs/post-rewrite-notice.md` for details and re-clone instructions.

## Global Shortcut

The desktop application registers a system-wide keyboard shortcut (default: `CommandOrControl+Space`) to quickly invoke the assistant from anywhere. You can customize this shortcut in the app's Settings panel.

- **Default shortcut**: `CommandOrControl+Space` (Ctrl+Space on Linux, Cmd+Space on macOS)
- **How to change**: Open the app → click Settings (top-right or Ctrl+,) → edit "Global shortcut" → Save
- **Format examples**: `Ctrl+Shift+K`, `Super+Space`, `Alt+A`

The shortcut toggles the main window visibility, allowing you to invoke the assistant without leaving your current workflow.

## Multi-Provider AI Support

The assistant supports multiple AI providers with secure API key storage and easy switching:

- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo (with streaming support)
- **Anthropic**: Claude Opus, Claude Sonnet models
- **Google Gemini**: Gemini Pro and other models
- **Local Models**: Ollama integration ✅ **COMPLETED**

**Configuration**:

1. Open Settings → select your preferred provider from the dropdown
2. Enter your model name (e.g., `gpt-4`, `claude-sonnet-4.5`, `gemini-pro`)
3. Save your API key securely (stored in system keyring)
4. Start chatting with your chosen provider

API keys are stored securely using your system's keyring (GNOME Keyring, KWallet, etc.) and fall back to environment variables if needed.

## Project-Aware Context

The assistant automatically tracks file changes in your workspace and injects relevant context into conversations:

- **File Watcher**: Monitors your project for modifications, creations, and deletions
- **Smart Context**: Recent file changes (last 2 minutes, up to 8 files) are included in chat messages
- **Terminal Suggestions**: Click the "Suggest" button to get AI-powered shell command recommendations based on your last message and project context

This helps the AI provide more relevant, context-aware assistance for your specific project.

## Application Launcher Integration

A `.desktop` file is included at `linux-ai-assistant/linux-ai-assistant.desktop` for integration with your system's application launcher.

**Manual Installation:**

```bash
# Copy the .desktop file to your local applications directory
cp linux-ai-assistant/linux-ai-assistant.desktop ~/.local/share/applications/

# Update the Exec path to point to your built binary
# Edit ~/.local/share/applications/linux-ai-assistant.desktop and set:
# Exec=/path/to/your/linux-ai-assistant

# Optionally set an absolute icon path if needed
# Icon=/path/to/icon.png

# Update the desktop database
update-desktop-database ~/.local/share/applications/
```

After installation, the app will appear in your system's application menu and launcher.

Markdown Rendering: react-markdown + rehype plugins

- Code syntax highlighting with highlight.js
- Math rendering with KaTeX
- Mermaid diagram support
  Backend Layer (Rust)
  Framework: Tauri 2.0
- Window management
- System tray integration
- Global shortcuts
- File system access

HTTP Client: reqwest

- Async HTTP requests to AI APIs
- Connection pooling
- Timeout handling

Database: rusqlite

- SQLite integration
- Conversation history
- User preferences
- Cache management

Async Runtime: tokio

- Async/await for API calls
- Concurrent request handling
- Stream processing for real-time responses

Serialization: serde + serde_json

- JSON handling for API communication
- Configuration serialization
  System Integration
  Clipboard: arboard
- Cross-platform clipboard access
- Copy responses, paste context

Global Hotkeys: tauri-plugin-global-shortcut

- System-wide keyboard shortcuts
- Invoke assistant from anywhere

Notifications: tauri-plugin-notification

- Desktop notifications
- Response completion alerts

Keyring: keyring-rs

- Secure API key storage
- System keychain integration
  Project Structure
  linux-ai-assistant/
  ├── src/ # React frontend
  │ ├── components/
  │ │ ├── chat/
  │ │ │ ├── ChatInterface.tsx
  │ │ │ ├── MessageList.tsx
  │ │ │ ├── MessageInput.tsx
  │ │ │ └── StreamingMessage.tsx
  │ │ ├── settings/
  │ │ │ ├── SettingsPanel.tsx
  │ │ │ ├── ApiKeyManager.tsx
  │ │ │ └── ModelSelector.tsx
  │ │ ├── sidebar/
  │ │ │ ├── ConversationList.tsx
  │ │ │ └── ConversationItem.tsx
  │ │ └── common/
  │ │ ├── CodeBlock.tsx
  │ │ └── MarkdownRenderer.tsx
  │ ├── lib/
  │ │ ├── api/
  │ │ │ ├── types.ts
  │ │ │ └── tauri-commands.ts
  │ │ ├── stores/
  │ │ │ ├── chatStore.ts
  │ │ │ ├── settingsStore.ts
  │ │ │ └── conversationStore.ts
  │ │ └── utils/
  │ │ ├── markdown.ts
  │ │ └── formatting.ts
  │ ├── App.tsx
  │ ├── main.tsx
  │ └── styles/
  │ └── globals.css
  │
  ├── src-tauri/ # Rust backend
  │ ├── src/
  │ │ ├── main.rs
  │ │ ├── commands/ # Tauri commands
  │ │ │ ├── mod.rs
  │ │ │ ├── chat.rs
  │ │ │ ├── conversations.rs
  │ │ │ └── settings.rs
  │ │ ├── ai_providers/ # AI API integrations
  │ │ │ ├── mod.rs
  │ │ │ ├── openai.rs
  │ │ │ ├── anthropic.rs
  │ │ │ ├── gemini.rs
  │ │ │ └── ollama.rs
  │ │ ├── database/ # SQLite operations
  │ │ │ ├── mod.rs
  │ │ │ ├── schema.rs
  │ │ │ ├── conversations.rs
  │ │ │ └── migrations.rs
  │ │ ├── system/ # System integrations
  │ │ │ ├── mod.rs
  │ │ │ ├── clipboard.rs
  │ │ │ ├── hotkeys.rs
  │ │ │ └── tray.rs
  │ │ └── utils/
  │ │ ├── mod.rs
  │ │ ├── crypto.rs
  │ │ └── config.rs
  │ ├── Cargo.toml
  │ └── tauri.conf.json
  │
  ├── cli/ # Terminal companion tool
  │ ├── src/
  │ │ ├── main.rs
  │ │ ├── commands.rs
  │ │ └── ipc.rs
  │ └── Cargo.toml
  │
  ├── docs/
  │ ├── architecture.md
  │ ├── api-integration.md
  │ ├── user-guide.md
  │ └── development.md
  │

## Phase 5: Local AI & Privacy Features ✅

**Complete privacy-respecting local processing options delivered!**

### 🚀 **Ollama Integration**

- **Full Local AI Processing**: Run models like Llama, Mistral, CodeLlama locally
- **HTTP API Integration**: Seamless communication with local Ollama service
- **Model Management**: Browse, download, and manage local models
- **Progress Tracking**: Real-time download progress with native OS integration

### 🔄 **Hybrid Routing System**

- **Smart Provider Selection**: Automatically choose between local and cloud models
- **User Preferences**: Configure local-first or cloud-first routing
- **Availability Detection**: Automatically detect Ollama service status
- **Graceful Fallback**: Seamless fallback when preferred providers unavailable

### 🛡️ **Privacy Indicators**

- **Visual Cues**: Clear indicators showing local vs cloud processing
- **Provider Display**: Conversation-level provider and model information
- **Transparency**: Users always know where their data is processed

### 📤 **Enhanced Export/Import System**

- **Multiple Formats**: JSON (structured) and Markdown (readable) export
- **Individual Export**: Export single conversations with format selection
- **Bulk Export**: Export all conversations at once
- **Data Preservation**: Import maintains original IDs, timestamps, metadata
- **Native Dialogs**: OS-native file picker integration

### 🗂️ **Data Retention Controls**

- **Automatic Cleanup**: Configurable age and count-based retention policies
- **Manual Management**: One-click cleanup for immediate data removal
- **Smart Policies**: Balance between data retention and privacy
- **Safety Features**: Clear warnings and confirmation patterns

### 🔧 **Technical Implementation**

- **Tauri v2 Integration**: Updated to latest with proper plugin system
- **Rust Performance**: High-performance backend for file operations
- **Type Safety**: Full TypeScript integration with error handling
- **Settings Persistence**: All preferences saved and restored properly
- **Database Extensions**: Support for ID preservation during imports

### 📋 **User Experience**

- **Conversation List**: Export buttons (📄 JSON, 📝 Markdown) on each conversation
- **Settings Panel**: Comprehensive privacy and retention controls
- **Progress Feedback**: Real-time status updates for all operations
- **Error Handling**: Clear error messages and recovery guidance

  ├── package.json
  ├── tsconfig.json
  ├── tailwind.config.js
  └── README.md

Development Roadmap

Phase 1: Foundation (Weeks 1-3)
Goal: Basic application structure and chat interface

Milestones:

[x] Set up Tauri project with React frontend
[x] Implement basic window management and system tray
[x] Create chat interface UI components
[x] Set up SQLite database with schema
[x] Implement conversation storage and retrieval
[x] Basic settings panel for configuration
Deliverable: Functional desktop app with local conversation storage ✅

Nice-to-haves (Phase 1):

- Conversation search improvements: fuzzy search, filter by date/model
- Export conversations in multiple formats (JSON, Markdown, PDF)
- Conversation branching: fork conversations at any message
- Bulk conversation management: archive, tag, organize folders
- Database optimization: indexing, vacuum, query performance tuning

Phase 2: AI Integration (Weeks 4-6)
Goal: Connect to multiple AI providers

Milestones:

[x] Implement OpenAI API adapter with streaming support
[x] Add Anthropic Claude integration
[x] Add Google Gemini support
[x] Create provider abstraction layer
[x] Implement API key management with keyring storage
[x] Add model selection UI
[x] Error handling and retry logic
Deliverable: Working AI chat with multiple provider options ✅

Nice-to-haves (Phase 2):

- Streaming support for Anthropic and Gemini providers
- Token usage tracking and cost estimation per conversation
- Retry with different provider/model on failure
- Custom system prompts per conversation or provider
- Response quality feedback and model comparison tools

Phase 3: System Integration (Weeks 7-9)
Goal: Native Linux desktop features

Milestones:

[x] Global hotkey registration and handler
[x] Clipboard integration (copy responses, paste context)
[x] Desktop notifications for completed responses
[x] System tray menu with quick actions
[x] Theme integration (detect system theme)
[x] App launcher integration (.desktop file)
Deliverable: Truly native Linux desktop experience ✅

Nice-to-haves (Phase 3):

- Multiple configurable global shortcuts for different actions
- Customizable system tray menu with user-defined actions
- Notification preferences: sound, position, duration, do-not-disturb
- Window position memory: restore last size/position on launch
- Multi-monitor support: remember which display to show on

Phase 4: Developer Features (Weeks 10-12)
Goal: Workflow optimization for developers

Milestones:

[x] CLI companion tool with IPC communication
[x] File system watcher for project context
[x] Git integration (detect repo, branch, changes)
[x] Code block enhancements (copy, run, save)
[x] Terminal command suggestions with AI-powered generation
[x] Project-aware context injection (recent file changes)
Deliverable: Developer-optimized workflow integration ✅

Nice-to-haves (Phase 4):

- CLI: implement `lai last` to print the latest assistant reply.
- CLI: distribution packaging and install instructions.
- Watcher: tray toggle and ignore patterns; debounce noisy events.
- Project context panel: surface recent changes and summaries in chat UI.
- Execution hardening: runner profiles, resource limits, and optional sandboxing.
- Integration tests: end-to-end checks for IPC events and watcher signals.

Phase 5: Local AI & Privacy (Weeks 13-15) ✅ **COMPLETED**
Goal: Privacy-respecting local processing options

Milestones:

[x] Ollama integration for local models ✅
[x] Model download and management UI ✅
[x] Hybrid routing (local vs cloud) ✅
[x] Privacy indicators (local/cloud visual cues) ✅
[x] Conversation export/import ✅
[x] Data retention controls ✅

**Enhanced Features Delivered:**

- Individual conversation export (JSON/Markdown formats)
- Smart hybrid routing with user preferences
- Comprehensive data retention policies
- Native file dialog integration
- Settings persistence and validation

Deliverable: Complete privacy control for users ✅

Phase 6: Polish & Distribution (Weeks 16-18)
Goal: Production-ready application

Milestones:

[ ] Performance optimization and profiling
[ ] Comprehensive error handling
[ ] User documentation and help system
[ ] Package for Snap, Flatpak, AppImage
[ ] Create DEB and RPM packages
[ ] Set up automatic updates
[ ] Beta testing with Linux community
Deliverable: Distributable packages on multiple channels

Technical Specifications
Database Schema
-- Conversations table
CREATE TABLE conversations (
id TEXT PRIMARY KEY,
title TEXT NOT NULL,
created_at INTEGER NOT NULL,
updated_at INTEGER NOT NULL,
model TEXT NOT NULL,
provider TEXT NOT NULL
);

-- Messages table
CREATE TABLE messages (
id TEXT PRIMARY KEY,
conversation_id TEXT NOT NULL,
role TEXT NOT NULL, -- 'user' or 'assistant'
content TEXT NOT NULL,
timestamp INTEGER NOT NULL,
tokens_used INTEGER,
FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- Settings table
CREATE TABLE settings (
key TEXT PRIMARY KEY,
value TEXT NOT NULL
);

-- Full-text search
CREATE VIRTUAL TABLE messages_fts USING fts5(
content,
content=messages,
content_rowid=rowid
);
API Provider Interface
Configuration File Format

# ~/.config/linux-ai-assistant/config.toml

[general]
theme = "system" # system, dark, light
default_provider = "openai"
default_model = "gpt-4"

[hotkeys]
global_invoke = "Super+Space"
quick_capture = "Super+Shift+Space"

[privacy]
local_processing = false
store_conversations = true
analytics_enabled = false

[providers.openai]
enabled = true
models = ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"]

[providers.anthropic]
enabled = true
models = ["claude-sonnet-4.5", "claude-opus-4"]

[providers.ollama]
enabled = false
endpoint = "<http://localhost:11434>"
Key Features & Requirements

**Must Have (MVP) ✅ COMPLETED**
✅ Multi-provider AI chat (OpenAI, Anthropic, Gemini)
✅ Conversation history with search
✅ Markdown rendering with code syntax highlighting
✅ Global keyboard shortcut
✅ System tray integration
✅ Secure API key storage
✅ Dark/Light theme support
✅ Export conversations

**Should Have (V1.0) ✅ COMPLETED**
✅ CLI companion tool
✅ Local model support via Ollama
✅ Clipboard integration
✅ Git awareness
✅ File attachment support
✅ Custom system prompts
✅ Conversation branching
✅ **NEW: Hybrid routing (local/cloud)**
✅ **NEW: Privacy indicators**
✅ **NEW: Individual conversation export**
✅ **NEW: Data retention controls**

**Nice to Have (Future) 🚧 PHASE 6+**
💡 End-to-end encrypted sync
💡 Voice input/output
💡 Image generation integration
💡 Plugin system
💡 Team/workspace features
💡 Integration with VS Code
💡 Screen capture for context
Success Metrics
Technical Metrics
Application startup time < 2 seconds
Memory usage < 200MB idle
Response streaming latency < 100ms
Database query time < 50ms
Binary size < 15MB
User Experience Metrics
Time to first message < 10 seconds (including setup)
Keyboard-only workflow support
Hotkey response time < 200ms
Search results returned < 500ms
Community Metrics
GitHub stars (target: 1000+ in first 6 months)
Active users (target: 5000+ in first year)
Package downloads across all channels
Community contributions (PRs, issues)
Development Setup
Prerequisites

# Install Rust

curl --proto '=https' --tlsv1.2 -sSf <https://sh.rustup.rs> | sh

# Install Node.js (via nvm recommended)

curl -o- <https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh> | bash
nvm install --lts

# Install Tauri CLI

cargo install tauri-cli

# Install system dependencies (Ubuntu/Debian)

sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
 build-essential \
 curl \
 wget \
 file \
 libssl-dev \
 libgtk-3-dev \
 libayatana-appindicator3-dev \
 librsvg2-dev
Initial Project Setup

# Create new Tauri project

npm create tauri-app@latest

# Install frontend dependencies

npm install react react-dom
npm install -D @types/react @types/react-dom
npm install zustand
npm install react-markdown rehype-highlight rehype-katex
npm install tailwindcss postcss autoprefixer
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu

# Add Tauri plugins

## Developer environment: pnpm (recommended)

This repository now uses pnpm as the workspace package manager (via Corepack) for faster, more
deterministic installs and smaller disk usage. If you're contributing, please use Corepack or
install pnpm locally.

Using Corepack (recommended):

```bash
corepack enable
corepack prepare pnpm@10.19.0 --activate
pnpm -w install
```

Or install pnpm directly:

```bash
npm i -g pnpm
pnpm -w install
```

Common pnpm commands

- Install workspace deps: `pnpm -w install`
- Run frontend tests: `pnpm -w -C linux-ai-assistant test`
- Run frontend dev: `pnpm -w -C linux-ai-assistant dev`

## Dev run workaround for Snap / system-library issues

On some systems (notably when running inside Snap-wrapped environments), native Tauri
dev builds can fail at runtime with a GLIBC symbol lookup error referencing
`libpthread.so.0` (for example: `__libc_pthread_init, version GLIBC_PRIVATE`). If
you see that error when running `pnpm -w -C linux-ai-assistant run tauri -- dev`,
you can use the included wrapper script which attempts a safe LD_PRELOAD override:

```bash
# from repo root
chmod +x dev/tauri-dev.sh
dev/tauri-dev.sh
```

The wrapper locates a system `libpthread.so.0` (common paths like
`/lib/x86_64-linux-gnu/libpthread.so.0`) and sets `LD_PRELOAD` before launching
the workspace `tauri dev` process. If you prefer to run without the preload,
use:

```bash
dev/tauri-dev.sh --no-preload
```

Prefer opening this repository in the provided devcontainer for a reproducible
developer environment that avoids host packaging quirks.

CI/Devcontainer

The devcontainer and CI are configured to use Corepack and pin pnpm `10.19.0`. If you need a
different pnpm version, update the Corepack prepare invocation in `.devcontainer/devcontainer.json`
and `.github/workflows/ci.yml`.

cargo add tauri-plugin-notification
cargo add tauri-plugin-global-shortcut
cargo add keyring
cargo add rusqlite
cargo add reqwest --features json,stream
cargo add tokio --features full
cargo add serde --features derive
cargo add serde_json
Contributing Guidelines
Code Standards
Rust: Follow Rust API guidelines, use clippy
TypeScript: Strict mode enabled, ESLint + Prettier
Commits: Conventional commits format
Testing: Unit tests for all business logic
Pull Request Process
Fork and create feature branch
Write tests for new functionality
Update documentation
Ensure all tests pass
Submit PR with clear description
License Considerations
Recommended: MIT or Apache 2.0

Permissive for community adoption
Compatible with commercial use
Encourages contributions
Marketing & Distribution Strategy
Launch Channels
Reddit: r/linux, r/opensource, r/programming
Hacker News: Show HN post
Linux Forums: Ubuntu forums, Arch forums
YouTube: Demo video and tutorial
Blog Post: Technical deep-dive on architecture
Key Messaging
"First-class AI assistant built specifically for Linux"
"Privacy-respecting with local model support"
"Developer-optimized with terminal integration"
"Multi-model support in one native app"
Risk Mitigation
Technical Risks
API Changes: Abstract providers behind interfaces
Platform Fragmentation: Test on multiple distros
Performance Issues: Profile early and often
Security Vulnerabilities: Regular dependency audits
Market Risks
Official Linux Apps: Position as enhanced alternative
Competition: Focus on unique Linux-specific features
Sustainability: Consider freemium or sponsorship model
Next Steps
Immediate (This Week):

Set up development environment
Initialize Tauri project with React
Create basic project structure
Set up version control and GitHub repo
Short-term (This Month):

Implement Phase 1 milestones
Get basic chat interface working
Set up database layer
Create initial documentation
Medium-term (Next 3 Months):

Complete Phases 2-4
Beta test with small group
Gather feedback and iterate
Prepare for public launch
Long-term (6+ Months):

Build community
Add advanced features
Explore sustainability model
Expand platform support
