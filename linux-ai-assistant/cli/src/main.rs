use clap::{Parser, Subcommand};
use serde::{Deserialize, Serialize};
use std::env;
use std::io::{BufRead, BufReader, Write};
use std::net::TcpStream;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

// Performance optimizations
const IPC_TIMEOUT: Duration = Duration::from_secs(10);
const BUFFER_SIZE: usize = 4096;

#[derive(Parser)]
#[command(name = "lai")]
#[command(about = "Linux AI Assistant CLI - Terminal companion for the Linux AI Desktop Assistant")]
#[command(version = env!("CARGO_PKG_VERSION"))]
#[command(long_about = "
Linux AI Assistant CLI provides command-line access to the desktop AI assistant.

Examples:
  lai ask \"How do I optimize this SQL query?\"
  lai notify \"Build completed successfully\"
  lai last
  lai capture \"npm test\" --analyze
  lai capture \"make build\" --timeout 60 --ai-analyze
  DEV_MODE=1 lai create \"Test assistant message\"

For more information, see: https://github.com/tbmobb813/Linux-AI-Assistant---Project
")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Send a question to the AI assistant
    Ask {
        /// The question or prompt to send to the AI
        message: String,
        /// Override the default model (e.g., gpt-4, claude-sonnet)
        #[arg(long)]
        model: Option<String>,
        /// Override the default provider (e.g., openai, anthropic, ollama)
        #[arg(long)]
        provider: Option<String>,
        /// Start a new conversation instead of continuing the current one
        #[arg(long, default_value_t = false)]
        new: bool,
    },
    /// Send a desktop notification through the assistant app
    Notify {
        /// Message to display in the notification
        message: String,
    },
    /// Retrieve the most recent assistant response
    Last,
    /// Capture command output and optionally analyze with AI
    Capture {
        /// Command to execute (will be run in a shell)
        command: String,
        /// Maximum execution time in seconds
        #[arg(long, default_value_t = 30)]
        timeout: u64,
        /// Send output to AI for analysis
        #[arg(long, default_value_t = false)]
        analyze: bool,
        /// Alternative flag for AI analysis
        #[arg(long, default_value_t = false)]
        ai_analyze: bool,
    },
    /// Create an assistant message (dev/test)
    Create {
        /// Message content to insert
        message: String,
        /// Optional conversation id to insert into (if omitted a conversation will be created)
        #[arg(long)]
        conversation_id: Option<String>,
    },
}

#[derive(Deserialize)]
struct IpcResponse {
    status: String,
    data: Option<serde_json::Value>,
}

#[derive(Deserialize)]
#[allow(dead_code)]
struct Message {
    id: String,
    conversation_id: String,
    role: String,
    content: String,
    timestamp: i64,
    tokens_used: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug)]
struct CaptureResult {
    command: String,
    working_dir: String,
    exit_code: Option<i32>,
    stdout: String,
    stderr: String,
    execution_time_ms: u64,
    timed_out: bool,
    error_summary: Option<String>,
}

