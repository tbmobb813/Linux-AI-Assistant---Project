use serde_json::json;
use tauri::{AppHandle, Emitter, Manager};

/// Helper for managing streaming sessions
pub struct StreamSession {
    session_id: String,
    app: AppHandle,
}

impl StreamSession {
    pub fn new(session_id: String, app: AppHandle) -> Self {
        Self { session_id, app }
    }
    
    /// Emit a chunk of text to the frontend
    pub fn emit_chunk(&self, chunk: &str) {
        if let Some(window) = self.app.get_webview_window("main") {
            let payload = json!({
                "session_id": self.session_id,
                "chunk": chunk
            });
            let _ = window.emit("provider-stream-chunk", payload);
        }
    }
    
    /// Emit the end-of-stream signal
    pub fn emit_end(&self) {
        if let Some(window) = self.app.get_webview_window("main") {
            let payload = json!({"session_id": self.session_id});
            let _ = window.emit("provider-stream-end", payload);
        }
    }
}
