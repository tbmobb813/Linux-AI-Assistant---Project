use serde::Serialize;
use std::fs::{File, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

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
                // Audit log
                let _ = append_audit(&language, cwd.as_deref(), code, false, &stdout, &stderr);
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

    // Audit log for timeout
    let _ = append_audit(&language, cwd.as_deref(), None, timed_out, &stdout, &stderr);
    Ok(RunResult {
        stdout,
        stderr,
        exit_code: None,
        timed_out,
    })
}

fn append_audit(
    language: &str,
    cwd: Option<&str>,
    exit_code: Option<i32>,
    timed_out: bool,
    stdout: &str,
    stderr: &str,
) -> Result<(), String> {
    // Try to determine an appropriate app data directory
    let mut log_path = PathBuf::from(".");
    if let Some(dir) = tauri::api::path::app_dir() {
        log_path = dir;
    }
    log_path.push("executions.log");

    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let mut entry = format!(
        "{} | lang={} | exit={:?} | timed_out={} | cwd={:?}\n",
        ts, language, exit_code, timed_out, cwd
    );
    // Truncate outputs to avoid massive logs
    let take = |s: &str, n: usize| {
        if s.len() > n {
            format!("{}...", &s[..n])
        } else {
            s.to_string()
        }
    };
    entry.push_str(&format!("STDOUT: {}\n", take(stdout, 1000)));
    entry.push_str(&format!("STDERR: {}\n", take(stderr, 1000)));
    entry.push_str("---\n");

    // Append to file
    match OpenOptions::new().create(true).append(true).open(&log_path) {
        Ok(mut f) => {
            if let Err(e) = f.write_all(entry.as_bytes()) {
                eprintln!("failed to write audit log: {}", e);
            }
        }
        Err(e) => {
            eprintln!("failed to open audit log {:?}: {}", log_path, e);
        }
    }

    Ok(())
}
