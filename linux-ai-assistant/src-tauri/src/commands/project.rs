use ignore::gitignore::{Gitignore, GitignoreBuilder};
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::{mpsc, Mutex, OnceLock};
use tauri::Emitter;

static WATCHER: OnceLock<Mutex<Option<RecommendedWatcher>>> = OnceLock::new();
static IGNORE_PATTERNS: OnceLock<Mutex<Option<Gitignore>>> = OnceLock::new();

fn build_gitignore(patterns: &[String], root: &PathBuf) -> Result<Gitignore, String> {
    let mut builder = GitignoreBuilder::new(root);

    // Add provided patterns
    for pattern in patterns {
        builder
            .add_line(None, pattern)
            .map_err(|e| format!("Invalid pattern '{}': {}", pattern, e))?;
    }

    // Try to add existing .gitignore files
    let gitignore_path = root.join(".gitignore");
    if gitignore_path.exists() {
        builder.add(&gitignore_path);
    }

    builder
        .build()
        .map_err(|e| format!("Failed to build gitignore: {}", e))
}

fn should_ignore_path(path: &PathBuf, root: &PathBuf) -> bool {
    let ignore_cell = IGNORE_PATTERNS.get_or_init(|| Mutex::new(None));
    if let Ok(guard) = ignore_cell.lock() {
        if let Some(ref gitignore) = *guard {
            // Get relative path from project root
            if let Ok(relative_path) = path.strip_prefix(root) {
                return gitignore.matched(relative_path, path.is_dir()).is_ignore();
            }
        }
    }
    false
}

#[tauri::command]
pub fn set_project_root(
    path: String,
    patterns: Option<Vec<String>>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let root = PathBuf::from(path);
    if !root.exists() || !root.is_dir() {
        return Err("path does not exist or is not a directory".into());
    }

    // Default ignore patterns if none provided
    let ignore_patterns = patterns.unwrap_or_else(|| {
        vec![
            "node_modules/**".to_string(),
            ".git/**".to_string(),
            "target/**".to_string(),
            "dist/**".to_string(),
            "build/**".to_string(),
            "*.log".to_string(),
            ".DS_Store".to_string(),
            "Thumbs.db".to_string(),
        ]
    });

    // Build gitignore patterns
    let gitignore = build_gitignore(&ignore_patterns, &root)?;

    // Store ignore patterns
    let ignore_cell = IGNORE_PATTERNS.get_or_init(|| Mutex::new(None));
    if let Ok(mut guard) = ignore_cell.lock() {
        *guard = Some(gitignore);
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
    let project_root = root.clone();
    std::thread::spawn(move || {
        while let Ok(ev) = rx.recv() {
            if let Ok(event) = ev {
                let paths: Vec<String> = event
                    .paths
                    .into_iter()
                    .filter(|path| !should_ignore_path(path, &project_root))
                    .map(|p| p.to_string_lossy().to_string())
                    .collect();

                // Only emit if we have non-ignored paths
                if !paths.is_empty() {
                    let _ = app_handle.emit("project://file-event", paths);
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn update_ignore_patterns(patterns: Vec<String>) -> Result<(), String> {
    // For now, we'll just clear the current patterns
    // They'll be rebuilt when set_project_root is called again
    let ignore_cell = IGNORE_PATTERNS.get_or_init(|| Mutex::new(None));
    if let Ok(mut guard) = ignore_cell.lock() {
        *guard = None;
    }
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
