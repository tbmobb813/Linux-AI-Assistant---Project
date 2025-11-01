# Linux-Centric Enhancements Implementation Plan

## 🎯 Overview

Building on our solid foundation of 6 completed quick wins and optimized performance, this document outlines a comprehensive plan for implementing Linux-centric enhancements that will establish the Linux AI Assistant as the premier privacy-first, developer-focused AI tool for Linux.

## 🏗️ Current Architecture Foundation

### ✅ Strong Foundation Already In Place

**Database Layer**: SQLite with FTS5 support, robust schema with conversations, messages, and settings tables  
**CLI Integration**: TCP-based IPC communication (port 39871) with comprehensive command structure  
**File Watcher**: Real-time file monitoring with ignore pattern support using `ignore` crate  
**Settings System**: Zustand-powered state management with modal-based UI components  
**Performance**: Optimized bundle splitting, React.memo, lazy loading, and proper cleanup  
**Window Management**: Position saving/restoring with Tauri integration

### 🚀 Enhancement Opportunities

Our existing architecture provides excellent extension points for implementing advanced Linux-first features while maintaining the privacy-respecting, on-device approach.

---

## 📖 Feature 1: Deep File and Document Integration

### 🎯 Goal

Transform the assistant into a comprehensive document intelligence system that can index, search, and summarize local files without sending data to external services.

### 🔧 Technical Design

#### Database Schema Extensions

```sql
-- Document indexing table
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    modified_at INTEGER NOT NULL,
    indexed_at INTEGER NOT NULL,
    content_hash TEXT NOT NULL,
    metadata TEXT -- JSON: {language, encoding, author, etc}
);

-- Full-text search for document content
CREATE VIRTUAL TABLE documents_fts
USING fts5(content, path, filename, tags, tokenize='porter');

-- Document chunks for large files
CREATE TABLE document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    tokens INTEGER NOT NULL,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- File type metadata
CREATE TABLE file_types (
    extension TEXT PRIMARY KEY,
    parser TEXT NOT NULL,
    indexable INTEGER NOT NULL DEFAULT 1,
    preview_supported INTEGER NOT NULL DEFAULT 0
);
```

#### Rust Backend Components

```rust
// src-tauri/src/commands/documents.rs
#[tauri::command]
pub async fn index_documents(path: String, recursive: bool) -> Result<IndexStats, String>

#[tauri::command]
pub async fn search_documents(query: String, filters: DocumentFilters) -> Result<Vec<DocumentMatch>, String>

#[tauri::command]
pub async fn get_document_summary(doc_id: String) -> Result<DocumentSummary, String>

#[tauri::command]
pub async fn extract_text_content(path: String) -> Result<ExtractedContent, String>

// src-tauri/src/parsers/
// - pdf.rs (using lopdf or pdf-extract)
// - code.rs (syntax-aware parsing)
// - text.rs (plaintext with encoding detection)
// - office.rs (docx, odt using zip parsing)
// - markdown.rs (enhanced markdown parsing)
```

#### Frontend Components

```tsx
// src/components/DocumentSearch.tsx
interface DocumentSearchProps {
  onDocumentSelect: (doc: Document) => void;
  integrationMode?: boolean; // For chat integration
}

// src/components/DocumentIndexer.tsx
interface DocumentIndexerProps {
  onIndexComplete: (stats: IndexStats) => void;
}

// src/components/DocumentPreview.tsx
interface DocumentPreviewProps {
  document: Document;
  highlightTerms?: string[];
}
```

#### Integration with Chat System

```typescript
// Enhanced chat context injection
interface ChatContext {
  recentFiles: FileChange[];
  relevantDocuments: DocumentMatch[]; // NEW
  searchResults?: DocumentMatch[]; // NEW
}

// Chat commands
/docs search "React hooks"
/docs index ./project
/docs summarize ./README.md
```

### 📁 File Type Support Priority

**Phase 1 (High Priority)**:

- `.md`, `.txt`, `.rst` - Documentation and notes
- `.py`, `.js`, `.ts`, `.rs`, `.go`, `.c`, `.cpp` - Source code
- `.json`, `.yaml`, `.toml`, `.xml` - Configuration files
- `.pdf` - Documentation and papers

**Phase 2 (Medium Priority)**:

- `.docx`, `.odt` - Office documents
- `.html`, `.css` - Web files
- `.sql` - Database scripts
- `.log` - Log files with structured parsing