fn main() {
    let cli = Cli::parse();

    match &cli.command {
        Commands::Ask {
            message,
            model,
            provider,
            new,
        } => {
            let payload = serde_json::json!({
                "prompt": message,
                "model": model,
                "provider": provider,
                "new": new,
            });
            if let Err(e) = send_ipc("ask", None, Some(payload)) {
                eprintln!("Failed to send ask: {}", e);
                std::process::exit(1);
            }
        }
        Commands::Notify { message } => {
            if let Err(e) = send_ipc("notify", Some(message.as_str()), None) {
                eprintln!("Failed to send notify: {}", e);
                std::process::exit(1);
            }
        }
        Commands::Last => match send_ipc_with_response("last", None, None) {
            Ok(response) => {
                if response.status == "ok" {
                    if let Some(data) = response.data {
                        match serde_json::from_value::<Message>(data) {
                            Ok(message) => {
                                println!("{}", message.content);
                            }
                            Err(e) => {
                                eprintln!("Failed to parse message: {}", e);
                                std::process::exit(1);
                            }
                        }
                    } else {
                        eprintln!("No data returned");
                        std::process::exit(1);
                    }
                } else {
                    if let Some(data) = response.data {
                        if let Some(error) = data.get("error") {
                            eprintln!("Error: {}", error);
                        } else {
                            eprintln!("Error: {}", data);
                        }
                    } else {
                        eprintln!("Unknown error");
                    }
                    std::process::exit(1);
                }
            }
            Err(e) => {
                eprintln!("Failed to get last response: {}", e);
                std::process::exit(1);
            }
        },
        Commands::Capture {
            command,
            timeout,
            analyze,
            ai_analyze,
        } => {
            let should_analyze = *analyze || *ai_analyze;
            match execute_command(command, *timeout) {
                Ok(result) => {
                    // Print the output
                    if !result.stdout.is_empty() {
                        println!("{}", result.stdout);
                    }
                    if !result.stderr.is_empty() {
                        eprintln!("{}", result.stderr);
                    }

                    // Show execution summary
                    eprintln!("\n--- Execution Summary ---");
                    eprintln!("Command: {}", result.command);
                    eprintln!("Exit Code: {}", result.exit_code.unwrap_or(-1));
                    eprintln!("Duration: {}ms", result.execution_time_ms);
                    if result.timed_out {
                        eprintln!("Warning: Command timed out");
                    }

                    // Send to AI for analysis if requested
                    if should_analyze {
                        let analysis_prompt = format!(
                            "Analyze this command execution:\n\nCommand: {}\nExit Code: {}\nExecution Time: {}ms\n\nStdout:\n{}\n\nStderr:\n{}\n\nPlease provide insights about what happened, any errors, and suggestions for improvement.",
                            result.command,
                            result.exit_code.unwrap_or(-1),
                            result.execution_time_ms,
                            if result.stdout.is_empty() { "(empty)" } else { &result.stdout },
                            if result.stderr.is_empty() { "(empty)" } else { &result.stderr }
                        );

                        let payload = serde_json::json!({
                            "prompt": analysis_prompt,
                            "model": null,
                            "provider": null,
                            "new": false,
                        });

                        if let Err(e) = send_ipc("ask", None, Some(payload)) {
                            eprintln!("Failed to send analysis request: {}", e);
                            std::process::exit(1);
                        }
                        eprintln!("\n✓ Command output sent to AI for analysis");
                    }

                    // Exit with the command's exit code
                    std::process::exit(result.exit_code.unwrap_or(1));
                }
                Err(e) => {
                    eprintln!("Failed to execute command: {}", e);
                    std::process::exit(1);
                }
            }
        }
        Commands::Create {
            message,
            conversation_id,
        } => {
            let mut payload = serde_json::Map::new();
            payload.insert(
                "content".to_string(),
                serde_json::Value::String(message.clone()),
            );
            if let Some(cid) = conversation_id {
                payload.insert(
                    "conversation_id".to_string(),
                    serde_json::Value::String(cid.clone()),
                );
            }
            if let Err(e) = send_ipc("create", None, Some(serde_json::Value::Object(payload))) {
                eprintln!("Failed to send create: {}", e);
                std::process::exit(1);
            } else {
                // Ask for the created message back and print it
                match send_ipc_with_response("last", None, None) {
                    Ok(resp) => {
                        if resp.status == "ok" {
                            if let Some(data) = resp.data {
                                match serde_json::from_value::<Message>(data) {
                                    Ok(msg) => println!("{}", msg.content),
                                    Err(e) => eprintln!("Failed to parse message: {}", e),
                                }
                            } else {
                                eprintln!("No message data returned after creation.");
                            }
                        } else {
                            eprintln!("Failed to fetch last message: status '{}'", resp.status);
                        }
                    }
                    Err(e) => {
                        eprintln!("Failed to fetch last message: {}", e);
                    }
                }
            }
        }
    }
}

#[derive(Serialize)]
struct IpcMessage<'a> {
    #[serde(rename = "type")]
    kind: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    message: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    payload: Option<serde_json::Value>,
}

fn send_ipc(
    kind: &str,
    message: Option<&str>,
    payload: Option<serde_json::Value>,
) -> Result<(), String> {
    let addr = "127.0.0.1:39871";

    // Optimized connection with timeouts and buffering
    let mut stream = TcpStream::connect_timeout(&addr.parse().unwrap(), IPC_TIMEOUT)
        .map_err(|e| format!("connect {} failed: {}", addr, e))?;

    // Set timeouts for read/write operations
    stream
        .set_read_timeout(Some(IPC_TIMEOUT))
        .map_err(|e| format!("set read timeout failed: {}", e))?;
    stream
        .set_write_timeout(Some(IPC_TIMEOUT))
        .map_err(|e| format!("set write timeout failed: {}", e))?;

    // Disable Nagle's algorithm for lower latency
    stream
        .set_nodelay(true)
        .map_err(|e| format!("set nodelay failed: {}", e))?;

    let body = IpcMessage {
        kind,
        message,
        payload,
    };

    // Serialize once and reuse
    let json = serde_json::to_string(&body).map_err(|e| e.to_string())?;
    let message_bytes = format!("{}\n", json);

    stream
        .write_all(message_bytes.as_bytes())
        .map_err(|e| e.to_string())?;
    stream.flush().map_err(|e| e.to_string())?;

    // Read acknowledgment with buffered reader
    let mut reader = BufReader::with_capacity(BUFFER_SIZE, stream);
    let mut line = String::with_capacity(256);
    reader.read_line(&mut line).map_err(|e| e.to_string())?;
    Ok(())
}

