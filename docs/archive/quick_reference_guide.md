# !/bin/bash

# Quick Reference Commands for Linux AI Assistant Development

echo "=== Linux AI Assistant - Quick Reference ==="
echo ""

# DEVELOPMENT COMMANDS

echo "📦 Development Commands:"
echo " npm run tauri dev # Start development server"
echo " npm run tauri build # Build for production"
echo " npm run dev # Run Vite dev server only"
echo " npm run build # Build frontend only"
echo ""

# RUST COMMANDS

echo "🦀 Rust/Cargo Commands:"
echo " cargo check --manifest-path=./src-tauri/Cargo.toml # Check for errors"
echo " cargo build --manifest-path=./src-tauri/Cargo.toml # Build debug"
echo " cargo build --release --manifest-path=./src-tauri/Cargo.toml # Build release"
echo " cargo test --manifest-path=./src-tauri/Cargo.toml # Run tests"
echo " cargo clippy --manifest-path=./src-tauri/Cargo.toml # Lint code"
echo " cargo fmt --manifest-path=./src-tauri/Cargo.toml # Format code"
echo " cargo clean --manifest-path=./src-tauri/Cargo.toml # Clean build"
echo ""

# DATABASE COMMANDS

echo "💾 Database Commands:"
echo " # View database location"
echo " echo ~/.local/share/com.linuxai.assistant/database.db"
echo ""
echo " # Open database with sqlite3"
echo " sqlite3 ~/.local/share/com.linuxai.assistant/database.db"
echo ""
echo " # Useful SQL queries:"
echo " .tables # List all tables"
echo " SELECT _FROM conversations; # View conversations"
echo " SELECT_ FROM messages; # View messages"
echo " SELECT \* FROM settings; # View settings"
echo " .schema conversations # View table schema"
echo " DELETE FROM conversations; # Clear all conversations"
echo " .quit # Exit sqlite3"
echo ""

# GIT COMMANDS

echo "📝 Git Commands:"
echo " git status # Check status"
echo " git add . # Stage all changes"
echo " git commit -m 'message' # Commit changes"
echo " git log --oneline # View commit history"
echo " git diff # View changes"
echo ""

# FILE STRUCTURE COMMANDS

echo "📁 Quick File Creation:"
echo " # Create a new Rust module"
echo " touch src-tauri/src/module_name.rs"
echo " echo 'pub mod module_name;' >> src-tauri/src/main.rs"
echo ""
echo " # Create a new React component"
echo " touch src/components/ComponentName.tsx"
echo ""
echo " # Create a new store"
echo " touch src/lib/stores/storeName.ts"
echo ""

# DEBUGGING COMMANDS

echo "🔍 Debugging Commands:"
echo " # View Tauri logs"
echo " npm run tauri dev 2>&1 | tee tauri.log"
echo ""
echo " # Check for Rust errors"
echo " RUST_BACKTRACE=1 cargo run --manifest-path=./src-tauri/Cargo.toml"
echo ""
echo " # View frontend console (open in app DevTools)"
echo " # Right-click in app → Inspect Element → Console"
echo ""

# DEPENDENCY MANAGEMENT

echo "📚 Dependency Management:"
echo " # Add Rust dependency"
echo " cargo add package_name --manifest-path=./src-tauri/Cargo.toml"
echo ""
echo " # Add npm dependency"
echo " npm install package-name"
echo ""
echo " # Update dependencies"
echo " cargo update --manifest-path=./src-tauri/Cargo.toml"
echo " npm update"
echo ""

# CLEANING COMMANDS

echo "🧹 Cleaning Commands:"
echo " # Clean Rust build artifacts"
echo " cargo clean --manifest-path=./src-tauri/Cargo.toml"
echo ""
echo " # Clean npm cache"
echo " rm -rf node_modules package-lock.json"
echo " npm install"
echo ""
echo " # Reset database"
echo " rm ~/.local/share/com.linuxai.assistant/database.db"
echo ""
echo " # Full clean"
echo " cargo clean --manifest-path=./src-tauri/Cargo.toml && rm -rf node_modules dist"
echo ""

# TESTING COMMANDS