**Phase 3 (Nice to Have)**:

- `.epub` - E-books
- `.csv`, `.tsv` - Data files
- Image text extraction (OCR)

---

## 🖥️ Feature 2: Command Virtualization and Terminal Context

### 🎯 Goal

Create an intelligent terminal integration that can capture command output, analyze errors, and provide contextual suggestions while maintaining security through sandboxing.

### 🔧 Technical Design

#### Enhanced CLI Commands

```rust
// Extend existing CLI with new commands
lai capture "npm test" --analyze  # Run and analyze output
lai suggest --context ./error.log # Suggest solutions for errors
lai history --filter "git"        # Search command history
lai sandbox "rm -rf /"           # Validate dangerous commands
```

#### Terminal Context System

```rust
// src-tauri/src/commands/terminal.rs
#[tauri::command]
pub async fn capture_command_output(
    command: String,
    working_dir: String,
    timeout: u64
) -> Result<CommandResult, String>

#[tauri::command]
pub async fn analyze_terminal_output(
    output: String,
    command: String,
    context: Option<ProjectContext>
) -> Result<AnalysisResult, String>

#[tauri::command]
pub async fn validate_command_safety(command: String) -> Result<SafetyReport, String>

#[tauri::command]
pub async fn get_command_suggestions(
    error_output: String,
    command_history: Vec<String>
) -> Result<Vec<CommandSuggestion>, String>
```

#### Database Schema for Command History

```sql
CREATE TABLE command_history (
    id TEXT PRIMARY KEY,
    command TEXT NOT NULL,
    working_dir TEXT NOT NULL,
    exit_code INTEGER NOT NULL,
    stdout TEXT,
    stderr TEXT,
    duration_ms INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    project_path TEXT,
    tags TEXT -- JSON array of detected categories
);

CREATE INDEX idx_command_history_timestamp ON command_history(timestamp DESC);
CREATE INDEX idx_command_history_project ON command_history(project_path);
```

#### Security Sandboxing

```rust
// src-tauri/src/sandbox/
// - validator.rs (command safety analysis)
// - jail.rs (restricted execution environment)
// - patterns.rs (dangerous command patterns)

pub struct CommandValidator {
    dangerous_patterns: Vec<Regex>,
    safe_commands: HashSet<String>,
    restricted_paths: Vec<PathBuf>,
}

impl CommandValidator {
    pub fn analyze_command(&self, cmd: &str) -> SafetyLevel {
        // SAFE: read-only operations, info commands
        // CAUTIOUS: write operations in safe locations
        // DANGEROUS: system modifications, deletions
        // FORBIDDEN: malicious patterns
    }
}
```

#### Frontend Integration

```tsx
// src/components/TerminalIntegration.tsx
interface TerminalIntegrationProps {
  onCommandSuggestion: (suggestion: CommandSuggestion) => void;
}

// Enhanced command suggestions modal
interface CommandSuggestionsModalProps {
  context: TerminalContext; // NEW: includes command history and output
  errorAnalysis?: ErrorAnalysis; // NEW: parsed error information
}
```

### 🔄 Workflow Integration

1. **Passive Monitoring**: Watch terminal sessions for errors (via log tailing)
2. **Active Capture**: CLI command to capture and analyze specific commands
3. **Error Analysis**: Automatic parsing of common error patterns (compiler errors, test failures, package manager issues)
4. **Contextual Suggestions**: AI-powered suggestions based on project context and error patterns
5. **Command Validation**: Safety checking before execution of suggested commands

---

## 🎨 Feature 3: Rich Chat Editing and Formatting

### 🎯 Goal

Transform the chat interface into a powerful editing environment with advanced formatting, code handling, and export capabilities.

### 🔧 Technical Design

#### Enhanced Message Editing

```tsx
// src/components/MessageEditor.tsx
interface MessageEditorProps {
  message: Message;
  onSave: (content: string) => void;
  onCancel: () => void;
  syntax?: string; // For code block editing
}

// In-place editing with syntax highlighting
const MessageEditor = ({ message, onSave, onCancel, syntax }) => {
  const [content, setContent] = useState(message.content);
  const [isPreview, setIsPreview] = useState(false);

  return (
    <div className="message-editor">
      {isPreview ? (
        <MarkdownContent content={content} />
      ) : (
        <CodeEditor
          value={content}
          language={syntax || "markdown"}
          onChange={setContent}
        />
      )}
      {/* Editor controls */}
    </div>
  );
};
```

