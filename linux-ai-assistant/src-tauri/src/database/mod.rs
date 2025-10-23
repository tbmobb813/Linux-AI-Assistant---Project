// src-tauri/src/database/mod.rs
// Main database module - exports all database functionality

pub mod conversations;
pub mod messages;
pub mod schema;
pub mod settings;

use rusqlite::{Connection, Result};
use std::path::PathBuf;
use std::sync::Mutex;

/// Database manager that holds the connection
pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    /// Initialize the database with schema
    pub fn new(db_path: PathBuf) -> Result<Self> {
        let conn = Connection::open(db_path)?;

        // Enable foreign keys
        conn.execute("PRAGMA foreign_keys = ON", [])?;

        // Initialize schema
        schema::create_tables(&conn)?;

        Ok(Database {
            conn: Mutex::new(conn),
        })
    }

    /// Get a reference to the connection
    pub fn conn(&self) -> &Mutex<Connection> {
        &self.conn
    }
}

// src-tauri/src/database/schema.rs
// Database schema definitions and migrations

use rusqlite::{Connection, Result};

pub fn create_tables(conn: &Connection) -> Result<()> {
    // Conversations table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            model TEXT NOT NULL,
            provider TEXT NOT NULL,
            system_prompt TEXT
        )",
        [],
    )?;

    // Messages table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
            content TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            tokens_used INTEGER,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Settings table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )?;

    // Create indexes for better query performance
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

    // Full-text search for messages
    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts 
         USING fts5(content, conversation_id, tokenize='porter')",
        [],
    )?;

    // Trigger to keep FTS table in sync
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

// src-tauri/src/database/conversations.rs
// Conversation CRUD operations

use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub model: String,
    pub provider: String,
    pub system_prompt: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewConversation {
    pub title: String,
    pub model: String,
    pub provider: String,
    pub system_prompt: Option<String>,
}

impl Conversation {
    /// Create a new conversation
    pub fn create(conn: &Connection, new_conv: NewConversation) -> Result<Self> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let id = uuid::Uuid::new_v4().to_string();

        conn.execute(
            "INSERT INTO conversations (id, title, created_at, updated_at, model, provider, system_prompt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                &id,
                &new_conv.title,
                now,
                now,
                &new_conv.model,
                &new_conv.provider,
                &new_conv.system_prompt,
            ],
        )?;

        Ok(Conversation {
            id,
            title: new_conv.title,
            created_at: now,
            updated_at: now,
            model: new_conv.model,
            provider: new_conv.provider,
            system_prompt: new_conv.system_prompt,
        })
    }

    /// Get a conversation by ID
    pub fn get_by_id(conn: &Connection, id: &str) -> Result<Option<Self>> {
        let mut stmt = conn.prepare(
            "SELECT id, title, created_at, updated_at, model, provider, system_prompt
             FROM conversations WHERE id = ?1",
        )?;

        let mut rows = stmt.query(params![id])?;

        if let Some(row) = rows.next()? {
            Ok(Some(Conversation {
                id: row.get(0)?,
                title: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
                model: row.get(4)?,
                provider: row.get(5)?,
                system_prompt: row.get(6)?,
            }))
        } else {
            Ok(None)
        }
    }

    /// Get all conversations ordered by most recent
    pub fn get_all(conn: &Connection, limit: i64) -> Result<Vec<Self>> {
        let mut stmt = conn.prepare(
            "SELECT id, title, created_at, updated_at, model, provider, system_prompt
             FROM conversations 
             ORDER BY updated_at DESC 
             LIMIT ?1",
        )?;

        let conversations = stmt.query_map(params![limit], |row| {
            Ok(Conversation {
                id: row.get(0)?,
                title: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
                model: row.get(4)?,
                provider: row.get(5)?,
                system_prompt: row.get(6)?,
            })
        })?;

        conversations.collect()
    }

    /// Update conversation title
    pub fn update_title(conn: &Connection, id: &str, new_title: &str) -> Result<()> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        conn.execute(
            "UPDATE conversations SET title = ?1, updated_at = ?2 WHERE id = ?3",
            params![new_title, now, id],
        )?;
        Ok(())
    }

    /// Update conversation's updated_at timestamp
    pub fn touch(conn: &Connection, id: &str) -> Result<()> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        conn.execute(
            "UPDATE conversations SET updated_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;
        Ok(())
    }

    /// Delete a conversation and all its messages
    pub fn delete(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM conversations WHERE id = ?1", params![id])?;
        Ok(())
    }

    /// Search conversations by title
    pub fn search(conn: &Connection, query: &str, limit: i64) -> Result<Vec<Self>> {
        let search_pattern = format!("%{}%", query);
        let mut stmt = conn.prepare(
            "SELECT id, title, created_at, updated_at, model, provider, system_prompt
             FROM conversations 
             WHERE title LIKE ?1
             ORDER BY updated_at DESC 
             LIMIT ?2",
        )?;

        let conversations = stmt.query_map(params![search_pattern, limit], |row| {
            Ok(Conversation {
                id: row.get(0)?,
                title: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
                model: row.get(4)?,
                provider: row.get(5)?,
                system_prompt: row.get(6)?,
            })
        })?;

        conversations.collect()
    }
}

// src-tauri/src/database/messages.rs
// Message CRUD operations

use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub timestamp: i64,
    pub tokens_used: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewMessage {
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub tokens_used: Option<i64>,
}

