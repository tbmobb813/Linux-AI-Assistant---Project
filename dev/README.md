# Dev helpers

This folder contains small development utilities that are safe to use locally and are not intended for production packaging.

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

Notes:

- This script requires Python 3 and the builtin `sqlite3` module (available in the standard library).
- The script is intentionally under `dev/` and should not be included in release builds.