#### Advanced Code Block Handling

```tsx
// Enhanced code blocks with advanced features
interface CodeBlockProps {
  code: string;
  language: string;
  filename?: string;
  editable?: boolean;
  onSave?: (code: string) => void;
}

const CodeBlock = ({ code, language, filename, editable, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localCode, setLocalCode] = useState(code);

  return (
    <div className="code-block-enhanced">
      <div className="code-header">
        <span className="language-badge">{language}</span>
        {filename && <span className="filename">{filename}</span>}
        <div className="code-actions">
          <button onClick={() => copyToClipboard(code)}>Copy</button>
          <button onClick={() => saveToFile(code, filename)}>Save</button>
          <button onClick={() => executeCode(code, language)}>Run</button>
          {editable && (
            <button onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? "View" : "Edit"}
            </button>
          )}
        </div>
      </div>
      {isEditing ? (
        <CodeEditor
          value={localCode}
          language={language}
          onChange={setLocalCode}
          onSave={onSave}
        />
      ) : (
        <SyntaxHighlighter language={language} code={code} />
      )}
    </div>
  );
};
```

#### Slash Commands System

```typescript
// src/lib/slashCommands.ts
interface SlashCommand {
  command: string;
  description: string;
  parameters?: Parameter[];
  handler: (args: string[], context: ChatContext) => Promise<void>;
}

const slashCommands: SlashCommand[] = [
  {
    command: "export",
    description: "Export conversation in various formats",
    parameters: [
      {
        name: "format",
        type: "enum",
        values: ["json", "markdown", "pdf", "html"],
      },
      { name: "filename", type: "string", optional: true },
    ],
    handler: handleExportCommand,
  },
  {
    command: "docs",
    description: "Search or index documents",
    parameters: [
      {
        name: "action",
        type: "enum",
        values: ["search", "index", "summarize"],
      },
      { name: "query", type: "string" },
    ],
    handler: handleDocsCommand,
  },
  {
    command: "profile",
    description: "Switch conversation profile",
    parameters: [{ name: "name", type: "string" }],
    handler: handleProfileCommand,
  },
  {
    command: "terminal",
    description: "Terminal integration commands",
    parameters: [
      {
        name: "action",
        type: "enum",
        values: ["capture", "suggest", "history"],
      },
      { name: "command", type: "string", optional: true },
    ],
    handler: handleTerminalCommand,
  },
];
```

#### Chat Export System

```rust
// src-tauri/src/commands/export.rs (extend existing)
#[tauri::command]
pub async fn export_conversation_enhanced(
    conversation_id: String,
    format: ExportFormat,
    options: ExportOptions
) -> Result<ExportResult, String>

pub enum ExportFormat {
    Markdown { include_metadata: bool },
    Html { theme: String, standalone: bool },
    Pdf { template: String, include_code: bool },
    Json { pretty: bool, include_system: bool },
}

pub struct ExportOptions {
    pub filename: Option<String>,
    pub include_timestamps: bool,
    pub filter_roles: Vec<String>,
    pub code_theme: String,
}
```

#### Native Notifications Enhancement

```rust
// src-tauri/src/system/notifications.rs
use notify_rust::{Notification, Urgency};

#[tauri::command]
pub async fn send_system_notification(
    title: String,
    message: String,
    urgency: NotificationUrgency,
    actions: Vec<NotificationAction>
) -> Result<(), String>

pub struct NotificationAction {
    pub id: String,
    pub label: String,
    pub command: Option<String>, // Command to run when clicked
}
```

---

## 👤 Feature 4: Profiles and Long-term Memory

### 🎯 Goal

Implement per-project profiles with local embeddings storage for context-aware conversations that remember previous interactions without cloud dependencies.

### 🔧 Technical Design

#### Database Schema for Profiles

```sql
CREATE TABLE profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    project_path TEXT,
    default_model TEXT NOT NULL,
    default_provider TEXT NOT NULL,
    system_prompt TEXT,
    settings TEXT, -- JSON: model params, behavior settings
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE profile_embeddings (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding BLOB NOT NULL, -- Vector embeddings
    context_type TEXT NOT NULL, -- 'conversation', 'document', 'code'
    source_id TEXT, -- Reference to conversation_id or document_id
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE profile_memory (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    memory_type TEXT NOT NULL, -- 'fact', 'preference', 'workflow'
    content TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 1.0,
    created_at INTEGER NOT NULL,
    last_accessed INTEGER NOT NULL,
    access_count INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);
```