fn send_ipc_with_response(
    kind: &str,
    message: Option<&str>,
    payload: Option<serde_json::Value>,
) -> Result<IpcResponse, String> {
    let addr = "127.0.0.1:39871";

    // Optimized connection setup
    let mut stream = TcpStream::connect_timeout(&addr.parse().unwrap(), IPC_TIMEOUT)
        .map_err(|e| format!("connect {} failed: {}", addr, e))?;

    // Configure timeouts
    stream
        .set_read_timeout(Some(IPC_TIMEOUT))
        .map_err(|e| format!("set read timeout failed: {}", e))?;
    stream
        .set_write_timeout(Some(IPC_TIMEOUT))
        .map_err(|e| format!("set write timeout failed: {}", e))?;
    stream
        .set_nodelay(true)
        .map_err(|e| format!("set nodelay failed: {}", e))?;

    let body = IpcMessage {
        kind,
        message,
        payload,
    };

    let json = serde_json::to_string(&body).map_err(|e| e.to_string())?;
    let message_bytes = format!("{}\n", json);

    stream
        .write_all(message_bytes.as_bytes())
        .map_err(|e| e.to_string())?;
    stream.flush().map_err(|e| e.to_string())?;

    // Read response with optimized buffering
    let mut reader = BufReader::with_capacity(BUFFER_SIZE, stream);
    let mut line = String::with_capacity(512);
    reader.read_line(&mut line).map_err(|e| e.to_string())?;

    serde_json::from_str(&line).map_err(|e| format!("Failed to parse response: {}", e))
}

