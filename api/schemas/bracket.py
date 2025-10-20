from pydantic import BaseModel, Field


class BracketGenerationRequest(BaseModel):
  admin_id: str = Field(..., description='Admin triggering bracket generation')
  groups_count: int = Field(..., ge=1, le=16, description='Number of groups/pods')
  courts_count: int = Field(..., ge=1, le=16, description='Number of courts to schedule on')
