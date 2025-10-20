"""
Database migration script to add score tracking fields to LeagueMatch table.

This script adds the following columns:
- status: Match status (scheduled, in_progress, completed)
- score_a: Score for player A
- score_b: Score for player B
- winner: Name of the winning player
- completed_at: Timestamp when match was completed

Usage:
  python scripts/migrate_add_match_scores.py
"""

import sys
import os

# Add project root to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from api.db.session import engine


def run_migration():
  print("Starting migration: Add match score tracking fields...")

  with engine.connect() as conn:
    print("Adding 'status' column to league_matches...")
    try:
      conn.execute(text(
        "ALTER TABLE league_matches ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'scheduled'"
      ))
      conn.commit()
      print("✓ Added 'status' column")
    except Exception as e:
      if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
        print("  Column 'status' already exists, skipping...")
      else:
        raise

    print("Adding 'score_a' column to league_matches...")
    try:
      conn.execute(text(
        "ALTER TABLE league_matches ADD COLUMN score_a INTEGER"
      ))
      conn.commit()
      print("✓ Added 'score_a' column")
    except Exception as e:
      if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
        print("  Column 'score_a' already exists, skipping...")
      else:
        raise

    print("Adding 'score_b' column to league_matches...")
    try:
      conn.execute(text(
        "ALTER TABLE league_matches ADD COLUMN score_b INTEGER"
      ))
      conn.commit()
      print("✓ Added 'score_b' column")
    except Exception as e:
      if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
        print("  Column 'score_b' already exists, skipping...")
      else:
        raise

    print("Adding 'winner' column to league_matches...")
    try:
      conn.execute(text(
        "ALTER TABLE league_matches ADD COLUMN winner VARCHAR(80)"
      ))
      conn.commit()
      print("✓ Added 'winner' column")
    except Exception as e:
      if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
        print("  Column 'winner' already exists, skipping...")
      else:
        raise

    print("Adding 'completed_at' column to league_matches...")
    try:
      conn.execute(text(
        "ALTER TABLE league_matches ADD COLUMN completed_at DATETIME"
      ))
      conn.commit()
      print("✓ Added 'completed_at' column")
    except Exception as e:
      if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
        print("  Column 'completed_at' already exists, skipping...")
      else:
        raise

  print("\n✓ Migration completed successfully!")
  print("\nYou can now:")
  print("  1. Submit match scores via PATCH /matches/{match_id}/score")
  print("  2. View rankings via GET /leagues/{league_id}/rankings")
  print("  3. Generate tournament brackets via POST /leagues/{league_id}/tournament")


if __name__ == '__main__':
  run_migration()
