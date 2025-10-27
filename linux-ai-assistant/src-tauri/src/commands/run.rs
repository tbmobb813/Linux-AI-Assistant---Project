use serde::Serialize;
use std::fs::File;
use std::io::Write;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

#[derive(Serialize)]
pub struct RunResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
    pub timed_out: bool,
}

/// Execute user-provided code snippet safely in a temporary file and return output.
/// Only a small whitelist of languages is supported.
#[tauri::command]
pub async fn run_code(
    language: String,
    code: String,
    timeout_ms: Option<u64>,
    cwd: Option<String>,
) -> Result<RunResult, String> {
    // Whitelist languages we support
    let lang = language.to_lowercase();
    let supported = ["bash", "sh", "zsh", "python", "node", "javascript"];
    if !supported.contains(&lang.as_str()) {
        return Err(format!("Unsupported language: {}", language));
    }

    let timeout = Duration::from_millis(timeout_ms.unwrap_or(10_000));

    // Create temporary file
    let mut suffix = ".txt".to_string();
    if lang == "python" {
        suffix = ".py".to_string();
    } else if lang == "node" || lang == "javascript" {
        suffix = ".js".to_string();
    } else if lang == "bash" || lang == "sh" || lang == "zsh" {
        suffix = ".sh".to_string();
    }

    let mut tmp = tempfile::Builder::new()
        .suffix(&suffix)
        .tempfile()
        .map_err(|e| format!("failed to create temp file: {}", e))?;

    tmp.write_all(code.as_bytes())
        .map_err(|e| format!("failed to write temp file: {}", e))?;

    let path = tmp.path().to_owned();

    // Build command
    let mut cmd = if lang == "python" {
        let mut c = Command::new("python3");
        c.arg(path.clone());
        c
    } else if lang == "node" || lang == "javascript" {
        let mut c = Command::new("node");
        c.arg(path.clone());
        c
    } else {
        // shell
        let mut c = Command::new("sh");
        c.arg(path.clone());
        c
    };

    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }

    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("failed to spawn: {}", e))?;

    let start = Instant::now();
    let mut timed_out = false;
    // Poll for completion with timeout
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                let mut stdout = String::new();
                if let Some(mut out) = child.stdout.take() {
                    use std::io::Read;
                    let _ = out.read_to_string(&mut stdout);
                }
                let mut stderr = String::new();
                if let Some(mut err) = child.stderr.take() {
                    use std::io::Read;
                    let _ = err.read_to_string(&mut stderr);
                }
                let code = status.code();
                return Ok(RunResult {
                    stdout,
                    stderr,
                    exit_code: code,
                    timed_out: false,
                });
            }
            Ok(None) => {
                if start.elapsed() > timeout {
                    // kill
                    let _ = child.kill();
                    timed_out = true;
                    break;
                }
                std::thread::sleep(Duration::from_millis(50));
                continue;
            }
            Err(e) => return Err(format!("failed to poll child: {}", e)),
        }
    }

    // If we reach here, we timed out. Collect whatever output is available.
    let mut stdout = String::new();
    if let Some(mut out) = child.stdout.take() {
        use std::io::Read;
        let _ = out.read_to_string(&mut stdout);
    }
    let mut stderr = String::new();
    if let Some(mut err) = child.stderr.take() {
        use std::io::Read;
        let _ = err.read_to_string(&mut stderr);
    }

    Ok(RunResult {
        stdout,
        stderr,
        exit_code: None,
        timed_out,
    })
}
