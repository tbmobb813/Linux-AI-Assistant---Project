use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
pub struct GitContext {
    pub is_repo: bool,
    pub branch: Option<String>,
    pub dirty: bool,
}

/// Get git context for a given path (defaults to current working directory).
/// Returns JSON with { is_repo, branch, dirty }.
#[tauri::command]
pub async fn get_git_context(path: Option<String>) -> Result<GitContext, String> {
    let cwd = path.unwrap_or_else(|| String::from("."));

    // Check if inside a git work tree
    let inside = Command::new("git")
        .arg("-C")
        .arg(&cwd)
        .arg("rev-parse")
        .arg("--is-inside-work-tree")
        .output()
        .map_err(|e| format!("failed to run git: {}", e))?;

    if !inside.status.success() {
        return Ok(GitContext {
            is_repo: false,
            branch: None,
            dirty: false,
        });
    }

    // Get current branch
    let branch_out = Command::new("git")
        .arg("-C")
        .arg(&cwd)
        .arg("rev-parse")
        .arg("--abbrev-ref")
        .arg("HEAD")
        .output()
        .map_err(|e| format!("failed to run git: {}", e))?;

    let branch = if branch_out.status.success() {
        let s = String::from_utf8_lossy(&branch_out.stdout)
            .trim()
            .to_string();
        Some(s)
    } else {
        None
    };

    // Check for uncommitted changes
    let status_out = Command::new("git")
        .arg("-C")
        .arg(&cwd)
        .arg("status")
        .arg("--porcelain")
        .output()
        .map_err(|e| format!("failed to run git: {}", e))?;

    let dirty = if status_out.status.success() {
        !status_out.stdout.is_empty()
    } else {
        false
    };

    Ok(GitContext {
        is_repo: true,
        branch,
        dirty,
    })
}
