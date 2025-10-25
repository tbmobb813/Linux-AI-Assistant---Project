#!/usr/bin/env bash
# dev/tauri-dev.sh
# Wrapper to run `pnpm -w -C linux-ai-assistant run tauri -- dev` with an LD_PRELOAD
# fallback that helps avoid Snap/libpthread GLIBC_PRIVATE symbol lookup errors on some systems.

set -euo pipefail
SCRIPT_NAME=$(basename "$0")
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/linux-ai-assistant"
PNPM_CMD="cd \"$FRONTEND_DIR\" && pnpm exec tauri dev"
# Candidate libpthread paths for common linux distros
CANDIDATES=(
  "/lib/x86_64-linux-gnu/libpthread.so.0"
  "/lib64/libpthread.so.0"
  "/lib/libpthread.so.0"
)

# Allow explicit override via env var
if [ -n "${TAURI_DEV_LIBPTHREAD-}" ]; then
  if [ -f "$TAURI_DEV_LIBPTHREAD" ]; then
    LIBPTHREAD="$TAURI_DEV_LIBPTHREAD"
  else
    echo "Warning: TAURI_DEV_LIBPTHREAD is set but file does not exist: $TAURI_DEV_LIBPTHREAD" >&2
  fi
fi

# Find existing libpthread from common candidates if not overridden
LIBPTHREAD="${LIBPTHREAD-}"
if [ -z "$LIBPTHREAD" ]; then
  for p in "${CANDIDATES[@]}"; do
    if [ -f "$p" ]; then
      LIBPTHREAD="$p"
      break
    fi
  done
fi

# Fallback: try ldconfig -p to locate libpthread
if [ -z "$LIBPTHREAD" ] && command -v ldconfig >/dev/null 2>&1; then
  # Sample ldconfig -p line: libpthread.so.0 (libc6,x86-64) => /lib/x86_64-linux-gnu/libpthread.so.0
  LD_PATH=$(ldconfig -p 2>/dev/null | awk '/libpthread.so.0/ {print $NF; exit}') || true
  if [ -n "$LD_PATH" ] && [ -f "$LD_PATH" ]; then
    LIBPTHREAD="$LD_PATH"
  fi
fi

usage() {
  cat <<EOF
$SCRIPT_NAME — run tauri dev with an LD_PRELOAD wrapper helpful on Snap-based systems.

Usage:
  $SCRIPT_NAME [--no-preload] [--help]

Options:
  --no-preload    Do NOT set LD_PRELOAD; run the tauri dev command directly.
  --help          Show this message.

Examples:
  $SCRIPT_NAME
  $SCRIPT_NAME --no-preload

Notes:
- If your system doesn't have issues with Snap-provided libs, you can use --no-preload.
- Prefer developing in the provided devcontainer for a reproducible environment.
EOF
}

if [ "${1-}" = "--help" ] || [ "${1-}" = "-h" ]; then
  usage
  exit 0
fi

NO_PRELOAD=0
if [ "${1-}" = "--no-preload" ]; then
  NO_PRELOAD=1
fi

# If user asked to skip preload, run directly
if [ "$NO_PRELOAD" -eq 1 ]; then
  echo "Running without LD_PRELOAD: $PNPM_CMD"
  exec sh -c "$PNPM_CMD"
fi

# If we found a candidate libpthread, use it. Otherwise run without preload but warn.
LOG="$REPO_ROOT/dev/tauri-dev.log"
if [ -n "$LIBPTHREAD" ]; then
  echo "Using LD_PRELOAD=$LIBPTHREAD"
  export LD_PRELOAD="$LIBPTHREAD"
else
  echo "Warning: couldn't locate a system libpthread to LD_PRELOAD." >&2
  echo "Attempting to run without LD_PRELOAD. If you see a symbol lookup error, try running this script inside the devcontainer or set LD_PRELOAD manually." >&2
fi

# Start the tauri dev process in the background so we can run smoke tests against the frontend.
echo "Starting tauri dev in $FRONTEND_DIR (logs -> $LOG)"
sh -c "$PNPM_CMD" >"$LOG" 2>&1 &
TAURI_PID=$!
echo "Started tauri dev (pid $TAURI_PID). Waiting for frontend to become available..."

# Run smoke test script that waits for the frontend / Vite server to respond.
SMOKE_SCRIPT="$REPO_ROOT/dev/smoke.sh"
if [ -x "$SMOKE_SCRIPT" ]; then
  if "$SMOKE_SCRIPT"; then
    echo "Smoke test passed: frontend reachable"
  else
    echo "Smoke test failed. Check logs: $LOG" >&2
  fi
else
  echo "Smoke script not executable or not found: $SMOKE_SCRIPT (skipping)"
fi

# Wait for the tauri dev process to exit so the script behaves like a long-running process.
wait $TAURI_PID
EXIT_CODE=$?
echo "tauri dev process exited with code $EXIT_CODE"
exit $EXIT_CODE
