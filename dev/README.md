# Dev helpers

This folder contains small development utilities that are safe to use locally and are not intended for production packaging.

## DEV_MODE Environment Variable

Several development features are gated behind the `DEV_MODE` environment variable:

- **IPC create handler**: The backend's TCP IPC server includes a "create" command that allows programmatic insertion of conversations and messages. This is only available when `DEV_MODE=1` is set.

To enable dev mode:

```bash
export DEV_MODE=1
# Then start the backend or dev environment
pnpm -w -C linux-ai-assistant run run-dev
```

## insert_test_message.py

A small Python helper to insert a conversation and an assistant message into the app's development database at `~/.local/share/com.linuxai.assistant/database.db`.

Usage:

```bash
# Insert a message into a new conversation
python3 dev/insert_test_message.py --content "Automated test assistant message."

# Insert a message into an existing conversation
python3 dev/insert_test_message.py --content "Msg" --conversation-id <conversation-id>

# From the frontend package you can run the pnpm script (project root):
pnpm -w -C linux-ai-assistant run dev:insert-message -- --content "Message here"
```

## smoke_test_ipc.sh

Automated smoke test for the IPC create/last functionality. Starts the backend with a temporary database, uses the CLI to create and retrieve messages, then cleans up.

```bash
# Run manually
bash dev/smoke_test_ipc.sh

# Run via CI (triggered by PR label 'run-dev-smoke' or manual workflow dispatch)
```

Notes:

- This script requires Python 3 and the built-in `sqlite3` module (available in the standard library).
- The script is intentionally under `dev/` and should not be included in release builds.
- Dev features require `DEV_MODE=1` to be set in the environment.
