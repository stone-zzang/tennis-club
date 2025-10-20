"""
Doubles tournament service for post-preliminary stages.

Supports:
- Checking if all preliminary matches are completed
- Generating ranked play-offs or elimination brackets
- Propagating winners through elimination rounds
- Admin editing of tournament brackets
"""

from __future__ import annotations

import random
from datetime import datetime, timezone, timedelta
from typing import List, Tuple

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.db.models import League, LeagueMatch, MatchParticipant, Member
from api.services.rankings import RankingService


class DoublesTournamentService:
  def __init__(self, session: Session) -> None:
    self._session = session

  def _require_admin(self, admin_id: str) -> Member:
    admin = self._session.get(Member, admin_id)
    if not admin or admin.role != 'admin':
      raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Admin privileges required')
    return admin

  def check_preliminary_complete(self, league_id: str) -> bool:
    """
    Check if all preliminary round (round 1) matches are completed.

    Returns:
      True if all round 1 matches are completed, False otherwise
    """
    preliminary_matches = self._session.execute(
      select(LeagueMatch).where(
        LeagueMatch.league_id == league_id,
        LeagueMatch.round == 1
      )
    ).scalars().all()

    if not preliminary_matches:
      return False

    return all(match.status == 'completed' for match in preliminary_matches)

  def generate_final_stage(
    self,
    league_id: str,
    admin_id: str,
    mode: str,
    courts_count: int,
    num_matches: int | None = None
  ) -> List[LeagueMatch]:
    """Generate ranked play-offs or elimination bracket for the league."""
    league = self._session.get(League, league_id)
    if not league:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='League not found')

    self._require_admin(admin_id)

    if not self.check_preliminary_complete(league_id):
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail='All preliminary matches must be completed first'
      )

    existing_stage = self._session.execute(
      select(LeagueMatch).where(
        LeagueMatch.league_id == league_id,
        LeagueMatch.stage != 'preliminary'
      )
    ).scalars().first()

    if existing_stage:
      raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail='Final stage already generated'
      )

    if mode not in {'ranked_play', 'elimination'}:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail='mode must be ranked_play or elimination'
      )

    if mode == 'ranked_play' and num_matches is None:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail='num_matches is required for ranked_play mode'
      )

    if mode == 'ranked_play':
      matches = self._generate_ranked_play(
        league=league,
        num_matches=num_matches or 1,
        courts_count=courts_count
      )
    else:
      matches = self._generate_elimination_bracket(
        league=league,
        courts_count=courts_count
      )

    league.final_stage_mode = mode
    self._session.commit()
    return matches

  # --- Internal helpers -------------------------------------------------

  def _generate_ranked_play(
    self,
    league: League,
    num_matches: int,
    courts_count: int
  ) -> List[LeagueMatch]:
    if num_matches not in [1, 2, 4]:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail='num_matches must be 1, 2, or 4'
      )

    ranking_service = RankingService(self._session)
    all_rankings = ranking_service.calculate_group_rankings(league.id)

    group_rankings: dict[int, list] = {}
    for ranking in all_rankings:
      group_rankings.setdefault(ranking.group_number, []).append(ranking)

    if len(group_rankings) < 2:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail='At least two groups are required for ranked play-offs'
      )

    group_numbers = sorted(group_rankings.keys())[:2]
    group1_rankings = sorted(group_rankings[group_numbers[0]], key=lambda x: (-x.wins, -x.points_diff, -x.points_for))
    group2_rankings = sorted(group_rankings[group_numbers[1]], key=lambda x: (-x.wins, -x.points_diff, -x.points_for))

    if len(group1_rankings) < num_matches * 2 or len(group2_rankings) < num_matches * 2:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f'Not enough ranked players for {num_matches} matches'
      )

    matches: list[LeagueMatch] = []
    base_time = datetime.now(timezone.utc) + timedelta(days=1)

    for match_idx in range(num_matches):
      rank_start = match_idx * 2

      group1_player1 = self._session.execute(
        select(Member).where(Member.full_name == group1_rankings[rank_start].player_name)
      ).scalar_one()
      group1_player2 = self._session.execute(
        select(Member).where(Member.full_name == group1_rankings[rank_start + 1].player_name)
      ).scalar_one()
      group2_player1 = self._session.execute(
        select(Member).where(Member.full_name == group2_rankings[rank_start].player_name)
      ).scalar_one()
      group2_player2 = self._session.execute(
        select(Member).where(Member.full_name == group2_rankings[rank_start + 1].player_name)
      ).scalar_one()

      court_number = (match_idx % courts_count) + 1
      scheduled_at = base_time + timedelta(hours=match_idx // courts_count)

      match = LeagueMatch(
        league_id=league.id,
        round=2,
        group_number=1,
        stage='ranked',
        player_a=f"{group1_player1.full_name}, {group1_player2.full_name}",
        player_b=f"{group2_player1.full_name}, {group2_player2.full_name}",
        court=f'Court {court_number}',
        scheduled_at=scheduled_at,
        status='scheduled'
      )
      self._session.add(match)
      self._session.flush()

      participants = [
        MatchParticipant(match_id=match.id, member_id=group1_player1.id, team='team_a'),
        MatchParticipant(match_id=match.id, member_id=group1_player2.id, team='team_a'),
        MatchParticipant(match_id=match.id, member_id=group2_player1.id, team='team_b'),
        MatchParticipant(match_id=match.id, member_id=group2_player2.id, team='team_b')
      ]
      for participant in participants:
        self._session.add(participant)

      matches.append(match)

    return matches

  def _generate_elimination_bracket(
    self,
    league: League,
    courts_count: int
  ) -> List[LeagueMatch]:
    ranking_service = RankingService(self._session)
    rankings = ranking_service.calculate_group_rankings(league.id)

    if len(rankings) < 16:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail='At least 16 ranked players are required for the elimination bracket'
      )

    members = [
      self._session.execute(select(Member).where(Member.full_name == ranking.player_name)).scalar_one()
      for ranking in rankings[:16]
    ]

    teams: List[Tuple[Member, Member]] = []
    for idx in range(0, len(members) - 1, 2):
      teams.append((members[idx], members[idx + 1]))
      if len(teams) == 8:
        break

    if len(teams) < 8:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail='Unable to form 8 teams for the quarterfinals'
      )

    random.shuffle(teams)
    quarter_pairs = [(teams[i], teams[i + 1]) for i in range(0, 8, 2)]

    base_time = datetime.now(timezone.utc) + timedelta(days=1)

    # Create semifinal shell matches first to ease dependency mapping
    semifinal_matches: list[LeagueMatch] = []
    for index in range(2):
      match = LeagueMatch(
        league_id=league.id,
        round=3,
        group_number=index + 1,
        stage='elimination',
        player_a=f'QF{index * 2 + 1} 승자',
        player_b=f'QF{index * 2 + 2} 승자',
        court=f'Court {(index % courts_count) + 1}',
        scheduled_at=base_time + timedelta(hours=2 + index // courts_count),
        status='scheduled'
      )
      self._session.add(match)
      self._session.flush()
      semifinal_matches.append(match)

    final_match = LeagueMatch(
      league_id=league.id,
      round=4,
      group_number=1,
      stage='elimination',
      player_a='SF1 승자',
      player_b='SF2 승자',
      court='Court 1',
      scheduled_at=base_time + timedelta(hours=3),
      status='scheduled'
    )
    self._session.add(final_match)
    self._session.flush()

    quarter_matches: list[LeagueMatch] = []
    for idx, ((team_a_p1, team_a_p2), (team_b_p1, team_b_p2)) in enumerate(quarter_pairs, start=1):
      court_number = (idx % courts_count) + 1
      scheduled_at = base_time + timedelta(hours=(idx - 1) // courts_count)

      match = LeagueMatch(
        league_id=league.id,
        round=2,
        group_number=idx,
        stage='elimination',
        player_a=f"{team_a_p1.full_name}, {team_a_p2.full_name}",
        player_b=f"{team_b_p1.full_name}, {team_b_p2.full_name}",
        court=f'Court {court_number}',
        scheduled_at=scheduled_at,
        status='scheduled',
        next_match_id=semifinal_matches[(idx - 1) // 2].id,
        next_match_slot='team_a' if idx in {1, 3} else 'team_b'
      )
      self._session.add(match)
      self._session.flush()

      participants = [
        MatchParticipant(match_id=match.id, member_id=team_a_p1.id, team='team_a'),
        MatchParticipant(match_id=match.id, member_id=team_a_p2.id, team='team_a'),
        MatchParticipant(match_id=match.id, member_id=team_b_p1.id, team='team_b'),
        MatchParticipant(match_id=match.id, member_id=team_b_p2.id, team='team_b')
      ]
      for participant in participants:
        self._session.add(participant)

      quarter_matches.append(match)

    for index, semifinal in enumerate(semifinal_matches, start=1):
      semifinal.next_match_id = final_match.id
      semifinal.next_match_slot = 'team_a' if index == 1 else 'team_b'

    return quarter_matches + semifinal_matches + [final_match]

  def update_match(
    self,
    match_id: str,
    admin_id: str,
    scheduled_at: datetime | None = None,
    court: str | None = None
  ) -> LeagueMatch:
    """
    Allow admin to edit match details (time, court).

    Args:
      match_id: Match ID
      admin_id: Admin performing the action
      scheduled_at: New scheduled time (optional)
      court: New court assignment (optional)

    Returns:
      Updated match
    """
    self._require_admin(admin_id)

    match = self._session.get(LeagueMatch, match_id)
    if not match:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Match not found')

    if scheduled_at:
      match.scheduled_at = scheduled_at
    if court:
      match.court = court

    self._session.commit()
    self._session.refresh(match)
    return match
