"""One-off helper to upgrade existing SQLite schemas with new bracket columns."""

from __future__ import annotations

import os
from contextlib import closing

from sqlalchemy import create_engine, inspect, text

DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///./tennis_club.db')

def ensure_column(conn, table: str, column: str, ddl: str) -> None:
  inspector = inspect(conn)
  existing_columns = {col['name'] for col in inspector.get_columns(table)}
  if column not in existing_columns:
    conn.execute(text(f'ALTER TABLE {table} ADD COLUMN {column} {ddl}'))


def main() -> None:
  engine = create_engine(DATABASE_URL, future=True)
  with engine.begin() as conn:
    ensure_column(conn, 'leagues', 'auto_generate_bracket', 'BOOLEAN NOT NULL DEFAULT 1')
    ensure_column(conn, 'leagues', 'groups_count', 'INTEGER')
    ensure_column(conn, 'leagues', 'courts_count', 'INTEGER')
    ensure_column(conn, 'leagues', 'bracket_generated_at', 'DATETIME')
    ensure_column(conn, 'leagues', 'final_stage_mode', 'VARCHAR(20)')
    ensure_column(conn, 'members', 'role', "VARCHAR(20) NOT NULL DEFAULT 'member'")
    ensure_column(conn, 'league_matches', 'group_number', 'INTEGER NOT NULL DEFAULT 1')
    ensure_column(conn, 'league_matches', 'stage', 'VARCHAR(20)')
    ensure_column(conn, 'league_matches', 'next_match_id', 'VARCHAR(32)')
    ensure_column(conn, 'league_matches', 'next_match_slot', 'VARCHAR(10)')

    conn.execute(text("UPDATE members SET role='member' WHERE role IS NULL"))

  with closing(engine.connect()) as conn:
    conn.execute(text('VACUUM'))


if __name__ == '__main__':
  main()
