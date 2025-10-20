from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
  pass


class League(Base):
  __tablename__ = 'leagues'

  id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
  name: Mapped[str] = mapped_column(String(70), nullable=False)
  surface_type: Mapped[str] = mapped_column(String(20), nullable=False)
  entry_fee: Mapped[int] = mapped_column(Integer, nullable=False)
  max_participants: Mapped[int] = mapped_column(Integer, nullable=False)
  auto_generate_bracket: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
  groups_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
  courts_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
  final_stage_mode: Mapped[str | None] = mapped_column(String(20), nullable=True)
  bracket_generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

  applications: Mapped[list['LeagueApplication']] = relationship(
    back_populates='league', cascade='all, delete-orphan'
  )
  matches: Mapped[list['LeagueMatch']] = relationship(
    back_populates='league', cascade='all, delete-orphan'
  )


class Member(Base):
  __tablename__ = 'members'

  id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
  full_name: Mapped[str] = mapped_column(String(80), nullable=False)
  email: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
  level: Mapped[str] = mapped_column(String(20), nullable=False)
  role: Mapped[str] = mapped_column(String(20), nullable=False, default='member')
  joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

  applications: Mapped[list['LeagueApplication']] = relationship(back_populates='member')


class LeagueApplication(Base):
  __tablename__ = 'league_applications'
  __table_args__ = (UniqueConstraint('league_id', 'member_id', name='uq_league_member'),)

  id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
  league_id: Mapped[str] = mapped_column(ForeignKey('leagues.id', ondelete='CASCADE'), nullable=False)
  member_id: Mapped[str] = mapped_column(ForeignKey('members.id', ondelete='CASCADE'), nullable=False)
  status: Mapped[str] = mapped_column(String(20), nullable=False, default='pending')
  applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

  league: Mapped[League] = relationship(back_populates='applications')
  member: Mapped[Member] = relationship(back_populates='applications')


class LeagueMatch(Base):
  __tablename__ = 'league_matches'

  id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
  league_id: Mapped[str] = mapped_column(ForeignKey('leagues.id', ondelete='CASCADE'), nullable=False)
  round: Mapped[int] = mapped_column(Integer, nullable=False)
  group_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
  stage: Mapped[str] = mapped_column(String(20), nullable=False, default='preliminary')
  player_a: Mapped[str] = mapped_column(String(80), nullable=False)  # Kept for backward compatibility
  player_b: Mapped[str] = mapped_column(String(80), nullable=False)  # Kept for backward compatibility
  court: Mapped[str] = mapped_column(String(40), nullable=False)
  scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
  status: Mapped[str] = mapped_column(String(20), nullable=False, default='scheduled')  # scheduled, in_progress, completed
  score_a: Mapped[int | None] = mapped_column(Integer, nullable=True)
  score_b: Mapped[int | None] = mapped_column(Integer, nullable=True)
  winner: Mapped[str | None] = mapped_column(String(80), nullable=True)  # Will be 'team_a' or 'team_b' for doubles
  completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
  next_match_id: Mapped[str | None] = mapped_column(
    String(32),
    ForeignKey('league_matches.id', ondelete='SET NULL'),
    nullable=True
  )
  next_match_slot: Mapped[str | None] = mapped_column(String(10), nullable=True)  # 'team_a' or 'team_b'
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

  league: Mapped[League] = relationship(back_populates='matches')
  participants: Mapped[list['MatchParticipant']] = relationship(back_populates='match', cascade='all, delete-orphan')


class MatchParticipant(Base):
  __tablename__ = 'match_participants'

  id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
  match_id: Mapped[str] = mapped_column(ForeignKey('league_matches.id', ondelete='CASCADE'), nullable=False)
  member_id: Mapped[str] = mapped_column(ForeignKey('members.id', ondelete='CASCADE'), nullable=False)
  team: Mapped[str] = mapped_column(String(10), nullable=False)  # 'team_a' or 'team_b'
  created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

  match: Mapped[LeagueMatch] = relationship(back_populates='participants')
  member: Mapped[Member] = relationship()
