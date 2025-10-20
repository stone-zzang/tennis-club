from pydantic import BaseModel, Field


class TournamentBracketRequest(BaseModel):
  admin_id: str = Field(..., description='Admin performing the action')
  courts_count: int = Field(..., ge=1, le=10, description='Number of courts available')
  top_n_per_group: int = Field(2, ge=1, le=4, description='Number of top players from each group to advance')


class TournamentAdvanceRequest(BaseModel):
  admin_id: str = Field(..., description='Admin performing the action')
  current_round: int = Field(..., ge=2, description='Current round number to advance from')
  courts_count: int = Field(..., ge=1, le=10, description='Number of courts available')
