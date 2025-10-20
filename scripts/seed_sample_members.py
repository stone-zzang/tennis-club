"""Seed initial admin and sample members for quick manual testing."""

from __future__ import annotations

import os

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from api.db.models import Member

DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///./tennis_club.db')

SAMPLE_MEMBERS = [
  {'full_name': '관리자', 'email': 'admin@tennis.club', 'level': 'advanced', 'role': 'admin'},
  {'full_name': '샘플회원 A', 'email': 'sample-a@tennis.club', 'level': 'beginner', 'role': 'member'},
  {'full_name': '샘플회원 B', 'email': 'sample-b@tennis.club', 'level': 'intermediate', 'role': 'member'},
  {'full_name': '샘플회원 C', 'email': 'sample-c@tennis.club', 'level': 'advanced', 'role': 'member'}
]


def upsert_member(session: Session, *, full_name: str, email: str, level: str, role: str) -> None:
  existing = session.execute(select(Member).where(Member.email == email)).scalar_one_or_none()
  if existing:
    existing.full_name = full_name
    existing.level = level
    existing.role = role if role == 'admin' else 'member'
  else:
    session.add(Member(full_name=full_name, email=email, level=level, role=role))


def main() -> None:
  engine = create_engine(DATABASE_URL, future=True)
  with engine.begin() as conn:
    Member.__table__.create(bind=conn, checkfirst=True)
  with Session(engine) as session:
    for payload in SAMPLE_MEMBERS:
      upsert_member(session, **payload)
    session.commit()

if __name__ == '__main__':
  main()
