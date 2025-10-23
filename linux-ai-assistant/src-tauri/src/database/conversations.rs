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
    pub fn create(conn: &Connection, new_conv: NewConversation) -> Result<Self> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        let id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO conversations (id, title, created_at, updated_at, model, provider, system_prompt)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![&id, &new_conv.title, now, now, &new_conv.model, &new_conv.provider, &new_conv.system_prompt],
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

    pub fn get_by_id(conn: &Connection, id: &str) -> Result<Option<Self>> {
        let mut stmt = conn.prepare("SELECT id, title, created_at, updated_at, model, provider, system_prompt FROM conversations WHERE id = ?1")?;
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

    pub fn get_all(conn: &Connection, limit: i64) -> Result<Vec<Self>> {
        let mut stmt = conn.prepare("SELECT id, title, created_at, updated_at, model, provider, system_prompt FROM conversations ORDER BY updated_at DESC LIMIT ?1")?;
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

    pub fn delete(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM conversations WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn search(conn: &Connection, query: &str, limit: i64) -> Result<Vec<Self>> {
        let search_pattern = format!("%{}%", query);
        let mut stmt = conn.prepare("SELECT id, title, created_at, updated_at, model, provider, system_prompt FROM conversations WHERE title LIKE ?1 ORDER BY updated_at DESC LIMIT ?2")?;
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