#### Local Embeddings System

```rust
// src-tauri/src/embeddings/
// - generator.rs (local embedding generation)
// - storage.rs (vector storage and retrieval)
// - similarity.rs (cosine similarity calculations)

use candle_core::{Device, Tensor};
use candle_nn::VarBuilder;
use candle_transformers::models::bert::BertModel;

pub struct LocalEmbeddingsEngine {
    model: BertModel,
    tokenizer: Tokenizer,
    device: Device,
}

impl LocalEmbeddingsEngine {
    pub async fn generate_embedding(&self, text: &str) -> Result<Vec<f32>, EmbeddingError> {
        // Use local BERT model for privacy-preserving embeddings
    }

    pub async fn find_similar(&self, query_embedding: &[f32], limit: usize) -> Result<Vec<SimilarityMatch>, EmbeddingError> {
        // Cosine similarity search in local vector store
    }
}

#[tauri::command]
pub async fn generate_local_embedding(text: String, profile_id: String) -> Result<String, String>

#[tauri::command]
pub async fn search_similar_content(
    query: String,
    profile_id: String,
    limit: usize
) -> Result<Vec<SimilarityMatch>, String>
```

#### Profile Management UI

```tsx
// src/components/ProfileManager.tsx
interface ProfileManagerProps {
  currentProfile?: Profile;
  onProfileSwitch: (profile: Profile) => void;
}

// src/components/ProfileSettings.tsx
interface ProfileSettingsProps {
  profile: Profile;
  onSave: (profile: Profile) => void;
}

// Profile-aware chat context
interface ProfileContext {
  profile: Profile;
  relevantMemories: Memory[];
  similarConversations: Conversation[];
  projectContext: ProjectInfo;
}
```

#### Memory Formation and Retrieval

```typescript
// src/lib/memory/memoryEngine.ts
export class MemoryEngine {
  async formMemory(
    conversation: Conversation,
    profile: Profile,
  ): Promise<Memory[]> {
    // Extract key facts, preferences, and patterns from conversation
  }

  async retrieveRelevantMemories(
    query: string,
    profile: Profile,
  ): Promise<Memory[]> {
    // Use embeddings to find contextually relevant memories
  }

  async updateMemoryConfidence(
    memoryId: string,
    feedback: Feedback,
  ): Promise<void> {
    // Adjust memory confidence based on user interactions
  }
}
```

---

## 🎤 Feature 5: Voice Input and Offline Speech Recognition

### 🎯 Goal

Implement privacy-preserving voice interaction using offline speech recognition and text-to-speech, keeping all audio processing on-device.

### 🔧 Technical Design

#### Speech Recognition Integration

```rust
// Cargo.toml additions
[dependencies]
vosk = "0.3"
cpal = "0.15" # Audio input/output
hound = "3.5" # WAV file handling
rodio = "0.17" # Audio playback

// src-tauri/src/audio/
// - capture.rs (microphone input)
// - recognition.rs (Vosk integration)
// - synthesis.rs (Text-to-speech)
// - models.rs (Model management)

use vosk::{Model, Recognizer};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};

pub struct SpeechRecognizer {
    model: Model,
    recognizer: Recognizer,
    audio_stream: Option<cpal::Stream>,
}

#[tauri::command]
pub async fn start_voice_recognition(
    language: String,
    continuous: bool
) -> Result<String, String>

#[tauri::command]
pub async fn stop_voice_recognition() -> Result<(), String>

#[tauri::command]
pub async fn synthesize_speech(
    text: String,
    voice: String,
    rate: f32
) -> Result<(), String>

#[tauri::command]
pub async fn get_available_voices() -> Result<Vec<VoiceInfo>, String>
```

#### Audio Models Management

```rust
// Download and manage Vosk models locally
pub struct ModelManager {
    models_dir: PathBuf,
    available_models: HashMap<String, ModelInfo>,
}

impl ModelManager {
    pub async fn download_model(&self, language: &str) -> Result<PathBuf, ModelError> {
        // Download lightweight models (~50MB) for common languages
    }

    pub fn get_installed_models(&self) -> Vec<ModelInfo> {
        // List locally available models
    }
}

// Small models for privacy and performance:
// - vosk-model-small-en-us-0.15 (~40MB)
// - vosk-model-small-de-0.15 (~40MB)
// - vosk-model-small-fr-0.22 (~41MB)
```

