from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LeagueMatchCreateRequest(BaseModel):
  admin_id: str = Field(..., description='Admin performing the action')
  round: int = Field(..., ge=1, le=10)
  group_number: int = Field(..., ge=1, le=16)
  player_a: str = Field(..., max_length=80)
  player_b: str = Field(..., max_length=80)
  court: str = Field(..., max_length=40)
  scheduled_at: datetime


class MatchScoreUpdateRequest(BaseModel):
  score_a: int = Field(..., ge=0, description='Score for player A')
  score_b: int = Field(..., ge=0, description='Score for player B')


class LeagueMatchResponse(BaseModel):
  id: str
  league_id: str
  round: int
  group_number: int
  stage: str
  player_a: str
  player_b: str
  court: str
  scheduled_at: datetime
  status: str = 'scheduled'
  score_a: int | None = None
  score_b: int | None = None
  winner: str | None = None
  completed_at: datetime | None = None
  next_match_id: str | None = None
  next_match_slot: str | None = None
  created_at: datetime | None = None

  model_config = ConfigDict(from_attributes=True)