echo "🧪 Testing Commands:"
echo " # Run all Rust tests"
echo " cargo test --manifest-path=./src-tauri/Cargo.toml"
echo ""
echo " # Run specific Rust test"
echo " cargo test test_name --manifest-path=./src-tauri/Cargo.toml"
echo ""
echo " # Run with output"
echo " cargo test --manifest-path=./src-tauri/Cargo.toml -- --nocapture"
echo ""

# FORMATTING AND LINTING

echo "✨ Code Quality:"
echo " # Format Rust code"
echo " cargo fmt --manifest-path=./src-tauri/Cargo.toml"
echo ""
echo " # Lint Rust code"
echo " cargo clippy --manifest-path=./src-tauri/Cargo.toml -- -D warnings"
echo ""
echo " # Format TypeScript/React"
echo " npx prettier --write 'src/**/\*.{ts,tsx}'"
echo ""
echo " # Lint TypeScript/React"
echo " npx eslint 'src/**/\*.{ts,tsx}'"
echo ""

# USEFUL SHORTCUTS

echo "⌨️ VS Code Shortcuts:"
echo " Ctrl+Shift+B # Run build task"
echo " Ctrl+Shift+P # Command palette"
echo " Ctrl+` # Toggle terminal"
echo " Ctrl+P # Quick file open"
echo " Ctrl+Shift+F # Search in files"
echo " F5 # Start debugging"
echo " Ctrl+/ # Toggle comment"
echo " Ctrl+D # Select next occurrence"
echo ""

# PROJECT STRUCTURE

echo "🗂️ Key Directories:"
echo " src/ # React frontend"
echo " src/components/ # React components"
echo " src/lib/api/ # API wrappers"
echo " src/lib/stores/ # Zustand stores"
echo " src-tauri/ # Rust backend"
echo " src-tauri/src/database/ # Database layer"
echo " src-tauri/src/commands/ # Tauri commands"
echo " cli/ # CLI companion tool"
echo " .vscode/ # VS Code config"
echo ""

# PACKAGING COMMANDS

echo "📦 Building & Packaging:"
echo " # Build AppImage"
echo " npm run tauri build -- --target appimage"
echo ""
echo " # Build DEB package"
echo " npm run tauri build -- --target deb"
echo ""
echo " # Build both"
echo " npm run tauri build"
echo ""
echo " # Output location"
echo " echo 'src-tauri/target/release/bundle/'"
echo ""

# TROUBLESHOOTING

echo "🔧 Common Fixes:"
echo " # Fix: 'command not found'"
echo " source ~/.cargo/env"
echo " source ~/.bashrc"
echo ""
echo " # Fix: Permission denied"
echo " sudo chown -R $USER:$USER ~/.cargo ~/.nvm"
echo ""
echo " # Fix: Port already in use"
echo " killall -9 node"
echo " lsof -ti:1420 | xargs kill -9"
echo ""
echo " # Fix: Database locked"
echo " pkill -f linux-ai-assistant"
echo " rm ~/.local/share/com.linuxai.assistant/database.db-\*"
echo ""

# USEFUL ONE-LINERS

echo "💡 Useful One-Liners:"
echo " # Watch Rust files and rebuild"
echo " cargo watch -x 'build --manifest-path=./src-tauri/Cargo.toml'"
echo ""
echo " # Count lines of code"
echo " find src src-tauri/src -name '_.ts' -o -name '_.tsx' -o -name '\*.rs' | xargs wc -l"
echo ""
echo " # Find TODO comments"
echo " grep -rn 'TODO' src/ src-tauri/src/"
echo ""
echo " # View app size"
echo " du -sh src-tauri/target/release/bundle/"
echo ""

# CLI TOOL COMMANDS

echo "🖥️ CLI Tool Commands:"
echo " # Build CLI"
echo " cargo build --release --manifest-path=./cli/Cargo.toml"
echo ""
echo " # Run CLI"
echo " cargo run --manifest-path=./cli/Cargo.toml -- ask 'Hello'"
echo ""
echo " # Install CLI globally"
echo " cargo install --path ./cli"
echo " lai ask 'Hello'"
echo ""

echo "=== End of Quick Reference ==="
echo ""
echo "💡 Tip: Save this file and run it anytime with: ./quick-reference.sh"
echo "📖 For more details, see docs/ folder"
