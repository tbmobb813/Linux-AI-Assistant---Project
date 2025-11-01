use serde_json::Value as JsonValue;
use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};
// std::sync imports removed (Arc/Mutex were unused); add back if needed in future
use std::thread;
use tauri::{AppHandle, Emitter, Manager};

#[derive(serde::Deserialize, Debug)]
struct IpcMessage {
    #[serde(rename = "type")]
    kind: String,
    #[serde(default)]
    message: Option<String>,
    #[serde(default)]
    payload: Option<JsonValue>,
}

#[derive(serde::Serialize)]
struct IpcResponse {
    status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<JsonValue>,
}

fn handle_client(mut stream: TcpStream, app: AppHandle) {
    let peer = stream.peer_addr().ok();
    let mut reader = BufReader::new(stream.try_clone().unwrap());
    let mut line = String::new();
    loop {
        line.clear();
        match reader.read_line(&mut line) {
            Ok(0) => break, // EOF
            Ok(_) => {
                let trimmed = line.trim_end();
                if trimmed.is_empty() {
                    continue;
                }
                if let Ok(msg) = serde_json::from_str::<IpcMessage>(trimmed) {
                    match msg.kind.as_str() {
                        "notify" => {
                            let _ = app.emit("cli://notify", msg.message.unwrap_or_default());
                            let response = IpcResponse {
                                status: "ok".to_string(),
                                data: None,
                            };
                            let _ = stream.write_all(
                                format!("{}\n", serde_json::to_string(&response).unwrap())
                                    .as_bytes(),
                            );
                        }
                        "ask" => {
                            // Forward either the provided payload object, or the message string
                            if let Some(p) = msg.payload {
                                let _ = app.emit("cli://ask", p);
                            } else {
                                let _ = app.emit("cli://ask", msg.message.unwrap_or_default());
                            }
                            let response = IpcResponse {
                                status: "ok".to_string(),
                                data: None,
                            };
                            let _ = stream.write_all(
                                format!("{}\n", serde_json::to_string(&response).unwrap())
                                    .as_bytes(),
                            );
                        }
                        "last" => {
                            // Call the Tauri command directly
                            let db = app.state::<crate::database::Database>();
                            let result = tokio::runtime::Handle::current().block_on(async {
                                crate::commands::messages::get_last_assistant_message(db).await
                            });

                            match result {
                                Ok(Some(message)) => {
                                    let response = IpcResponse {
                                        status: "ok".to_string(),
                                        data: Some(serde_json::to_value(&message).unwrap()),
                                    };
                                    let _ = stream.write_all(
                                        format!("{}\n", serde_json::to_string(&response).unwrap())
                                            .as_bytes(),
                                    );
                                }
                                Ok(None) => {
                                    let response = IpcResponse {
                                        status: "error".to_string(),
                                        data: Some(
                                            serde_json::json!({"error": "No messages found"}),
                                        ),
                                    };
                                    let _ = stream.write_all(
                                        format!("{}\n", serde_json::to_string(&response).unwrap())
                                            .as_bytes(),
                                    );
                                }
                                Err(e) => {
                                    let response = IpcResponse {
                                        status: "error".to_string(),
                                        data: Some(serde_json::json!({"error": e})),
                                    };
                                    let _ = stream.write_all(
                                        format!("{}\n", serde_json::to_string(&response).unwrap())
                                            .as_bytes(),
                                    );
                                }
                            }
                        }
                        _ => {
                            // ignore unknown
                            let response = IpcResponse {
                                status: "ok".to_string(),
                                data: None,
                            };
                            let _ = stream.write_all(
                                format!("{}\n", serde_json::to_string(&response).unwrap())
                                    .as_bytes(),
                            );
                        }
                    }
                } else {
                    let response = IpcResponse {
                        status: "error".to_string(),
                        data: Some(serde_json::json!({"error": "Invalid JSON"})),
                    };
                    let _ = stream.write_all(
                        format!("{}\n", serde_json::to_string(&response).unwrap()).as_bytes(),
                    );
                }
            }
            Err(_) => break,
        }
    }
    let _ = peer; // reserved for future logging
}

pub fn start_ipc_server(app: AppHandle) {
    // Check if dev mode is enabled at startup
    let dev_mode_enabled = std::env::var("DEV_MODE").is_ok();

    // Fixed localhost port; can be made configurable later
    let addr = "127.0.0.1:39871";
    let listener = match TcpListener::bind(addr) {
        Ok(l) => l,
        Err(e) => {
            eprintln!("IPC: failed to bind {}: {}", addr, e);
            return;
        }
    };
    thread::spawn(move || {
        for stream in listener.incoming() {
            match stream {
                Ok(s) => {
                    let app_clone = app.clone();
                    thread::spawn(move || handle_client(s, app_clone, dev_mode_enabled));
                }
                Err(e) => {
                    eprintln!("IPC: connection failed: {}", e);
                }
            }
        }
    });
}
