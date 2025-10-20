from __future__ import annotations

from datetime import datetime, timezone, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.db.models import League, LeagueApplication, LeagueMatch, Member, MatchParticipant
from api.services.matches import LeagueMatchService
from api.services.doubles_pairing import DoublesPairingService


class LeagueBracketService:
  def __init__(self, session: Session) -> None:
    self._session = session

  def _require_admin(self, admin_id: str | None) -> Member | None:
    if admin_id is None:
      raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Admin privileges required')
    admin = self._session.get(Member, admin_id)
    if not admin or admin.role != 'admin':
      raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Admin privileges required')
    return admin

  def generate_bracket(
    self,
    league_id: str,
    admin_id: str | None,
    groups_count: int,
    courts_count: int,
    skip_admin_check: bool = False
  ) -> list[LeagueMatch]:
    """
    Generate preliminary doubles bracket with random pairing.
    Each player plays 3 matches with different partners.
    """
    league = self._session.get(League, league_id)
    if not league:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='League not found')

    if not skip_admin_check:
      self._require_admin(admin_id)

    groups = max(1, groups_count)
    courts = max(1, courts_count)

    # Get all applications
    applications = self._session.execute(
      select(LeagueApplication)
      .where(LeagueApplication.league_id == league_id)
      .order_by(LeagueApplication.applied_at.asc())
    ).scalars().all()

    if len(applications) == 0:
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='No applicants available for bracket generation')

    # Get Member objects
    members = [app.member for app in applications if app.member]

    if len(members) < 4:
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Need at least 4 members for doubles')

    # Update application status
    for application in applications:
      application.status = 'scheduled'

    # Delete existing matches
    self._session.query(LeagueMatch).filter(LeagueMatch.league_id == league_id).delete()
    league.final_stage_mode = None

    # Distribute members into groups
    pairing_service = DoublesPairingService()
    group_members = pairing_service.distribute_to_groups(members, groups)

    matches: list[LeagueMatch] = []
    base_time = datetime.now(timezone.utc) + timedelta(days=1)

    # Generate preliminary matches for each group
    for group_index, group_member_list in enumerate(group_members, start=1):
      if len(group_member_list) < 4:
        continue  # Skip groups with insufficient members

      # Generate random pairs (3 matches per player)
      group_matches = pairing_service.generate_preliminary_pairs(
        group_member_list,
        matches_per_player=3
      )

      # Create LeagueMatch entries
      for match_idx, ((p1, p2), (p3, p4)) in enumerate(group_matches):
        court_number = (len(matches) % courts) + 1
        scheduled_at = base_time + timedelta(hours=len(matches) // courts)

        team_a_display = f"{p1.full_name}, {p2.full_name}"
        team_b_display = f"{p3.full_name}, {p4.full_name}"

        match = LeagueMatch(
          league_id=league_id,
          round=1,
          group_number=group_index,
          player_a=team_a_display,
          player_b=team_b_display,
          court=f'Court {court_number}',
          scheduled_at=scheduled_at,
          status='scheduled'
        )
        self._session.add(match)
        self._session.flush()  # Get match ID

        # Add participants
        participants = [
          MatchParticipant(match_id=match.id, member_id=p1.id, team='team_a'),
          MatchParticipant(match_id=match.id, member_id=p2.id, team='team_a'),
          MatchParticipant(match_id=match.id, member_id=p3.id, team='team_b'),
          MatchParticipant(match_id=match.id, member_id=p4.id, team='team_b'),
        ]
        for participant in participants:
          self._session.add(participant)

        matches.append(match)

    league.groups_count = groups
    league.courts_count = courts
    league.bracket_generated_at = datetime.utcnow().replace(tzinfo=timezone.utc)
    self._session.commit()
    return matches
