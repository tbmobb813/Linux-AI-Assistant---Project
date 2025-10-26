#!/usr/bin/env bash
# Simple smoke test for the dev server + frontend.
# Waits for http://localhost:1420 to respond with HTML and exits 0 on success.

set -eu
FRONTEND_URL="http://localhost:1420"
TIMEOUT=30
SLEEP=1
elapsed=0

echo "Waiting for frontend at ${FRONTEND_URL} (timeout ${TIMEOUT}s) ..."
while [ $elapsed -lt $TIMEOUT ]; do
  if curl -sSf -o /tmp/_frontend_index.html "$FRONTEND_URL"; then
    if grep -qi "<!doctype html\|<html" /tmp/_frontend_index.html; then
      echo "Frontend responded with HTML — smoke test PASSED"
      rm -f /tmp/_frontend_index.html
      exit 0
    fi
  fi
  sleep $SLEEP
  elapsed=$((elapsed + SLEEP))
done

echo "Timed out waiting for frontend at ${FRONTEND_URL} — smoke test FAILED" >&2
exit 2
