from pydantic import BaseModel


class PlayerRankingResponse(BaseModel):
  player_name: str
  group_number: int
  wins: int
  losses: int
  points_for: int
  points_against: int
  points_diff: int
  matches_played: int
  win_rate: float