#### Frontend Voice Interface

```tsx
// src/components/VoiceInterface.tsx
interface VoiceInterfaceProps {
  onTranscription: (text: string) => void;
  onError: (error: string) => void;
}

const VoiceInterface = ({ onTranscription, onError }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [confidence, setConfidence] = useState(0);

  return (
    <div className="voice-interface">
      <button
        className={`voice-button ${isListening ? "listening" : ""}`}
        onClick={toggleListening}
      >
        <Mic className={isListening ? "text-red-500" : "text-gray-500"} />
      </button>

      {isListening && (
        <div className="transcription-display">
          <div className="confidence-meter">
            <div
              className="confidence-bar"
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
          <div className="live-transcription">{transcription}</div>
        </div>
      )}
    </div>
  );
};
```

#### Voice Commands and Shortcuts

```typescript
// Voice-activated shortcuts
const voiceCommands = {
  "new conversation": () => startNewConversation(),
  "export chat": () => showExportDialog(),
  "switch profile": (profileName: string) => switchProfile(profileName),
  "search documents": (query: string) => searchDocuments(query),
  "terminal capture": (command: string) => captureTerminalCommand(command),
  "read last message": () => readAloud(getLastMessage()),
};
```

#### Text-to-Speech Integration

```rust
// Using system TTS or embedded engine
use tts::Tts;

pub struct TTSEngine {
    tts: Tts,
    voice_settings: VoiceSettings,
}

impl TTSEngine {
    pub async fn speak(&self, text: &str) -> Result<(), TTSError> {
        // Convert text to speech with configured voice
    }

    pub async fn speak_markdown(&self, markdown: &str) -> Result<(), TTSError> {
        // Parse markdown and speak with appropriate formatting
        // - Code blocks: "Code block in Python: ..."
        // - Lists: "First item: ..., Second item: ..."
        // - Headers: "Section: ..."
    }
}
```

---

## ⌨️ Feature 6: Enhanced Hotkey and System Integration

### 🎯 Goal

Create seamless desktop integration with global shortcuts, system tray, VS Code integration, and context menu commands for maximum workflow efficiency.

### 🔧 Technical Design

#### System Tray Integration

```rust
// src-tauri/src/system/tray.rs
use tauri::{CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayEvent};

pub fn create_system_tray() -> SystemTray {
    let new_conversation = CustomMenuItem::new("new_conversation", "New Conversation");
    let show_hide = CustomMenuItem::new("show_hide", "Show/Hide");
    let voice_mode = CustomMenuItem::new("voice_mode", "Voice Mode");
    let quick_capture = CustomMenuItem::new("quick_capture", "Quick Capture");
    let separator = CustomMenuItem::new("separator", "").disabled();
    let quit = CustomMenuItem::new("quit", "Quit");

    let tray_menu = SystemTrayMenu::new()
        .add_item(new_conversation)
        .add_item(show_hide)
        .add_item(voice_mode)
        .add_item(quick_capture)
        .add_native_item(separator)
        .add_item(quit);

    SystemTray::new().with_menu(tray_menu)
}

#[tauri::command]
pub async fn update_tray_menu(items: Vec<TrayMenuItem>) -> Result<(), String>
```

#### Advanced Global Shortcuts

```rust
// Extend existing shortcut system
use global_hotkey::{GlobalHotKeyManager, GlobalHotKeyEvent};

pub struct AdvancedShortcutManager {
    manager: GlobalHotKeyManager,
    shortcuts: HashMap<String, ShortcutAction>,
}

pub enum ShortcutAction {
    ShowHide,
    NewConversation,
    QuickCapture { text_source: TextSource },
    VoiceMode { action: VoiceAction },
    DocumentSearch { query: Option<String> },
    TerminalCapture,
    ProfileSwitch { profile_name: String },
}

pub enum TextSource {
    Clipboard,
    Selection,
    ScreenOCR, // Future enhancement
}

#[tauri::command]
pub async fn register_context_shortcut(
    shortcut: String,
    action: ShortcutAction
) -> Result<(), String>
```

#### VS Code Integration

