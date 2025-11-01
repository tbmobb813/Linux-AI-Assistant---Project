#!/usr/bin/env python3
"""
Dev helper: insert_test_message.py
Inserts a conversation + assistant message into the app's SQLite DB located at
~/.local/share/com.linuxai.assistant/database.db. This is intended for dev machines
that don't have the sqlite3 CLI available.

Usage:
  python3 dev/insert_test_message.py "Message content here"
  python3 dev/insert_test_message.py --content "Message" --conversation-id <id>

If --conversation-id is omitted the script creates a new conversation and prints its id.
"""

import argparse
import os
import sqlite3
import uuid
import time

DB_PATH = os.path.expanduser("~/.local/share/com.linuxai.assistant/database.db")

parser = argparse.ArgumentParser(description="Insert a test assistant message into app DB")
parser.add_argument("--content", "-c", required=False, help="Message content")
parser.add_argument("--conversation-id", "-i", required=False, help="Existing conversation id to use")
args = parser.parse_args()

content = args.content
if not content:
    # Try positional
    import sys
    if len(sys.argv) > 1 and not sys.argv[1].startswith("-"):
        content = sys.argv[1]

if not content:
    print("Error: no content provided. Usage: python3 dev/insert_test_message.py --content '...'")
    raise SystemExit(1)

if not os.path.exists(DB_PATH):
    print(f"Database not found at {DB_PATH}")
    raise SystemExit(1)

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cid = args.conversation_id
now = int(time.time())
if not cid:
    cid = str(uuid.uuid4())
    cur.execute(
        "INSERT INTO conversations (id, title, created_at, updated_at, model, provider, system_prompt) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (cid, 'Dev Test Conversation', now, now, 'gpt-test', 'local', None),
    )

mid = str(uuid.uuid4())
cur.execute(
    "INSERT INTO messages (id, conversation_id, role, content, timestamp, tokens_used) VALUES (?, ?, ?, ?, ?, ?)",
    (mid, cid, 'assistant', content, now, None),
)
conn.commit()
print(f"Inserted message {mid} into conversation {cid}")
conn.close()