fn execute_command(command: &str, timeout_secs: u64) -> Result<CaptureResult, String> {
    let start = Instant::now();
    let working_dir = env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| String::from("unknown"));

    // Determine shell based on OS
    let (shell, shell_arg) = if cfg!(target_os = "windows") {
        ("cmd", "/C")
    } else {
        ("sh", "-c")
    };

    // Spawn the command with timeout
    let mut child = Command::new(shell)
        .arg(shell_arg)
        .arg(command)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn command: {}", e))?;

    let timeout_duration = Duration::from_secs(timeout_secs);
    let mut timed_out = false;
    let mut exit_code = None;

    // Wait for process with timeout
    loop {
        if start.elapsed() >= timeout_duration {
            // Kill the process
            let _ = child.kill();
            timed_out = true;
            // Still need to call wait to clean up the process
            let _ = child.wait();
            break;
        }

        match child.try_wait() {
            Ok(Some(status)) => {
                exit_code = status.code();
                break;
            }
            Ok(None) => {
                // Process still running, sleep briefly
                std::thread::sleep(Duration::from_millis(100));
            }
            Err(e) => {
                return Err(format!("Failed to wait for process: {}", e));
            }
        }
    }

    let execution_time_ms = start.elapsed().as_millis() as u64;

    // Collect output - if timed out, we already killed and waited
    let (stdout, stderr) = if timed_out {
        // Process was killed, try to get what output we can
        match child.try_wait() {
            Ok(_) => {
                // Get the pipes
                let stdout_bytes = if let Some(mut stdout) = child.stdout.take() {
                    let mut buf = Vec::new();
                    let _ = std::io::Read::read_to_end(&mut stdout, &mut buf);
                    buf
                } else {
                    Vec::new()
                };
                let stderr_bytes = if let Some(mut stderr) = child.stderr.take() {
                    let mut buf = Vec::new();
                    let _ = std::io::Read::read_to_end(&mut stderr, &mut buf);
                    buf
                } else {
                    Vec::new()
                };
                (
                    String::from_utf8_lossy(&stdout_bytes).to_string(),
                    String::from_utf8_lossy(&stderr_bytes).to_string(),
                )
            }
            Err(_) => (String::new(), String::new()),
        }
    } else {
        // Normal completion - wait and collect output
        let output = child
            .wait_with_output()
            .map_err(|e| format!("Failed to collect output: {}", e))?;

        if exit_code.is_none() {
            exit_code = output.status.code();
        }

        (
            String::from_utf8_lossy(&output.stdout).to_string(),
            String::from_utf8_lossy(&output.stderr).to_string(),
        )
    };

    // Generate error summary if command failed
    let error_summary = if exit_code.unwrap_or(1) != 0 || timed_out {
        Some(if timed_out {
            format!("Command timed out after {} seconds", timeout_secs)
        } else {
            format!("Command exited with code {}", exit_code.unwrap_or(-1))
        })
    } else {
        None
    };

    Ok(CaptureResult {
        command: command.to_string(),
        working_dir,
        exit_code,
        stdout,
        stderr,
        execution_time_ms,
        timed_out,
        error_summary,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ipc_message_serialization() {
        let msg = IpcMessage {
            kind: "test",
            message: Some("hello"),
            payload: Some(serde_json::json!({"key": "value"})),
        };

        let json = serde_json::to_string(&msg).expect("Serialization should work");
        assert!(json.contains("\"type\":\"test\""));
        assert!(json.contains("\"message\":\"hello\""));
        assert!(json.contains("\"key\":\"value\""));
    }

    #[test]
    fn test_ipc_response_deserialization() {
        let json = r#"{"status":"ok","data":{"content":"test message"}}"#;
        let response: IpcResponse =
            serde_json::from_str(json).expect("Deserialization should work");

        assert_eq!(response.status, "ok");
        assert!(response.data.is_some());
    }

    #[test]
    fn test_message_deserialization() {
        let json = r#"{
            "id": "test-id",
            "conversation_id": "conv-id",
            "role": "assistant",
            "content": "test content",
            "timestamp": 1234567890,
            "tokens_used": 100
        }"#;

        let message: Message =
            serde_json::from_str(json).expect("Message deserialization should work");
        assert_eq!(message.id, "test-id");
        assert_eq!(message.content, "test content");
        assert_eq!(message.role, "assistant");
        assert_eq!(message.tokens_used, Some(100));
    }

    #[test]
    fn test_error_response_handling() {
        let json = r#"{"status":"error","data":{"error":"Test error message"}}"#;
        let response: IpcResponse =
            serde_json::from_str(json).expect("Error response should deserialize");

        assert_eq!(response.status, "error");
        if let Some(data) = response.data {
            assert_eq!(
                data.get("error").and_then(|v| v.as_str()),
                Some("Test error message")
            );
        } else {
            panic!("Error response should have data");
        }
    }

    // Integration test that requires a running backend
    #[test]
    #[ignore] // Ignored by default since it requires backend to be running
    fn test_connection_timeout() {
        // This test verifies that connection timeouts work properly
        // when connecting to a non-existent server
        let result = send_ipc("test", None, None);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("connect"));
    }

    #[test]
    fn test_execute_command_success() {
        let result = execute_command("echo 'hello world'", 5);
        assert!(result.is_ok());
        let capture = result.unwrap();
        assert!(capture.stdout.contains("hello world"));
        assert_eq!(capture.exit_code, Some(0));
        assert!(!capture.timed_out);
        assert!(capture.error_summary.is_none());
    }

    #[test]
    fn test_execute_command_failure() {
        // Use a command that fails on both Unix and Windows
        let result = if cfg!(target_os = "windows") {
            execute_command("exit 1", 5)
        } else {
            execute_command("exit 1", 5)
        };

        assert!(result.is_ok());
        let capture = result.unwrap();
        assert_eq!(capture.exit_code, Some(1));
        assert!(capture.error_summary.is_some());
        assert!(!capture.timed_out);
    }

    #[test]
    fn test_execute_command_timeout() {
        // Command that sleeps longer than timeout
        let result = if cfg!(target_os = "windows") {
            execute_command("timeout /t 10 /nobreak", 1)
        } else {
            execute_command("sleep 10", 1)
        };

        assert!(result.is_ok());
        let capture = result.unwrap();
        assert!(capture.timed_out);
        assert!(capture.error_summary.is_some());
        assert!(capture.error_summary.unwrap().contains("timed out"));
    }

    #[test]
    fn test_capture_result_serialization() {
        let result = CaptureResult {
            command: "test".to_string(),
            working_dir: "/tmp".to_string(),
            exit_code: Some(0),
            stdout: "output".to_string(),
            stderr: "".to_string(),
            execution_time_ms: 100,
            timed_out: false,
            error_summary: None,
        };

        let json = serde_json::to_string(&result).expect("Serialization should work");
        assert!(json.contains("\"command\":\"test\""));
        assert!(json.contains("\"exit_code\":0"));
        assert!(json.contains("\"timed_out\":false"));
    }
}