```typescript
// Create VS Code extension that communicates with the assistant
// vscode-extension/src/extension.ts

export function activate(context: vscode.ExtensionContext) {
  // Register commands
  const askAssistant = vscode.commands.registerCommand(
    "linuxai.askAssistant",
    async () => {
      const selection = vscode.window.activeTextEditor?.selection;
      const text = vscode.window.activeTextEditor?.document.getText(selection);

      if (text) {
        await sendToAssistant("ask", { context: text, file: getCurrentFile() });
      }
    },
  );

  const explainCode = vscode.commands.registerCommand(
    "linuxai.explainCode",
    async () => {
      const selection = getSelectedCode();
      await sendToAssistant("explain", { code: selection });
    },
  );

  const generateTests = vscode.commands.registerCommand(
    "linuxai.generateTests",
    async () => {
      const currentFile = getCurrentFile();
      await sendToAssistant("generateTests", { file: currentFile });
    },
  );
}

async function sendToAssistant(action: string, data: any) {
  // Communicate with assistant via IPC or TCP
  const response = await fetch("http://localhost:39871/vscode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
}
```

#### Context Menu Integration

```rust
// src-tauri/src/system/context_menu.rs
// Register context menu items for file managers

#[cfg(target_os = "linux")]
pub fn install_context_menu_entries() -> Result<(), String> {
    // Create .desktop files for context menu integration
    let desktop_entry = r#"
[Desktop Entry]
Type=Action
Icon=linux-ai-assistant
Name[en_US]=Ask AI Assistant
Profiles=profile-zero;

[X-Action-Profile profile-zero]
Exec=lai ask "Explain this file: %f"
MimeType=text/*;application/*;
"#;

    // Install to ~/.local/share/kservices5/ServiceMenus/
    install_desktop_file("linux-ai-assistant-ask.desktop", desktop_entry)?;

    Ok(())
}
```

#### Quick Capture System

```tsx
// src/components/QuickCapture.tsx
interface QuickCaptureProps {
  initialText?: string;
  mode: "ask" | "explain" | "improve" | "translate";
}

const QuickCapture = ({ initialText, mode }) => {
  const [text, setText] = useState(initialText || "");
  const [context, setContext] = useState<CaptureContext>({
    source: "manual",
    timestamp: Date.now(),
    application: null,
  });

  useEffect(() => {
    // Auto-detect source application and context
    detectSourceContext().then(setContext);
  }, []);

  return (
    <div className="quick-capture-modal">
      <div className="capture-header">
        <h3>Quick {mode}</h3>
        <div className="context-info">
          {context.application && <span>From: {context.application}</span>}
        </div>
      </div>

      <TextArea
        value={text}
        onChange={setText}
        placeholder={`Text to ${mode}...`}
        className="capture-input"
      />

      <div className="capture-actions">
        <button onClick={() => processCapture(text, mode, context)}>
          {mode}
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};
```

---

## 📋 Implementation Roadmap

### Phase 1: Foundation Extensions (Weeks 1-4)

**Priority**: High
**Goal**: Extend existing systems with essential Linux-first features

**Week 1-2: Document Integration Foundation**

- [ ] Extend database schema for document indexing
- [ ] Implement basic PDF and text file parsing
- [ ] Create document search integration with chat interface
- [ ] Add `/docs` slash commands

**Week 3-4: Terminal Context Enhancement**

- [ ] Extend CLI with `capture` and `analyze` commands
- [ ] Implement command output analysis system
- [ ] Add terminal context to chat conversations
- [ ] Create command suggestion system

### Phase 2: Rich Interactions (Weeks 5-8)

**Priority**: High
**Goal**: Transform chat experience with advanced editing and export

**Week 5-6: Advanced Chat Features**

- [ ] Implement message editing with syntax highlighting
- [ ] Add enhanced code block handling with execution
- [ ] Create comprehensive slash commands system
- [ ] Build advanced export system (Markdown, HTML, PDF)

**Week 7-8: System Integration**

- [ ] Implement system tray with context menu
- [ ] Expand global shortcuts system
- [ ] Create VS Code extension for seamless integration
- [ ] Add quick capture functionality

### Phase 3: Intelligence Layer (Weeks 9-12)

**Priority**: Medium
**Goal**: Add profile system and local AI capabilities

**Week 9-10: Profile System**

- [ ] Implement profile management with project awareness
- [ ] Create local embeddings system using Candle
- [ ] Build memory formation and retrieval system
- [ ] Add profile-aware chat context

