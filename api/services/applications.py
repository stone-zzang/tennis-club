from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from api.db.models import League, LeagueApplication, Member
from api.schemas.application import (
  LeagueApplicationCreateRequest,
  LeagueApplicationListItem,
  LeagueApplicationMember,
  LeagueApplicationResponse
)
from api.services.brackets import LeagueBracketService


class LeagueApplicationService:
  def __init__(self, session: Session) -> None:
    self._session = session

  def list_applications(self, league_id: str) -> list[LeagueApplicationListItem]:
    league = self._session.get(League, league_id)
    if not league:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='League not found')

    applications = self._session.execute(
      select(LeagueApplication).where(LeagueApplication.league_id == league_id).order_by(LeagueApplication.applied_at.desc())
    ).scalars().all()

    results: list[LeagueApplicationListItem] = []
    for application in applications:
      member = self._session.get(Member, application.member_id)
      member_payload = LeagueApplicationMember.model_validate(member, from_attributes=True) if member else None
      results.append(
        LeagueApplicationListItem(
          id=application.id,
          member=member_payload,
          status=application.status,
          applied_at=application.applied_at
        )
      )
    return results

  def _count_applications(self, league_id: str) -> int:
    return self._session.execute(
      select(func.count(LeagueApplication.id)).where(LeagueApplication.league_id == league_id)
    ).scalar_one()

  def create_application(self, league_id: str, payload: LeagueApplicationCreateRequest) -> LeagueApplicationResponse:
    league = self._session.get(League, league_id)
    if not league:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='League not found')

    member = self._session.get(Member, payload.member_id)
    if not member:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Member not found')

    existing = self._session.execute(
      select(LeagueApplication).where(
        LeagueApplication.league_id == league_id,
        LeagueApplication.member_id == payload.member_id
      )
    ).scalar_one_or_none()

    if existing:
      raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Member already applied to this league')

    current_count = self._count_applications(league_id)
    if current_count >= league.max_participants:
      raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='League capacity reached')

    application = LeagueApplication(league_id=league_id, member_id=payload.member_id, status='pending')
    self._session.add(application)
    self._session.commit()
    self._session.refresh(application)

    total_after = current_count + 1
    if total_after == league.max_participants and league.auto_generate_bracket:
      bracket_service = LeagueBracketService(self._session)
      bracket_service.generate_bracket(
        league_id=league_id,
        admin_id=None,
        groups_count=league.groups_count or 1,
        courts_count=league.courts_count or 1,
        skip_admin_check=True
      )

    return LeagueApplicationResponse(
      id=application.id,
      league_id=application.league_id,
      member_id=application.member_id,
      status=application.status,
      applied_at=application.applied_at,
      member=LeagueApplicationMember.model_validate(member, from_attributes=True)
    )

  def cancel_application(self, league_id: str, member_id: str) -> None:
    """Cancel a league application. Only allowed if bracket hasn't been generated yet."""
    league = self._session.get(League, league_id)
    if not league:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='League not found')

    if league.bracket_generated_at is not None:
      raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail='Cannot cancel application after bracket has been generated'
      )

    application = self._session.execute(
      select(LeagueApplication).where(
        LeagueApplication.league_id == league_id,
        LeagueApplication.member_id == member_id
      )
    ).scalar_one_or_none()

    if not application:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Application not found')

    self._session.delete(application)
    self._session.commit()
