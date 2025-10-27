use serde_json::Value as JsonValue;
use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};
use std::thread;
use tauri::{AppHandle, Emitter};

#[derive(serde::Deserialize, Debug)]
struct IpcMessage {
    #[serde(rename = "type")]
    kind: String,
    #[serde(default)]
    message: Option<String>,
    #[serde(default)]
    payload: Option<JsonValue>,
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
                        }
                        "ask" => {
                            // Forward either the provided payload object, or the message string
                            if let Some(p) = msg.payload {
                                let _ = app.emit("cli://ask", p);
                            } else {
                                let _ = app.emit("cli://ask", msg.message.unwrap_or_default());
                            }
                        }
                        _ => {
                            // ignore unknown
                        }
                    }
                }
                let _ = stream.write_all(b"ok\n");
            }
            Err(_) => break,
        }
    }
    let _ = peer; // reserved for future logging
}

pub fn start_ipc_server(app: AppHandle) {
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
                    thread::spawn(move || handle_client(s, app_clone));
                }
                Err(e) => {
                    eprintln!("IPC: connection failed: {}", e);
                }
            }
        }
    });
}
