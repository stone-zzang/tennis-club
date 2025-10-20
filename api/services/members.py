from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.db.models import Member
from api.schemas.member import MemberCreateRequest, MemberResponse, MemberRoleUpdateRequest


ADMIN_EMAIL = 'admin@tennis.club'


class MemberService:
  def __init__(self, session: Session) -> None:
    self._session = session

  def _resolve_role(self, email: str, requested: str | None) -> str:
    if email == ADMIN_EMAIL and requested == 'admin':
      return 'admin'
    return 'member'

  def _require_admin(self, admin_id: str | None) -> Member | None:
    if admin_id is None:
      raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Admin privileges required')
    admin = self._session.get(Member, admin_id)
    if not admin or admin.role != 'admin':
      raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Admin privileges required')
    return admin

  def create_member(self, payload: MemberCreateRequest) -> MemberResponse:
    desired_role = self._resolve_role(payload.email, payload.role)

    existing = self._session.execute(select(Member).where(Member.email == payload.email)).scalar_one_or_none()
    if existing:
      existing.full_name = payload.full_name
      existing.level = payload.level
      if payload.email == ADMIN_EMAIL and desired_role == 'admin':
        existing.role = 'admin'
      self._session.commit()
      self._session.refresh(existing)
      return MemberResponse.model_validate(existing, from_attributes=True)

    member = Member(
      full_name=payload.full_name,
      email=payload.email,
      level=payload.level,
      role=desired_role
    )
    self._session.add(member)
    self._session.commit()
    self._session.refresh(member)
    return MemberResponse.model_validate(member, from_attributes=True)

  def update_member_role(self, member_id: str, payload: MemberRoleUpdateRequest) -> MemberResponse:
    self._require_admin(payload.admin_id)

    member = self._session.get(Member, member_id)
    if not member:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Member not found')

    member.role = payload.role
    self._session.commit()
    self._session.refresh(member)
    return MemberResponse.model_validate(member, from_attributes=True)
