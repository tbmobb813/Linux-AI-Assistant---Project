use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::AppHandle;

// Define available shortcut actions
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum ShortcutAction {
    ToggleWindow,
    NewConversation,
    OpenSettings,
    QuickCapture,
    FocusInput,
}

impl ShortcutAction {
    pub fn display_name(&self) -> &'static str {
        match self {
            ShortcutAction::ToggleWindow => "Toggle Window",
            ShortcutAction::NewConversation => "New Conversation",
            ShortcutAction::OpenSettings => "Open Settings",
            ShortcutAction::QuickCapture => "Quick Capture",
            ShortcutAction::FocusInput => "Focus Input",
        }
    }

    pub fn description(&self) -> &'static str {
        match self {
            ShortcutAction::ToggleWindow => "Show/hide the main application window",
            ShortcutAction::NewConversation => "Create a new conversation",
            ShortcutAction::OpenSettings => "Open the settings panel",
            ShortcutAction::QuickCapture => "Quick capture input without showing window",
            ShortcutAction::FocusInput => "Focus the chat input field",
        }
    }

    pub fn default_shortcut(&self) -> &'static str {
        match self {
            ShortcutAction::ToggleWindow => "CommandOrControl+Space",
            ShortcutAction::NewConversation => "CommandOrControl+N",
            ShortcutAction::OpenSettings => "CommandOrControl+Comma",
            ShortcutAction::QuickCapture => "CommandOrControl+Shift+Space",
            ShortcutAction::FocusInput => "CommandOrControl+Shift+I",
        }
    }

    pub fn all_actions() -> Vec<ShortcutAction> {
        vec![
            ShortcutAction::ToggleWindow,
            ShortcutAction::NewConversation,
            ShortcutAction::OpenSettings,
            ShortcutAction::QuickCapture,
            ShortcutAction::FocusInput,
        ]
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalShortcut {
    pub action: ShortcutAction,
    pub shortcut: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShortcutConfig {
    pub shortcuts: Vec<GlobalShortcut>,
}

impl Default for ShortcutConfig {
    fn default() -> Self {
        Self {
            shortcuts: vec![
                GlobalShortcut {
                    action: ShortcutAction::ToggleWindow,
                    shortcut: "CommandOrControl+Space".to_string(),
                    enabled: true,
                },
                GlobalShortcut {
                    action: ShortcutAction::NewConversation,
                    shortcut: "CommandOrControl+N".to_string(),
                    enabled: false,
                },
                GlobalShortcut {
                    action: ShortcutAction::OpenSettings,
                    shortcut: "CommandOrControl+Comma".to_string(),
                    enabled: false,
                },
                GlobalShortcut {
                    action: ShortcutAction::QuickCapture,
                    shortcut: "CommandOrControl+Shift+Space".to_string(),
                    enabled: false,
                },
                GlobalShortcut {
                    action: ShortcutAction::FocusInput,
                    shortcut: "CommandOrControl+Shift+I".to_string(),
                    enabled: false,
                },
            ],
        }
    }
}

// Global state for managing shortcuts
lazy_static::lazy_static! {
    static ref SHORTCUT_CONFIG: Arc<Mutex<Option<ShortcutConfig>>> = Arc::new(Mutex::new(None));
}

pub fn initialize_shortcut_manager(_app_handle: AppHandle) {
    // Store app handle for future use
    // For now, we'll rely on the existing global shortcut system in lib.rs
    // and just manage the configuration here
    std::thread::spawn(move || {
        // Initialize with default config
        let mut guard = SHORTCUT_CONFIG.lock().unwrap();
        *guard = Some(ShortcutConfig::default());
    });
}

#[tauri::command]
pub async fn get_shortcut_config(
    db: tauri::State<'_, crate::database::Database>,
) -> Result<ShortcutConfig, String> {
    let conn = db.conn().lock().map_err(|e| e.to_string())?;

    // Try to get existing config from database
    let config_json: Option<String> = conn
        .prepare("SELECT value FROM settings WHERE key = 'shortcut_config'")
        .and_then(|mut stmt| stmt.query_row([], |row| row.get(0)).optional())
        .map_err(|e| e.to_string())?;

    match config_json {
        Some(json) => {
            serde_json::from_str(&json).map_err(|e| format!("Failed to parse config: {}", e))
        }
        None => Ok(ShortcutConfig::default()),
    }
}

#[tauri::command]
pub async fn update_shortcut_config(
    config: ShortcutConfig,
    db: tauri::State<'_, crate::database::Database>,
    _app: AppHandle,
) -> Result<(), String> {
    let conn = db.conn().lock().map_err(|e| e.to_string())?;

    // Save config to database
    let config_json =
        serde_json::to_string(&config).map_err(|e| format!("Failed to serialize config: {}", e))?;

    conn.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
        .and_then(|mut stmt| stmt.execute(["shortcut_config", &config_json]))
        .map_err(|e| e.to_string())?;

    drop(conn);

    // Update the configuration
    let mut guard = SHORTCUT_CONFIG.lock().map_err(|e| e.to_string())?;
    *guard = Some(config);

    Ok(())
}

#[tauri::command]
pub async fn validate_shortcut(shortcut: String) -> Result<bool, String> {
    // Basic validation - check format
    if shortcut.trim().is_empty() {
        return Err("Shortcut cannot be empty".to_string());
    }

    // Check for basic modifier + key pattern
    let has_modifier = shortcut.contains("Command")
        || shortcut.contains("Control")
        || shortcut.contains("Ctrl")
        || shortcut.contains("Alt")
        || shortcut.contains("Shift");

    let has_plus = shortcut.contains("+");

    if !has_modifier || !has_plus {
        return Err(
            "Shortcut must include a modifier key (CommandOrControl, Alt, Shift) and a main key"
                .to_string(),
        );
    }

    Ok(true)
}

#[tauri::command]
pub async fn get_available_actions() -> Result<Vec<ShortcutAction>, String> {
    Ok(ShortcutAction::all_actions())
}
