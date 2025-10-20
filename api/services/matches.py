from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.db.models import League, LeagueMatch, MatchParticipant, Member
from api.schemas.match import LeagueMatchCreateRequest, LeagueMatchResponse, MatchScoreUpdateRequest


class LeagueMatchService:
  def __init__(self, session: Session) -> None:
    self._session = session

  def _require_admin(self, admin_id: str | None) -> Member | None:
    if admin_id is None:
      raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Admin privileges required')
    admin = self._session.get(Member, admin_id)
    if not admin or admin.role != 'admin':
      raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Admin privileges required')
    return admin

  def list_matches(self, league_id: str) -> list[LeagueMatchResponse]:
    league = self._session.get(League, league_id)
    if not league:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='League not found')

    matches = self._session.execute(
      select(LeagueMatch).where(LeagueMatch.league_id == league_id).order_by(LeagueMatch.round.asc(), LeagueMatch.created_at.asc())
    ).scalars().all()
    return [LeagueMatchResponse.model_validate(match, from_attributes=True) for match in matches]

  def _create_match(
    self,
    league_id: str,
    round_number: int,
    group_number: int,
    player_a: str,
    player_b: str,
    court: str,
    scheduled_at: datetime,
    skip_admin_check: bool = False,
    admin_id: str | None = None
  ) -> LeagueMatch:
    league = self._session.get(League, league_id)
    if not league:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='League not found')

    if not skip_admin_check:
      self._require_admin(admin_id)

    match = LeagueMatch(
      league_id=league_id,
      round=round_number,
      group_number=group_number,
      player_a=player_a,
      player_b=player_b,
      court=court,
      scheduled_at=scheduled_at
    )
    self._session.add(match)
    self._session.commit()
    self._session.refresh(match)
    return match

  def create_match(self, league_id: str, payload: LeagueMatchCreateRequest) -> LeagueMatchResponse:
    match = self._create_match(
      league_id=league_id,
      round_number=payload.round,
      group_number=payload.group_number,
      player_a=payload.player_a,
      player_b=payload.player_b,
      court=payload.court,
      scheduled_at=payload.scheduled_at,
      admin_id=payload.admin_id
    )
    return LeagueMatchResponse.model_validate(match, from_attributes=True)

  def update_match_score(self, match_id: str, payload: MatchScoreUpdateRequest) -> LeagueMatchResponse:
    match = self._session.get(LeagueMatch, match_id)
    if not match:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Match not found')

    if match.status == 'completed':
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Match already completed')

    if match.stage == 'elimination' and payload.score_a == payload.score_b:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail='Elimination matches cannot end in a tie'
      )

    match.score_a = payload.score_a
    match.score_b = payload.score_b
    match.status = 'completed'
    match.completed_at = datetime.now(timezone.utc)

    if payload.score_a > payload.score_b:
      match.winner = match.player_a
    elif payload.score_b > payload.score_a:
      match.winner = match.player_b
    else:
      match.winner = None

    self._session.flush()

    if match.stage == 'elimination' and match.winner:
      self._propagate_elimination(match)

    self._session.commit()
    self._session.refresh(match)
    return LeagueMatchResponse.model_validate(match, from_attributes=True)

  def _propagate_elimination(self, match: LeagueMatch) -> None:
    if not match.next_match_id or not match.next_match_slot:
      return

    next_match = self._session.get(LeagueMatch, match.next_match_id)
    if not next_match:
      return

    if next_match.status == 'completed':
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail='Dependent match already completed; cannot update upstream result'
      )

    target_slot = match.next_match_slot
    winning_team_key = 'team_a' if match.winner == match.player_a else 'team_b'

    if target_slot == 'team_a':
      next_match.player_a = match.winner
    else:
      next_match.player_b = match.winner

    # Remove existing participants for the target slot
    self._session.query(MatchParticipant).filter(
      MatchParticipant.match_id == next_match.id,
      MatchParticipant.team == target_slot
    ).delete(synchronize_session=False)

    participants = [participant for participant in match.participants if participant.team == winning_team_key]
    for participant in participants:
      self._session.add(MatchParticipant(
        match_id=next_match.id,
        member_id=participant.member_id,
        team=target_slot
      ))

    self._session.flush()
