from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


EMAIL_PATTERN = r'^[^@\s]+@[^@\s]+\.[^@\s]+$'
LEVEL_PATTERN = r'^(beginner|intermediate|advanced)$'
ROLE_PATTERN = r'^(admin|member)$'


class MemberCreateRequest(BaseModel):
  full_name: str = Field(..., max_length=80)
  email: str = Field(..., pattern=EMAIL_PATTERN)
  level: str = Field(..., pattern=LEVEL_PATTERN)
  role: str = Field('member', pattern=ROLE_PATTERN)


class MemberRoleUpdateRequest(BaseModel):
  role: str = Field(..., pattern=ROLE_PATTERN, description='New role for member')
  admin_id: str = Field(..., description='Admin performing the action')


class MemberResponse(MemberCreateRequest):
  id: str = Field(..., description='Member identifier')
  joined_at: datetime | None = Field(default=None)

  model_config = ConfigDict(from_attributes=True)
