use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::{mpsc, Mutex, OnceLock};
use tauri::Emitter;

static WATCHER: OnceLock<Mutex<Option<RecommendedWatcher>>> = OnceLock::new();

#[tauri::command]
pub fn set_project_root(path: String, app: tauri::AppHandle) -> Result<(), String> {
    let root = PathBuf::from(path);
    if !root.exists() || !root.is_dir() {
        return Err("path does not exist or is not a directory".into());
    }

    // Stop existing watcher
    if let Some(cell) = WATCHER.get() {
        if let Ok(mut guard) = cell.lock() {
            if let Some(_w) = guard.take() {
                // Dropping here stops the previous watcher completely
            }
        }
    }

    let (tx, rx) = mpsc::channel::<Result<Event, notify::Error>>();
    let mut watcher = RecommendedWatcher::new(tx, Config::default())
        .map_err(|e| format!("watcher init failed: {}", e))?;
    watcher
        .watch(&root, RecursiveMode::Recursive)
        .map_err(|e| format!("watch path failed: {}", e))?;

    // store watcher
    let _ = WATCHER.get_or_init(|| Mutex::new(None));
    if let Some(cell) = WATCHER.get() {
        if let Ok(mut guard) = cell.lock() {
            *guard = Some(watcher);
        }
    }

    // spawn receiver thread emitting events
    let app_handle = app.clone();
    std::thread::spawn(move || {
        while let Ok(ev) = rx.recv() {
            if let Ok(event) = ev {
                let paths: Vec<String> = event
                    .paths
                    .into_iter()
                    .map(|p| p.to_string_lossy().to_string())
                    .collect();
                let _ = app_handle.emit("project://file-event", paths);
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn stop_project_watch() -> Result<(), String> {
    if let Some(cell) = WATCHER.get() {
        if let Ok(mut guard) = cell.lock() {
            if let Some(_w) = guard.take() {
                // dropping stops the watcher
            }
        }
    }
    Ok(())
}
