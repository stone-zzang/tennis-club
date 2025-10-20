from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.db.models import League
from api.schemas.league import LeagueCreateRequest, LeagueResponse


class LeagueService:
  def __init__(self, session: Session) -> None:
    self._session = session

  def list_leagues(self) -> list[LeagueResponse]:
    leagues = self._session.execute(select(League).order_by(League.created_at.desc())).scalars().all()
    return [LeagueResponse.model_validate(league, from_attributes=True) for league in leagues]

  def create_league(self, payload: LeagueCreateRequest) -> LeagueResponse:
    league = League(
      name=payload.name,
      surface_type=payload.surface_type,
      entry_fee=payload.entry_fee,
      max_participants=payload.max_participants,
      auto_generate_bracket=payload.auto_generate_bracket,
      groups_count=payload.groups_count,
      courts_count=payload.courts_count
    )
    self._session.add(league)
    self._session.commit()
    self._session.refresh(league)
    return LeagueResponse.model_validate(league, from_attributes=True)

  def get_league(self, league_id: str) -> LeagueResponse:
    league = self._session.get(League, league_id)
    if not league:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='League not found')
    return LeagueResponse.model_validate(league, from_attributes=True)
