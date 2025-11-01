#!/usr/bin/env bash
# dev/smoke_test_ipc.sh
# Smoke test that runs the backend with DEV_MODE=1 and a temp DB,
# uses CLI to create and retrieve messages, then cleans up.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CLI_DIR="$ROOT_DIR/linux-ai-assistant/cli"
TAURI_DIR="$ROOT_DIR/linux-ai-assistant/src-tauri"

# Create temp directory for test DB
TEMP_DIR=$(mktemp -d)
trap "rm -rf '$TEMP_DIR'" EXIT

echo "[smoke] Using temp directory: $TEMP_DIR"

# Override app data directory to use temp location
export XDG_DATA_HOME="$TEMP_DIR/.local/share"
export DEV_MODE=1

# Build CLI and backend
echo "[smoke] Building CLI..."
cd "$CLI_DIR"
cargo build --quiet

echo "[smoke] Building backend..."
cd "$TAURI_DIR"
cargo build --quiet

# Start backend in background
echo "[smoke] Starting backend with DEV_MODE=1..."
BACKEND_LOG="$TEMP_DIR/backend.log"
cargo run --quiet > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

# Function to cleanup backend
cleanup_backend() {
    if kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo "[smoke] Stopping backend (PID $BACKEND_PID)..."
        kill "$BACKEND_PID" || true
        wait "$BACKEND_PID" 2>/dev/null || true
    fi
}
trap cleanup_backend EXIT

# Wait for backend to start and bind IPC port
echo "[smoke] Waiting for IPC server to start..."
for i in {1..30}; do
    if ss -ltn | grep -q ":39871"; then
        echo "[smoke] IPC server is listening on port 39871"
        break
    fi
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo "[smoke] Backend process died, check logs:"
        cat "$BACKEND_LOG" || true
        exit 1
    fi
    sleep 0.5
done

if ! ss -ltn | grep -q ":39871"; then
    echo "[smoke] Timeout waiting for IPC server"
    cat "$BACKEND_LOG" || true
    exit 1
fi

# Test CLI create command
echo "[smoke] Testing CLI create command..."
cd "$CLI_DIR"
if ! cargo run --quiet -- create "Smoke test message from automated test"; then
    echo "[smoke] CLI create command failed"
    cat "$BACKEND_LOG" || true
    exit 1
fi

# Test CLI last command
echo "[smoke] Testing CLI last command..."
LAST_OUTPUT=$(cargo run --quiet -- last 2>/dev/null || echo "")
if [[ "$LAST_OUTPUT" != "Smoke test message from automated test" ]]; then
    echo "[smoke] CLI last command returned unexpected output: '$LAST_OUTPUT'"
    echo "[smoke] Expected: 'Smoke test message from automated test'"
    cat "$BACKEND_LOG" || true
    exit 1
fi

echo "[smoke] ✅ All tests passed!"
echo "[smoke] - Backend started successfully with DEV_MODE=1"
echo "[smoke] - IPC server bound to port 39871"
echo "[smoke] - CLI create command inserted message"
echo "[smoke] - CLI last command retrieved correct message"
