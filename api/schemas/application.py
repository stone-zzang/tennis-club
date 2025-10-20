from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LeagueApplicationCreateRequest(BaseModel):
  member_id: str = Field(..., description='Member applying to the league')


class LeagueApplicationMember(BaseModel):
  id: str
  full_name: str
  email: str
  level: str

  model_config = ConfigDict(from_attributes=True)


class LeagueApplicationResponse(BaseModel):
  id: str
  league_id: str
  member_id: str
  status: str
  applied_at: datetime | None = None
  member: LeagueApplicationMember | None = None

  model_config = ConfigDict(from_attributes=True)


class LeagueApplicationListItem(BaseModel):
  id: str
  member: LeagueApplicationMember
  status: str
  applied_at: datetime | None = None

  model_config = ConfigDict(from_attributes=True)
