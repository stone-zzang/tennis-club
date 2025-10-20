from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class DoublesTournamentGenerateRequest(BaseModel):
  admin_id: str = Field(..., description='Admin performing the action')
  mode: Literal['ranked_play', 'elimination'] = Field('ranked_play', description='Final stage mode')
  num_matches: int | None = Field(None, ge=1, le=4, description='Number of matches for ranked_play mode')
  courts_count: int = Field(4, ge=1, le=10, description='Number of courts available')

  @model_validator(mode='after')
  def validate_mode(cls, values: 'DoublesTournamentGenerateRequest') -> 'DoublesTournamentGenerateRequest':
    if values.mode == 'ranked_play' and values.num_matches is None:
      raise ValueError('num_matches is required for ranked_play mode')
    if values.mode == 'elimination':
      values.num_matches = None
    return values


class MatchUpdateRequest(BaseModel):
  admin_id: str = Field(..., description='Admin performing the action')
  scheduled_at: datetime | None = Field(None, description='New scheduled time')
  court: str | None = Field(None, max_length=40, description='New court assignment')


class PreliminaryCompleteResponse(BaseModel):
  is_complete: bool
  total_matches: int
  completed_matches: int
