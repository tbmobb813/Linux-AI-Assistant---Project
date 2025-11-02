# Development Scripts and Tools

This directory contains development scripts, testing utilities, and helper tools for the Linux AI Assistant project.

## Table of Contents

- [Development Scripts](#development-scripts)
- [Testing Tools](#testing-tools)
- [Database Utilities](#database-utilities)
- [Build and Deployment](#build-and-deployment)
- [Troubleshooting](#troubleshooting)

## Development Scripts

### `run-dev.sh`

Main development startup script that handles environment setup and launches the development server.

```bash
# Start development environment
./dev/run-dev.sh

# What it does:
# - Checks for required dependencies
# - Sets up environment variables
# - Starts the Tauri development server
# - Handles snap/library compatibility issues
```

### `tauri-dev.sh`

Wrapper script for running Tauri development server with system library compatibility fixes.

```bash
# Run with library preload (default)
./dev/tauri-dev.sh

# Run without preload
./dev/tauri-dev.sh --no-preload

# Features:
# - Automatic libpthread.so.0 detection and preload
# - Works around snap packaging library conflicts
# - Fallback to standard tauri dev if preload fails
```

## Testing Tools

### `smoke_test_ipc.sh`

Comprehensive end-to-end testing script for IPC functionality and CLI integration.

```bash
# Run all smoke tests
./dev/smoke_test_ipc.sh

# Test coverage:
# - Backend startup with DEV_MODE=1
# - IPC server binding and connectivity
# - CLI command execution (create, last, notify)
# - Message creation and retrieval
# - Error handling and cleanup
```

**Test scenarios:**

1. Backend process startup
2. IPC server port binding (39871)
3. CLI notify command
4. CLI create command (DEV_MODE)
5. CLI last command validation
6. Message content verification
7. Process cleanup
8. Exit code validation

### Manual Testing Commands

```bash
# Test IPC connectivity
ss -ltnp | grep 39871

# Test CLI commands individually
cd linux-ai-assistant/cli
cargo run -- notify "Test message"
cargo run -- last
DEV_MODE=1 cargo run -- create "Test assistant message"

# Debug with logging
RUST_LOG=debug cargo run -- ask "Test question"
```

## Database Utilities

### `insert_test_message.py`

Python script for inserting test messages directly into the SQLite database for development and testing.

```bash
# Insert a test message into a new conversation
python3 dev/insert_test_message.py --content "Automated test assistant message."

# Insert a message into an existing conversation
python3 dev/insert_test_message.py --content "Msg" --conversation-id <conversation-id>

# From the frontend package you can run the pnpm script:
pnpm -w -C linux-ai-assistant run dev:insert-message -- --content "Message here"

# Features:
# - Creates test conversation if needed
# - Inserts realistic test data
# - Proper UUID generation
# - Timestamp handling
```

**Database operations:**

- Creates `conversations` table entry
- Inserts `messages` with proper foreign keys
- Uses realistic AI assistant response content
- Maintains database integrity

## DEV_MODE Environment Variable

Several development features are gated behind the `DEV_MODE` environment variable:

- **IPC create handler**: The backend's TCP IPC server includes a "create" command that allows programmatic insertion of conversations and messages. This is only available when `DEV_MODE=1` is set.

To enable dev mode:

```bash
export DEV_MODE=1
# Then start the backend or dev environment
pnpm -w -C linux-ai-assistant run run-dev
```

## Build and Deployment

### Package Building

```bash
# Frontend build
cd linux-ai-assistant
pnpm build

# Tauri build (creates AppImage, DEB, RPM)
pnpm run tauri build

# CLI build
cd linux-ai-assistant/cli
cargo build --release
```

### Development Workflow

```bash
# Full development setup
pnpm -w install                    # Install dependencies
pnpm -w -C linux-ai-assistant run typecheck  # Type checking
pnpm -w -C linux-ai-assistant test # Run tests
./dev/run-dev.sh                   # Start development server

# CLI development
cd linux-ai-assistant/cli
cargo build                        # Build CLI
cargo test                         # Run tests
cargo clippy                       # Lint check
```

## Troubleshooting

### Common Issues

**1. Library Symbol Errors**

```bash
# Error: GLIBC_PRIVATE symbol lookup error
# Solution: Use the wrapper script
./dev/tauri-dev.sh
```

**2. IPC Connection Refused**

```bash
# Error: connect 127.0.0.1:39871 failed
# Solution: Ensure backend is running
pnpm -w -C linux-ai-assistant run tauri -- dev
```

**3. DEV_MODE Commands Fail**

```bash
# Error: create command only available in DEV_MODE
# Solution: Enable development mode
export DEV_MODE=1
```

**4. Snap Environment Issues**

```bash
# Run from system terminal (not snap-wrapped VS Code)
# Use the tauri-dev.sh wrapper script
```

### Debug Information Collection

```bash
# System information
uname -a
ldd --version

# Process information
ps aux | grep linux-ai-assistant
ss -ltnp | grep 39871

# Log collection
RUST_LOG=debug ./dev/run-dev.sh 2>&1 | tee debug.log
```

## Environment Variables

| Variable       | Purpose                     | Example                  |
| -------------- | --------------------------- | ------------------------ |
| `DEV_MODE`     | Enable development features | `DEV_MODE=1`             |
| `RUST_LOG`     | Control Rust logging level  | `RUST_LOG=debug`         |
| `LAI_IPC_HOST` | Override IPC host           | `LAI_IPC_HOST=127.0.0.1` |
| `LAI_IPC_PORT` | Override IPC port           | `LAI_IPC_PORT=39871`     |

## Script Dependencies

### System Requirements

```bash
# Ubuntu/Debian
sudo apt install build-essential libssl-dev libsqlite3-dev

# Fedora
sudo dnf install gcc openssl-devel sqlite-devel

# Common tools
cargo --version    # Rust toolchain
node --version     # Node.js 18+
pnpm --version     # Package manager
python3 --version  # Python 3.8+
```

## CI/CD Integration

These scripts are used in the CI/CD pipeline:

```yaml
# GitHub Actions usage
- name: Run smoke tests
  run: ./dev/smoke_test_ipc.sh

- name: Start development server
  run: ./dev/run-dev.sh &
```

## File Structure

```
dev/
├── README.md                 # This file
├── run-dev.sh               # Main development script
├── tauri-dev.sh             # Tauri wrapper with compatibility fixes
├── smoke_test_ipc.sh        # End-to-end IPC testing
├── insert_test_message.py   # Database test data utility
└── logs/                    # Development logs (gitignored)
```

## Contributing

When adding new development scripts:

1. Follow the existing naming convention
2. Add comprehensive error handling
3. Include usage documentation
4. Test on multiple Linux distributions
5. Update this README

---

**Last Updated**: November 2025  
**Version**: 2.0 (IPC-based development tools)