**Week 11-12: Voice Integration**

- [ ] Integrate Vosk for offline speech recognition
- [ ] Implement text-to-speech for responses
- [ ] Create voice command system
- [ ] Add audio model management

### Phase 4: Advanced Features (Weeks 13-16)

**Priority**: Low
**Goal**: Polish and advanced functionality

**Week 13-14: Document Intelligence**

- [ ] Add support for Office documents (docx, odt)
- [ ] Implement advanced file type parsing
- [ ] Create document summarization system
- [ ] Add OCR capabilities for images

**Week 15-16: Security and Performance**

- [ ] Implement command sandboxing system
- [ ] Add comprehensive security validation
- [ ] Optimize embedding generation and storage
- [ ] Performance profiling and optimization

---

## 🔧 Technical Requirements

### Dependencies

**Rust Crates (Backend)**:

```toml
# Document parsing
lopdf = "0.30"          # PDF parsing
zip = "0.6"             # Office document parsing
chardet = "0.2"         # Encoding detection
tree-sitter = "0.20"    # Code parsing
ignore = "0.4"          # Already added

# Voice processing
vosk = "0.3"            # Speech recognition
cpal = "0.15"           # Audio I/O
rodio = "0.17"          # Audio playback
hound = "3.5"           # WAV handling

# AI/ML
candle-core = "0.3"     # Local embeddings
candle-nn = "0.3"       # Neural networks
candle-transformers = "0.3" # BERT models

# System integration
global-hotkey = "0.4"   # Global shortcuts
notify-rust = "4.8"     # System notifications
tts = "0.26"            # Text-to-speech
```

**Frontend Dependencies**:

```json
{
  "devDependencies": {
    "@monaco-editor/react": "^4.6.0",
    "react-syntax-highlighter": "^15.5.0",
    "react-markdown": "^9.0.1",
    "react-textarea-autosize": "^8.5.3"
  }
}
```

### System Requirements

**Minimum System Requirements**:

- Linux kernel 4.14+ (for modern audio/video APIs)
- 4GB RAM (8GB recommended for embeddings)
- 2GB storage (for models and document index)
- Audio input/output devices (for voice features)

**Development Dependencies**:

- Rust 1.70+
- Node.js 18+
- VS Code with rust-analyzer
- SQLite 3.35+ (for FTS5 support)

---

## 🔒 Privacy and Security Considerations

### Data Privacy

- **All processing on-device**: No documents or voice data sent to external services
- **Local embeddings**: Privacy-preserving semantic search without cloud APIs
- **Encrypted storage**: Sensitive profile data encrypted at rest
- **Audit trail**: Clear logging of what data is processed and stored

### Security Measures

- **Command sandboxing**: Dangerous commands validated before execution
- **File access controls**: Document indexing respects system permissions
- **Network isolation**: Voice and document processing completely offline
- **User consent**: Clear permissions for microphone and file access

### Compliance

- **GDPR ready**: User control over all data with export/delete capabilities
- **Enterprise friendly**: No external dependencies for core functionality
- **Audit support**: Comprehensive logging for security reviews

---

## 🎯 Success Metrics

### User Experience Goals

- **< 2 seconds**: Document search response time
- **< 500ms**: Voice command recognition delay
- **< 1 second**: Profile switching time
- **Zero external calls**: For document and voice processing

### Feature Adoption Targets

- **80%+ users**: Use document integration within first week
- **60%+ users**: Configure global shortcuts
- **40%+ users**: Use voice input regularly
- **90%+ users**: Use slash commands

### Performance Benchmarks

- **< 100MB**: Memory overhead for all new features
- **< 50MB**: Model storage per language
- **< 10%**: CPU usage during idle operation
- **> 95%**: Uptime for background services

---

## 🚀 Conclusion

This comprehensive enhancement plan positions the Linux AI Assistant as the definitive privacy-first, developer-focused AI tool for Linux. By building on our strong foundation of completed quick wins and optimized performance, we can deliver features that rival commercial solutions while maintaining complete user control over data and processing.

The phased approach ensures steady progress with immediate value delivery, while the modular architecture allows for flexible implementation based on user feedback and priorities. Each feature reinforces the core values of privacy, performance, and developer productivity that define the Linux AI Assistant.

**Next Action**: Begin Phase 1 implementation with document integration foundation, leveraging our existing file watcher and database systems for rapid development and deployment.
