use clap::{Parser, Subcommand};
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::net::TcpStream;
use std::time::Duration;

// Performance optimizations
const IPC_TIMEOUT: Duration = Duration::from_secs(10);
const BUFFER_SIZE: usize = 4096;

#[derive(Parser)]
#[command(name = "lai")]
#[command(about = "Linux AI Assistant CLI", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Send a message to the AI
    Ask {
        /// The question to ask
        message: String,
        /// Override model (optional)
        #[arg(long)]
        model: Option<String>,
        /// Override provider (optional)
        #[arg(long)]
        provider: Option<String>,
        /// Force a new conversation
        #[arg(long, default_value_t = false)]
        new: bool,
    },
    /// Show a desktop notification via app
    Notify {
        /// Message to display
        message: String,
    },
    /// Get the last assistant response
    Last,
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
}
