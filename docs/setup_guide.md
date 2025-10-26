# !/bin/bash

## Linux AI Assistant - Setup Guide

This script contains helper steps to bootstrap the development environment

for the Linux AI Assistant project on Debian/Ubuntu-based systems

set -euo pipefail

echo "🚀 Starting Linux AI Assistant Development Setup..."
echo ""

## Colors for output

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_step() {
echo -e "${BLUE}==>${NC} $1"
}

print_success() {
echo -e "${GREEN}✓${NC} $1"
}

print_error() {
echo -e "${RED}✗${NC} $1"
}

## Step 1: Check and install system dependencies

print_step "Installing system dependencies..."

sudo apt update
sudo apt install -y \
 curl \
 wget \
 file \
 build-essential \
 libssl-dev \
 libgtk-3-dev \
 libwebkit2gtk-4.0-dev \
 libayatana-appindicator3-dev \
 librsvg2-dev \
 libsoup-3.0-dev \
 libjavascriptcoregtk-4.0-dev \
 pkg-config

print_success "System dependencies installed"

## Step 2: Install Rust if not present

print_step "Checking for Rust installation..."

if ! command -v rustc >/dev/null 2>&1; then
print_step "Installing Rust..."
curl --proto '=https' --tlsv1.2 -sSf <https://sh.rustup.rs> | sh -s -- -y

shellcheck disable=SC1090

source "$HOME/.cargo/env"
  print_success "Rust installed successfully"
else
  print_success "Rust is already installed ($(rustc --version))"
fi

Ensure cargo is in PATH

export PATH="$HOME/.cargo/bin:$PATH"

## Step 3: Install Node.js via nvm

print_step "Checking for Node.js installation..."

if ! command -v node >/dev/null 2>&1; then
print_step "Installing nvm and Node.js..."
curl -o- <https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh> | bash
export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

nvm install --lts
nvm use --lts
print_success "Node.js installed successfully"
else
print_success "Node.js is already installed ($(node --version))"
fi

## Step 4: Install Tauri CLI

print_step "Installing Tauri CLI..."
cargo install tauri-cli --version "2.9.1" || true
print_success "Tauri CLI installed (or already present)"

Additional notes

print_step "Quick start notes"
echo "- Use 'pnpm install' at the repo root to install workspace dependencies (preferred)."
echo "- Frontend package is in the 'linux-ai-assistant' subfolder. To run dev mode: 'pnpm --filter linux-ai-assistant dev'"
echo "- Use 'cargo build' in src-tauri to build the native parts."

print_success "Setup guide prepared"

          <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium">
            Send
          </button>
        </div>
      </footer>
    </div>

);
}

export default App;
EOF

print_success "React components created"

## Step 16: Initialize Tauri

print_step "Initializing Tauri backend..."

cargo tauri init --app-name "linux-ai-assistant" \
--window-title "Linux AI Assistant" \
 --dist-dir "../dist" \
--dev-path "<http://localhost:1420>" \

--dev-path <http://localhost:1420> \

> > > > > > > a5222fa (chore: add pnpm workspace configuration for linux-ai-assistant package)
> > > > > > > --before-dev-command "npm run dev" \

--before-build-command "npm run build" || true

--window-title "Linux AI Assistant" \
 --dist-dir "../dist" \
 --dev-path <http://localhost:1420> \
 --before-dev-command "npm run dev" \
 --before-build-command "npm run build" || true

> > > > > > > f5e45eb (chore: format repo with Prettier (auto-fix))

## Step 17: Update Tauri config

print_step "Configuring Tauri..."

cat > src-tauri/tauri.conf.json << 'EOF'
{
"productName": "linux-ai-assistant",
"version": "0.1.0",
"identifier": "com.linuxai.assistant",
"build": {
"beforeDevCommand": "npm run dev",
"beforeBuildCommand": "npm run build",
"devUrl": "<http://localhost:1420>",
"frontendDist": "../dist"
},
"bundle": {
"active": true,
"targets": ["appimage", "deb"],
"icon": [
"icons/32x32.png",
"icons/128x128.png",
"icons/128x128@2x.png",
"icons/icon.icns",
"icons/icon.ico"
]
},
"app": {
"windows": [
{
"title": "Linux AI Assistant",
"width": 1200,
"height": 800,
"resizable": true,
"fullscreen": false
}
],
"security": {
"csp": null
}
}
}
EOF

## Step 18: Create Cargo.toml for Tauri

cat > src-tauri/Cargo.toml << 'EOF'
[package]
name = "linux-ai-assistant"
version = "0.1.0"
description = "A native Linux desktop AI assistant"
authors = ["you"]
edition = "2021"

[build-dependencies]
tauri-build = { version = "2.0", features = [] }

[dependencies]
tauri = { version = "2.0", features = ["protocol-asset"] }
tauri-plugin-notification = "2.0"
tauri-plugin-global-shortcut = "2.0"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.12", features = ["json", "stream"] }
rusqlite = { version = "0.31", features = ["bundled"] }
keyring = "2.3"

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
EOF

## Step 19: Create basic Tauri main.rs

cat > src-tauri/src/main.rs << 'EOF'
// Prevents additional console window on Windows in release

#[tauri::command]

![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

[tauri::command]

> > > > > > > a5222fa (chore: add pnpm workspace configuration for linux-ai-assistant package)
> > > > > > > fn greet(name: &str) -> String {
> > > > > > > format!("Hello, {}! Welcome to Linux AI Assistant!", name)
> > > > > > > }

fn main() {
tauri::Builder::default()
.plugin(tauri_plugin_notification::init())
.plugin(tauri_plugin_global_shortcut::Builder::new().build())
.invoke_handler(tauri::generate_handler![greet])
.run(tauri::generate_context!())
.expect("error while running tauri application");
}
EOF

print_success "Tauri backend configured"

## Step 20: Create CLI tool structure

print_step "Creating CLI companion tool structure..."

mkdir -p cli/src

cat > cli/Cargo.toml << 'EOF'
[package]
name = "linux-ai-cli"
version = "0.1.0"
edition = "2021"

[dependencies]
clap = { version = "4.5", features = ["derive"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
EOF

cat > cli/src/main.rs << 'EOF'
use clap::{Parser, Subcommand};
