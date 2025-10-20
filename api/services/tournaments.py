from __future__ import annotations

from datetime import datetime, timezone, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.db.models import League, LeagueMatch
from api.services.matches import LeagueMatchService
from api.services.rankings import RankingService


class TournamentService:
  def __init__(self, session: Session) -> None:
    self._session = session

  def generate_tournament_bracket(
    self,
    league_id: str,
    admin_id: str,
    courts_count: int,
    top_n_per_group: int = 2
  ) -> list[LeagueMatch]:
    """
    Generate knockout tournament bracket from preliminary round results.
    Takes top N players from each group and creates single-elimination matches.
    """
    league = self._session.get(League, league_id)
    if not league:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='League not found')

    ranking_service = RankingService(self._session)
    top_players_by_group = ranking_service.get_top_players_per_group(league_id, top_n_per_group)

    if not top_players_by_group:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail='No completed preliminary matches found'
      )

    qualified_players = []
    for group_num in sorted(top_players_by_group.keys()):
      qualified_players.extend(top_players_by_group[group_num])

    if len(qualified_players) < 2:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail='Not enough qualified players for tournament'
      )

    existing_tournament_matches = self._session.execute(
      select(LeagueMatch).where(
        LeagueMatch.league_id == league_id,
        LeagueMatch.round > 1
      )
    ).scalars().all()

    if existing_tournament_matches:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail='Tournament bracket already exists'
      )

    matches = []
    match_service = LeagueMatchService(self._session)
    courts = max(1, courts_count)

    base_time = datetime.now(timezone.utc) + timedelta(days=1)

    for i in range(0, len(qualified_players) - 1, 2):
      player_a = qualified_players[i]
      player_b = qualified_players[i + 1] if i + 1 < len(qualified_players) else 'BYE'

      court_number = (len(matches) % courts) + 1
      scheduled_at = base_time + timedelta(hours=len(matches) // courts)

      match = match_service._create_match(
        league_id=league_id,
        round_number=2,
        group_number=1,
        player_a=player_a,
        player_b=player_b,
        court=f'Court {court_number}',
        scheduled_at=scheduled_at,
        skip_admin_check=True,
        admin_id=admin_id
      )
      matches.append(match)

    return matches

  def advance_tournament_round(
    self,
    league_id: str,
    admin_id: str,
    current_round: int,
    courts_count: int
  ) -> list[LeagueMatch]:
    """
    Generate next round of tournament based on current round winners.
    """
    league = self._session.get(League, league_id)
    if not league:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='League not found')

    current_round_matches = self._session.execute(
      select(LeagueMatch).where(
        LeagueMatch.league_id == league_id,
        LeagueMatch.round == current_round,
        LeagueMatch.status == 'completed'
      ).order_by(LeagueMatch.created_at.asc())
    ).scalars().all()

    if not current_round_matches:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f'No completed matches found for round {current_round}'
      )

    winners = []
    for match in current_round_matches:
      if match.winner:
        winners.append(match.winner)

    if len(winners) < 2:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail='Not enough winners to advance to next round'
      )

    next_round = current_round + 1
    existing_next_round = self._session.execute(
      select(LeagueMatch).where(
        LeagueMatch.league_id == league_id,
        LeagueMatch.round == next_round
      )
    ).scalars().first()

    if existing_next_round:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f'Round {next_round} matches already exist'
      )

    matches = []
    match_service = LeagueMatchService(self._session)
    courts = max(1, courts_count)

    base_time = datetime.now(timezone.utc) + timedelta(days=1)

    for i in range(0, len(winners) - 1, 2):
      player_a = winners[i]
      player_b = winners[i + 1] if i + 1 < len(winners) else 'BYE'

      court_number = (len(matches) % courts) + 1
      scheduled_at = base_time + timedelta(hours=len(matches) // courts)

      match = match_service._create_match(
        league_id=league_id,
        round_number=next_round,
        group_number=1,
        player_a=player_a,
        player_b=player_b,
        court=f'Court {court_number}',
        scheduled_at=scheduled_at,
        skip_admin_check=True,
        admin_id=admin_id
      )
      matches.append(match)

    return matches
