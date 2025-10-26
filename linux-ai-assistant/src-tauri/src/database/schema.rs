use rusqlite::{Connection, Result};

pub fn create_tables(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            model TEXT NOT NULL,
            provider TEXT NOT NULL,
            system_prompt TEXT,
            deleted INTEGER NOT NULL DEFAULT 0,
            deleted_at INTEGER
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
            content TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            tokens_used INTEGER,
            deleted INTEGER NOT NULL DEFAULT 0,
            deleted_at INTEGER,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_messages_conversation 
         ON messages(conversation_id, timestamp)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_conversations_updated 
         ON conversations(updated_at DESC)",
        [],
    )?;

    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts 
         USING fts5(content, conversation_id, tokenize='porter')",
        [],
    )?;

    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS messages_fts_insert 
         AFTER INSERT ON messages
         BEGIN
            INSERT INTO messages_fts(rowid, content, conversation_id)
            VALUES (NEW.rowid, NEW.content, NEW.conversation_id);
         END",
        [],
    )?;

    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS messages_fts_delete 
         AFTER DELETE ON messages
         BEGIN
            DELETE FROM messages_fts WHERE rowid = OLD.rowid;
         END",
        [],
    )?;

    Ok(())
}
