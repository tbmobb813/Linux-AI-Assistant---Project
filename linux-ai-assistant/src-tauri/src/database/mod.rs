// src-tauri/src/database/mod.rs
// Database module: declare submodules and provide the Database manager.

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

