use clap::{Parser, Subcommand};
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::net::TcpStream;

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
}

#[derive(Deserialize)]
struct IpcResponse {
    status: String,
    data: Option<serde_json::Value>,
}

#[derive(Deserialize)]
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
    let mut stream =
        TcpStream::connect(addr).map_err(|e| format!("connect {} failed: {}", addr, e))?;
    let body = IpcMessage {
        kind,
        message,
        payload,
    };
    let json = serde_json::to_string(&body).map_err(|e| e.to_string())?;
    stream
        .write_all(format!("{}\n", json).as_bytes())
        .map_err(|e| e.to_string())?;
    // Read ack
    let mut reader = BufReader::new(stream);
    let mut line = String::new();
    let _ = reader.read_line(&mut line);
    Ok(())
}

fn send_ipc_with_response(
    kind: &str,
    message: Option<&str>,
    payload: Option<serde_json::Value>,
) -> Result<IpcResponse, String> {
    let addr = "127.0.0.1:39871";
    let mut stream =
        TcpStream::connect(addr).map_err(|e| format!("connect {} failed: {}", addr, e))?;
    let body = IpcMessage {
        kind,
        message,
        payload,
    };
    let json = serde_json::to_string(&body).map_err(|e| e.to_string())?;
    stream
        .write_all(format!("{}\n", json).as_bytes())
        .map_err(|e| e.to_string())?;
    // Read response
    let mut reader = BufReader::new(stream);
    let mut line = String::new();
    reader.read_line(&mut line).map_err(|e| e.to_string())?;
    serde_json::from_str(&line).map_err(|e| format!("Failed to parse response: {}", e))
}
