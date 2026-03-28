"""
Database setup and connection helpers.
Uses SQLite for simplicity — swap for Postgres in production.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "orders.db")


def get_connection() -> sqlite3.Connection:
    """Return a new SQLite connection."""
    return sqlite3.connect(DB_PATH)


def init_db() -> None:
    """Create the orders table if it doesn't already exist."""
    conn = get_connection()
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                term TEXT NOT NULL,
                amount REAL NOT NULL,
                yield_rate REAL,
                submitted_at TEXT NOT NULL,
                notes TEXT
            )
        """)
        conn.commit()
    finally:
        conn.close()
