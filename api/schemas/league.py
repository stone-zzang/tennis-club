from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LeagueBase(BaseModel):
  name: str = Field(..., max_length=70, description="Public league name")
  surface_type: str = Field(..., description="Court surface type e.g. hard, clay")
  entry_fee: int = Field(..., ge=0, description="Entry fee in local currency units")
  max_participants: int = Field(..., ge=2, le=128, description="Maximum number of players")
  auto_generate_bracket: bool = Field(default=True)
  groups_count: int | None = Field(default=None, ge=1, le=16)
  courts_count: int | None = Field(default=None, ge=1, le=16)


class LeagueCreateRequest(LeagueBase):
  pass


class LeagueResponse(LeagueBase):
  id: str = Field(..., description="League identifier")
  bracket_generated_at: datetime | None = Field(default=None, description="Bracket generation timestamp")
  created_at: datetime | None = Field(default=None, description="Creation timestamp")
  final_stage_mode: str | None = Field(default=None, description="Mode for the final stage")

  model_config = ConfigDict(from_attributes=True)
