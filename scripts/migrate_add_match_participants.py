"""
Database migration script to add match_participants table for doubles tracking.

This script creates the match_participants table to track individual players
in doubles matches.

Usage:
  python scripts/migrate_add_match_participants.py
"""

import sys
import os

# Add project root to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from api.db.session import engine


def run_migration():
  print("Starting migration: Add match_participants table...")

  with engine.connect() as conn:
    print("Creating 'match_participants' table...")
    try:
      conn.execute(text("""
        CREATE TABLE IF NOT EXISTS match_participants (
          id VARCHAR(32) PRIMARY KEY,
          match_id VARCHAR(32) NOT NULL,
          member_id VARCHAR(32) NOT NULL,
          team VARCHAR(10) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (match_id) REFERENCES league_matches(id) ON DELETE CASCADE,
          FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
        )
      """))
      conn.commit()
      print("✓ Created 'match_participants' table")
    except Exception as e:
      if "already exists" in str(e).lower():
        print("  Table 'match_participants' already exists, skipping...")
      else:
        raise

  print("\n✓ Migration completed successfully!")
  print("\nNew features available:")
  print("  - Doubles match tracking with individual player records")
  print("  - Individual player statistics in doubles matches")
  print("  - Partner pairing history")


if __name__ == '__main__':
  run_migration()
