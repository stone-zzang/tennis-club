"""Seed a sample league with 16 players and generated bracket."""

from __future__ import annotations

import os
from datetime import datetime

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from api.db.models import League, LeagueApplication, Member
from api.services.brackets import LeagueBracketService

DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///./tennis_club.db')

ADMIN = {
  'full_name': '관리자',
  'email': 'admin@tennis.club',
  'level': 'advanced',
  'role': 'admin'
}

PLAYERS = [
  {'full_name': f'Group A Player {i}', 'email': f'a-player-{i}@tennis.club', 'level': 'beginner'}
  for i in range(1, 9)
] + [
  {'full_name': f'Group B Player {i}', 'email': f'b-player-{i}@tennis.club', 'level': 'intermediate'}
  for i in range(1, 9)
]

LEAGUE_SETTINGS = {
  'name': '샘플 리그 - 그룹 A/B',
  'surface_type': 'hard',
  'entry_fee': 0,
  'max_participants': 16,
  'auto_generate_bracket': True,
  'groups_count': 2,
  'courts_count': 2
}


def upsert_member(session: Session, full_name: str, email: str, level: str, role: str = 'member') -> Member:
  existing = session.execute(select(Member).where(Member.email == email)).scalar_one_or_none()
  if existing:
    existing.full_name = full_name
    existing.level = level
    if role == 'admin':
      existing.role = 'admin'
    return existing
  member = Member(full_name=full_name, email=email, level=level, role=role)
  session.add(member)
  session.flush()
  return member


def main() -> None:
  engine = create_engine(DATABASE_URL, future=True)
  with Session(engine) as session:
    admin = upsert_member(session, **ADMIN)
    players = [upsert_member(session, role='member', **player) for player in PLAYERS]

    existing_league = session.execute(
      select(League).where(League.name == LEAGUE_SETTINGS['name'])
    ).scalar_one_or_none()

    if existing_league:
      league = existing_league
      league.groups_count = LEAGUE_SETTINGS['groups_count']
      league.courts_count = LEAGUE_SETTINGS['courts_count']
      league.auto_generate_bracket = LEAGUE_SETTINGS['auto_generate_bracket']
      league.max_participants = LEAGUE_SETTINGS['max_participants']
    else:
      league = League(**LEAGUE_SETTINGS)
      session.add(league)
      session.flush()

    session.query(LeagueApplication).filter(LeagueApplication.league_id == league.id).delete()

    for player in players:
      session.add(LeagueApplication(
        league_id=league.id,
        member_id=player.id,
        status='pending',
        applied_at=datetime.utcnow()
      ))

    session.commit()

    bracket_service = LeagueBracketService(session)
    bracket_service.generate_bracket(
      league_id=league.id,
      admin_id=admin.id,
      groups_count=league.groups_count or 2,
      courts_count=league.courts_count or 2
    )

    session.commit()

  print('Sample league with Group A/B seeded successfully.')


if __name__ == '__main__':
  main()
