from __future__ import annotations

from dataclasses import dataclass
from typing import List

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.db.models import League, LeagueMatch, LeagueApplication, MatchParticipant, Member


@dataclass
class PlayerRanking:
  player_name: str
  group_number: int
  wins: int
  losses: int
  points_for: int
  points_against: int
  points_diff: int
  matches_played: int

  @property
  def win_rate(self) -> float:
    if self.matches_played == 0:
      return 0.0
    return self.wins / self.matches_played


class RankingService:
  def __init__(self, session: Session) -> None:
    self._session = session

  def calculate_group_rankings(self, league_id: str, group_number: int | None = None) -> List[PlayerRanking]:
    """
    Calculate individual player rankings from doubles matches.
    Uses MatchParticipant table to track individual player stats.
    """
    league = self._session.get(League, league_id)
    if not league:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='League not found')

    # Get completed preliminary matches (round 1 only)
    query = select(LeagueMatch).where(
      LeagueMatch.league_id == league_id,
      LeagueMatch.round == 1,  # Only preliminary matches
      LeagueMatch.status == 'completed'
    )

    if group_number is not None:
      query = query.where(LeagueMatch.group_number == group_number)

    matches = self._session.execute(query).scalars().all()

    # Track stats per player per group
    player_stats: dict[tuple[str, int], dict] = {}

    for match in matches:
      # Get participants for this match
      participants = self._session.execute(
        select(MatchParticipant).where(MatchParticipant.match_id == match.id)
      ).scalars().all()

      # Separate by team
      team_a_members = []
      team_b_members = []

      for participant in participants:
        member = self._session.get(Member, participant.member_id)
        if member:
          if participant.team == 'team_a':
            team_a_members.append(member)
          else:
            team_b_members.append(member)

      score_a = match.score_a if match.score_a is not None else 0
      score_b = match.score_b if match.score_b is not None else 0

      # Determine winner
      team_a_won = score_a > score_b
      team_b_won = score_b > score_a

      # Update stats for each player
      for member in team_a_members:
        key = (member.full_name, match.group_number)
        if key not in player_stats:
          player_stats[key] = {
            'player_name': member.full_name,
            'group_number': match.group_number,
            'wins': 0,
            'losses': 0,
            'points_for': 0,
            'points_against': 0,
            'matches_played': 0
          }

        player_stats[key]['matches_played'] += 1
        player_stats[key]['points_for'] += score_a
        player_stats[key]['points_against'] += score_b

        if team_a_won:
          player_stats[key]['wins'] += 1
        elif team_b_won:
          player_stats[key]['losses'] += 1

      for member in team_b_members:
        key = (member.full_name, match.group_number)
        if key not in player_stats:
          player_stats[key] = {
            'player_name': member.full_name,
            'group_number': match.group_number,
            'wins': 0,
            'losses': 0,
            'points_for': 0,
            'points_against': 0,
            'matches_played': 0
          }

        player_stats[key]['matches_played'] += 1
        player_stats[key]['points_for'] += score_b
        player_stats[key]['points_against'] += score_a

        if team_b_won:
          player_stats[key]['wins'] += 1
        elif team_a_won:
          player_stats[key]['losses'] += 1

    rankings = []
    for stats in player_stats.values():
      rankings.append(PlayerRanking(
        player_name=stats['player_name'],
        group_number=stats['group_number'],
        wins=stats['wins'],
        losses=stats['losses'],
        points_for=stats['points_for'],
        points_against=stats['points_against'],
        points_diff=stats['points_for'] - stats['points_against'],
        matches_played=stats['matches_played']
      ))

    rankings.sort(
      key=lambda x: (x.group_number, -x.wins, -x.points_diff, -x.points_for)
    )

    return rankings

  def get_top_players_per_group(self, league_id: str, top_n: int = 2) -> dict[int, List[str]]:
    """
    Get top N players from each group based on rankings.
    Returns dict mapping group_number -> list of player names
    """
    rankings = self.calculate_group_rankings(league_id)

    groups: dict[int, List[str]] = {}

    for ranking in rankings:
      if ranking.group_number not in groups:
        groups[ranking.group_number] = []

      if len(groups[ranking.group_number]) < top_n:
        groups[ranking.group_number].append(ranking.player_name)

    return groups
