#!/usr/bin/env bash
# dev/run-dev.sh
# Start the frontend dev server, wait for it to be reachable, then start the Tauri backend
# Usage: ./dev/run-dev.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/linux-ai-assistant"
# Allow overriding the frontend port with environment variables. Check in this order:
# FRONTEND_PORT (explicit), VITE_PORT (common), PORT (env), default 1420 (set in vite.config.ts)
if [ -n "${FRONTEND_PORT:-}" ]; then
  PORT_VAL="$FRONTEND_PORT"
elif [ -n "${VITE_PORT:-}" ]; then
  PORT_VAL="$VITE_PORT"
elif [ -n "${PORT:-}" ]; then
  PORT_VAL="$PORT"
else
  PORT_VAL=1420
fi

FRONTEND_URL="http://localhost:${PORT_VAL}"

# Helper: check if a given TCP port is in use on localhost
is_port_in_use() {
  local port=$1
  if command -v ss >/dev/null 2>&1; then
    ss -ltn "sport = :$port" | grep -q LISTEN && return 0 || return 1
  elif command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN -Pn >/dev/null 2>&1 && return 0 || return 1
  else
    # Fallback: try to connect with /dev/tcp
    (echo > /dev/tcp/127.0.0.1/$port) >/dev/null 2>&1 && return 0 || return 1
  fi
}

# Find next free port starting from PORT_VAL (inclusive)
find_free_port() {
  local start=$1
  local p=$start
  while [ $p -le 65535 ]; do
    if ! is_port_in_use $p; then
      echo $p
      return 0
    fi
    p=$((p + 1))
  done
  return 1
}

echo "[dev] Starting frontend in $FRONTEND_DIR"
cd "$FRONTEND_DIR"

# If node_modules missing, warn (don't auto-install to avoid messing with CI flows)
if [ ! -d node_modules ]; then
  echo "[dev] Warning: node_modules not found. Run 'npm ci' or 'npm install' in $FRONTEND_DIR if needed."
fi

# If the desired port is in use, find a free port and export it for Vite to use.
if is_port_in_use "$PORT_VAL"; then
  NEW_PORT=$(find_free_port $PORT_VAL)
  if [ -n "$NEW_PORT" ]; then
    echo "[dev] Port $PORT_VAL in use; using free port $NEW_PORT instead"
    PORT_VAL=$NEW_PORT
  else
    echo "[dev] No free port found starting at $PORT_VAL; aborting"
    exit 1
  fi
fi
FRONTEND_URL="http://localhost:${PORT_VAL}"

export PORT="$PORT_VAL"
export VITE_PORT="$PORT_VAL"
echo "[dev] Starting frontend on port $PORT_VAL"
# Pass the port to Vite via npm so it overrides the config's strictPort
npm run dev -- --port "$PORT_VAL" &
FRONTEND_PID=$!
echo "[dev] Frontend pid=$FRONTEND_PID"

cleanup() {
  echo "[dev] Cleaning up..."
  if ps -p $FRONTEND_PID > /dev/null 2>&1; then
    echo "[dev] Killing frontend pid $FRONTEND_PID"
    kill $FRONTEND_PID || true
  fi
}
trap cleanup EXIT INT TERM

echo "[dev] Waiting for frontend to become available at $FRONTEND_URL"
for i in {1..60}; do
  if curl --silent --head --fail "$FRONTEND_URL" >/dev/null 2>&1; then
    echo "[dev] Frontend is up"
    break
  fi
  sleep 1
done

if ! curl --silent --head --fail "$FRONTEND_URL" >/dev/null 2>&1; then
  echo "[dev] Timeout waiting for frontend at $FRONTEND_URL"
  exit 1
fi

echo "[dev] Starting Tauri backend (cargo run) with LD env cleared to avoid snap/glibc conflicts"
cd "$ROOT_DIR/linux-ai-assistant"

# Ensure logs directory exists
mkdir -p "$ROOT_DIR/dev/logs"

# Start optional additional services in dev/services.d/*.sh (if present)
if [ -d "$ROOT_DIR/dev/services.d" ]; then
  echo "[dev] Starting additional services from dev/services.d/"
  for svc in "$ROOT_DIR"/dev/services.d/*.sh; do
    [ -f "$svc" ] || continue
    echo "[dev] Starting service: $svc"
    bash "$svc" >> "$ROOT_DIR/dev/logs/$(basename "$svc").log" 2>&1 &
    svc_pid=$!
    echo "[dev] Service $svc pid=$svc_pid"
    SERVICE_PIDS+="$svc_pid "
  done
fi

# Start backend in a sanitized environment to reduce chances of Snap/libc interference.
# Preserve PATH, HOME, and GUI-related env vars so GTK can initialize (DISPLAY/Wayland/DBUS).
echo "[dev] Starting backend; logs: $ROOT_DIR/dev/logs/backend.log"
env -i \
  PATH="$PATH" \
  HOME="$HOME" \
  DISPLAY="${DISPLAY:-}" \
  WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-}" \
  XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-}" \
  DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-}" \
  XAUTHORITY="${XAUTHORITY:-}" \
  bash -lc 'unset LD_LIBRARY_PATH LD_PRELOAD; exec cargo run --manifest-path=src-tauri/Cargo.toml' >> "$ROOT_DIR/dev/logs/backend.log" 2>&1 &
BACKEND_PID=$!
echo "[dev] Backend pid=$BACKEND_PID"

echo "[dev] All processes started. Frontend: $FRONTEND_PID, Backend: $BACKEND_PID, Services: ${SERVICE_PIDS:-none}"

echo "[dev] Backend logs (tail):"
sleep 1
tail -n 20 "$ROOT_DIR/dev/logs/backend.log" || true

# Wait for background processes (frontend and backend) until one exits
wait -n $FRONTEND_PID $BACKEND_PID ${SERVICE_PIDS:-}

echo "[dev] One of the background processes exited; cleaning up"
cleanup

exit 0
