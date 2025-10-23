#!/bin/bash
# Linux AI Assistant - Complete Setup Script
# This script will set up your development environment on Zorin OS/Ubuntu-based systems

set -e  # Exit on any error

echo "🚀 Starting Linux AI Assistant Development Setup..."
echo ""

# Colors for output
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

# Step 1: Check and install system dependencies
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

# Step 2: Install Rust if not present
print_step "Checking for Rust installation..."

if ! command -v rustc &> /dev/null; then
    print_step "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
    print_success "Rust installed successfully"
else
    print_success "Rust is already installed ($(rustc --version))"
fi

# Ensure cargo is in PATH
export PATH="$HOME/.cargo/bin:$PATH"

# Step 3: Install Node.js via nvm
print_step "Checking for Node.js installation..."

if ! command -v node &> /dev/null; then
    print_step "Installing nvm and Node.js..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    nvm install --lts
    nvm use --lts
    print_success "Node.js installed successfully"
else
    print_success "Node.js is already installed ($(node --version))"
fi

# Step 4: Install Tauri CLI
print_step "Installing Tauri CLI..."
cargo install tauri-cli --version "^2.0.0"
print_success "Tauri CLI installed"

# Step 5: Create project directory
print_step "Creating project structure..."

PROJECT_NAME="linux-ai-assistant"
if [ -d "$PROJECT_NAME" ]; then
    print_error "Directory $PROJECT_NAME already exists. Please remove it or choose a different name."
    exit 1
fi

mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME"

# Step 6: Initialize Tauri project
print_step "Initializing Tauri project with React and TypeScript..."

# Create package.json
cat > package.json << 'EOF'
{
  "name": "linux-ai-assistant",
  "version": "0.1.0",
  "description": "A native Linux desktop AI assistant",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-notification": "^2.0.0",
    "@tauri-apps/plugin-global-shortcut": "^2.0.0",
    "zustand": "^4.5.2",
    "react-markdown": "^9.0.1",
    "rehype-highlight": "^7.0.0",
    "rehype-katex": "^7.0.0",
    "remark-gfm": "^4.0.0",
    "remark-math": "^6.0.0",
    "lucide-react": "^0.263.1"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.3",
    "vite": "^5.3.4",
    "tailwindcss": "^3.4.4",
    "postcss": "^8.4.39",
    "autoprefixer": "^10.4.19"
  }
}
EOF

print_success "package.json created"

# Step 7: Install npm dependencies
print_step "Installing Node.js dependencies (this may take a few minutes)..."
npm install
print_success "Node.js dependencies installed"

# Step 8: Create Vite config
print_step "Creating Vite configuration..."

cat > vite.config.ts << 'EOF'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
EOF

print_success "Vite config created"

# Step 9: Create TypeScript config
print_step "Creating TypeScript configuration..."

cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

cat > tsconfig.node.json << 'EOF'
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
EOF

print_success "TypeScript configs created"

# Step 10: Initialize Tailwind CSS
print_step "Setting up Tailwind CSS..."

npx tailwindcss init -p

cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

print_success "Tailwind CSS configured"

# Step 11: Create source directories
print_step "Creating project structure..."

mkdir -p src/{components/{chat,settings,sidebar,common},lib/{api,stores,utils},styles}
mkdir -p public

# Step 12: Create main HTML file
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Linux AI Assistant</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# Step 13: Create global styles
cat > src/styles/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  display: flex;
  min-width: 320px;
  min-height: 100vh;
}

#root {
  width: 100%;
  height: 100vh;
}
EOF

# Step 14: Create main React entry point
cat > src/main.tsx << 'EOF'
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF

# Step 15: Create basic App component
cat > src/App.tsx << 'EOF'
import { useState } from "react";

function App() {
  const [message, setMessage] = useState("");

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header className="p-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold">Linux AI Assistant</h1>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-6 mb-4">
            <p className="text-gray-300">
              Welcome to your Linux AI Assistant! 🚀
            </p>
            <p className="text-gray-400 text-sm mt-2">
              The application is now running. Start building your features!
            </p>
          </div>
        </div>
      </main>
      
      <footer className="p-4 border-t border-gray-700">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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

# Step 16: Initialize Tauri
print_step "Initializing Tauri backend..."

cargo tauri init --app-name "linux-ai-assistant" \
  --window-title "Linux AI Assistant" \
  --dist-dir "../dist" \
  --dev-path "http://localhost:1420" \
  --before-dev-command "npm run dev" \
  --before-build-command "npm run build" || true

# Step 17: Update Tauri config
print_step "Configuring Tauri..."

cat > src-tauri/tauri.conf.json << 'EOF'
{
  "productName": "linux-ai-assistant",
  "version": "0.1.0",
  "identifier": "com.linuxai.assistant",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:1420",
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

# Step 18: Create Cargo.toml for Tauri
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

# Step 19: Create basic Tauri main.rs
cat > src-tauri/src/main.rs << 'EOF'
// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Linux AI Assistant!", name)
}

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

# Step 20: Create CLI tool structure
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
    },
    /// Get the last response
    Last,
}

fn main() {
    let cli = Cli::parse();

    match &cli.command {
        Commands::Ask { message } => {
            println!("Asking: {}", message);
            println!("CLI tool ready for implementation!");
        }
        Commands::Last => {
            println!("Getting last response...");
            println!("CLI tool ready for implementation!");
        }
    }
}
EOF

print_success "CLI tool structure created"

# Step 21: Create README
cat > README.md << 'EOF'
# Linux AI Assistant

A native desktop AI assistant built specifically for Linux users.

## Features

- Multi-provider AI support (OpenAI, Anthropic, Gemini)
- Native Linux desktop integration
- Developer-optimized workflows
- Privacy-respecting local processing options
- CLI companion tool

## Development

### Prerequisites

- Rust 1.75+
- Node.js 18+
- System dependencies (installed via setup script)

### Running the App

```bash
# Development mode
npm run tauri dev

# Build for production
npm run tauri build
```

### Project Structure

```
linux-ai-assistant/
├── src/               # React frontend
├── src-tauri/         # Rust backend
├── cli/               # CLI companion tool
└── docs/              # Documentation
```

## Contributing

Contributions welcome! Please read CONTRIBUTING.md first.

## License

MIT
EOF

# Step 22: Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
target/

# Build outputs
dist/
src-tauri/target/

# Environment variables
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
EOF

print_success "Project files created"

# Final step
echo ""
echo "================================================================"
print_success "Setup complete! 🎉"
echo "================================================================"
echo ""
echo "Your project is ready at: $(pwd)"
echo ""
echo "Next steps:"
echo "  1. cd $PROJECT_NAME"
echo "  2. npm run tauri dev    # Start development server"
echo ""
echo "The app will open automatically when ready!"
echo ""
echo "Useful commands:"
echo "  npm run tauri dev       # Run in development mode"
echo "  npm run tauri build     # Build for production"
echo "  cd cli && cargo run     # Test CLI tool"
echo ""
echo "Documentation: See README.md and docs/ folder"
echo ""