impl Message {
    /// Create a new message
    pub fn create(conn: &Connection, new_msg: NewMessage) -> Result<Self> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let id = uuid::Uuid::new_v4().to_string();

        conn.execute(
            "INSERT INTO messages (id, conversation_id, role, content, timestamp, tokens_used)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                &id,
                &new_msg.conversation_id,
                &new_msg.role,
                &new_msg.content,
                now,
                new_msg.tokens_used,
            ],
        )?;

        // Update conversation's updated_at timestamp
        super::conversations::Conversation::touch(conn, &new_msg.conversation_id)?;

        Ok(Message {
            id,
            conversation_id: new_msg.conversation_id,
            role: new_msg.role,
            content: new_msg.content,
            timestamp: now,
            tokens_used: new_msg.tokens_used,
        })
    }

    /// Get all messages for a conversation
    pub fn get_by_conversation(conn: &Connection, conversation_id: &str) -> Result<Vec<Self>> {
        let mut stmt = conn.prepare(
            "SELECT id, conversation_id, role, content, timestamp, tokens_used
             FROM messages 
             WHERE conversation_id = ?1
             ORDER BY timestamp ASC",
        )?;

        let messages = stmt.query_map(params![conversation_id], |row| {
            Ok(Message {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                timestamp: row.get(4)?,
                tokens_used: row.get(5)?,
            })
        })?;

        messages.collect()
    }

    /// Get the last N messages from a conversation
    pub fn get_last_n(conn: &Connection, conversation_id: &str, n: i64) -> Result<Vec<Self>> {
        let mut stmt = conn.prepare(
            "SELECT id, conversation_id, role, content, timestamp, tokens_used
             FROM messages 
             WHERE conversation_id = ?1
             ORDER BY timestamp DESC
             LIMIT ?2",
        )?;

        let messages = stmt.query_map(params![conversation_id, n], |row| {
            Ok(Message {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                timestamp: row.get(4)?,
                tokens_used: row.get(5)?,
            })
        })?;

        let mut result: Vec<Self> = messages.collect::<Result<Vec<_>>>()?;
        result.reverse(); // Return in chronological order
        Ok(result)
    }

    /// Search messages using full-text search
    pub fn search(conn: &Connection, query: &str, limit: i64) -> Result<Vec<Self>> {
        let mut stmt = conn.prepare(
            "SELECT m.id, m.conversation_id, m.role, m.content, m.timestamp, m.tokens_used
             FROM messages m
             JOIN messages_fts fts ON m.rowid = fts.rowid
             WHERE messages_fts MATCH ?1
             ORDER BY m.timestamp DESC
             LIMIT ?2",
        )?;

        let messages = stmt.query_map(params![query, limit], |row| {
            Ok(Message {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                timestamp: row.get(4)?,
                tokens_used: row.get(5)?,
            })
        })?;

        messages.collect()
    }

    /// Delete a message
    pub fn delete(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM messages WHERE id = ?1", params![id])?;
        Ok(())
    }

    /// Get token count for a conversation
    pub fn get_conversation_token_count(conn: &Connection, conversation_id: &str) -> Result<i64> {
        let count: Option<i64> = conn.query_row(
            "SELECT SUM(tokens_used) FROM messages WHERE conversation_id = ?1",
            params![conversation_id],
            |row| row.get(0),
        )?;

        Ok(count.unwrap_or(0))
    }
}

// src-tauri/src/database/settings.rs
// Settings storage operations

use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize)]
pub struct Setting {
    pub key: String,
    pub value: String,
    pub updated_at: i64,
}

impl Setting {
    /// Set a setting value
    pub fn set(conn: &Connection, key: &str, value: &str) -> Result<()> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at)
             VALUES (?1, ?2, ?3)",
            params![key, value, now],
        )?;
        Ok(())
    }

    /// Get a setting value
    pub fn get(conn: &Connection, key: &str) -> Result<Option<String>> {
        let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
        let mut rows = stmt.query(params![key])?;

        if let Some(row) = rows.next()? {
            Ok(Some(row.get(0)?))
        } else {
            Ok(None)
        }
    }

    /// Get all settings
    pub fn get_all(conn: &Connection) -> Result<Vec<Self>> {
        let mut stmt = conn.prepare("SELECT key, value, updated_at FROM settings")?;

        let settings = stmt.query_map([], |row| {
            Ok(Setting {
                key: row.get(0)?,
                value: row.get(1)?,
                updated_at: row.get(2)?,
            })
        })?;

        settings.collect()
    }

    /// Delete a setting
    pub fn delete(conn: &Connection, key: &str) -> Result<()> {
        conn.execute("DELETE FROM settings WHERE key = ?1", params![key])?;
        Ok(())
    }

    /// Helper: Set JSON value
    pub fn set_json<T: Serialize>(conn: &Connection, key: &str, value: &T) -> Result<()> {
        let json = serde_json::to_string(value)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        Self::set(conn, key, &json)
    }

    /// Helper: Get JSON value
    pub fn get_json<T: for<'de> Deserialize<'de>>(
        conn: &Connection,
        key: &str,
    ) -> Result<Option<T>> {
        if let Some(json) = Self::get(conn, key)? {
            let value = serde_json::from_str(&json)
                .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
            Ok(Some(value))
        } else {
            Ok(None)
        }
    }
}
