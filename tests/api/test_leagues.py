from collections.abc import Iterator
from datetime import datetime, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from api.db.models import Base, League, LeagueApplication, LeagueMatch, Member
from api.db.session import get_session
from api.main import app

TEST_DB_PATH = Path('tests/tmp_test.db')
SQLALCHEMY_DATABASE_URL = f'sqlite:///{TEST_DB_PATH}'
engine = create_engine(
  SQLALCHEMY_DATABASE_URL,
  future=True,
  connect_args={'check_same_thread': False}
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base.metadata.create_all(bind=engine)


def override_get_session() -> Iterator[Session]:
  session = TestingSessionLocal()
  try:
    yield session
  finally:
    session.close()


app.dependency_overrides[get_session] = override_get_session
client = TestClient(app)


@pytest.fixture(autouse=True)
def _clean_db() -> Iterator[None]:
  yield
  with TestingSessionLocal() as session:
    session.query(LeagueMatch).delete()
    session.query(LeagueApplication).delete()
    session.query(League).delete()
    session.query(Member).delete()
    session.commit()


@pytest.fixture(scope='session', autouse=True)
def _remove_test_db() -> Iterator[None]:
  yield
  if TEST_DB_PATH.exists():
    TEST_DB_PATH.unlink()


def test_health_check() -> None:
  response = client.get('/health')
  assert response.status_code == 200
  assert response.json() == {'status': 'ok'}


def test_member_signup_creates_member_and_blocks_duplicates() -> None:
  payload = {
    'full_name': '김선수',
    'email': 'player@example.com',
    'level': 'intermediate'
  }
  response = client.post('/members', json=payload)
  assert response.status_code == 201
  created = response.json()
  assert created['email'] == payload['email']

  duplicate = client.post('/members', json=payload)
  assert duplicate.status_code == 201
  assert duplicate.json()['id'] == created['id']


def test_member_role_does_not_escalate_to_admin() -> None:
  payload = {
    'full_name': '일반회원',
    'email': 'member@example.com',
    'level': 'beginner',
    'role': 'admin'
  }
  response = client.post('/members', json=payload)
  assert response.status_code == 201
  assert response.json()['role'] == 'member'


def test_admin_login_creates_or_returns_admin_member() -> None:
  payload = {
    'full_name': '관리자',
    'email': 'admin@tennis.club',
    'level': 'advanced',
    'role': 'admin'
  }
  first_response = client.post('/members', json=payload)
  assert first_response.status_code == 201
  assert first_response.json()['role'] == 'admin'

  second_response = client.post('/members', json=payload)
  assert second_response.status_code == 201
  assert second_response.json()['id'] == first_response.json()['id']
  assert second_response.json()['role'] == 'admin'


def _create_member(name: str, email: str, level: str = 'beginner', role: str = 'member') -> str:
  response = client.post(
    '/members',
    json={'full_name': name, 'email': email, 'level': level, 'role': role}
  )
  return response.json()['id']


def _create_league(name: str = '봄 시즌 리그', max_participants: int = 16, auto_generate_bracket: bool = True, groups_count: int | None = None, courts_count: int | None = None) -> str:
  response = client.post(
    '/leagues',
    json={
      'name': name,
      'surface_type': 'clay',
      'entry_fee': 25000,
      'max_participants': max_participants,
      'auto_generate_bracket': auto_generate_bracket,
      'groups_count': groups_count,
      'courts_count': courts_count
    }
  )
  return response.json()['id']


def _create_match(league_id: str, admin_id: str, round_: int = 1, group_number: int = 1) -> dict[str, str]:
  scheduled_at = datetime(2024, 4, 12, 9, 0, tzinfo=timezone.utc)
  response = client.post(
    f'/leagues/{league_id}/matches',
    json={
      'admin_id': admin_id,
      'round': round_,
      'group_number': group_number,
      'player_a': '홍길동',
      'player_b': '김코치',
      'court': 'Center',
      'scheduled_at': scheduled_at.isoformat()
    }
  )
  assert response.status_code == 201
  return response.json()


def test_create_and_get_league() -> None:
  payload = {
    'name': '봄 시즌 리그',
    'surface_type': 'clay',
    'entry_fee': 25000,
    'max_participants': 16
  }

  create_response = client.post('/leagues', json=payload)
  assert create_response.status_code == 201
  created = create_response.json()

  league_id = created['id']
  detail_response = client.get(f'/leagues/{league_id}')
  assert detail_response.status_code == 200
  assert detail_response.json()['name'] == payload['name']


def test_list_leagues_contains_created_league() -> None:
  payload = {
    'name': '여름 시즌 컵',
    'surface_type': 'hard',
    'entry_fee': 18000,
    'max_participants': 8
  }

  client.post('/leagues', json=payload)
  list_response = client.get('/leagues')
  assert list_response.status_code == 200
  names = [league['name'] for league in list_response.json()]
  assert payload['name'] in names


def test_league_application_flow_and_listing() -> None:
  member_id = _create_member('박참가', 'applicant@example.com')
  second_member_id = _create_member('이참가', 'applicant2@example.com')
  league_id = _create_league('가을 챔피언십', max_participants=2, groups_count=1, courts_count=1)

  application_payload = {'member_id': member_id}
  application_response = client.post(f'/leagues/{league_id}/applications', json=application_payload)
  assert application_response.status_code == 201
  created = application_response.json()
  assert created['member_id'] == member_id
  assert created['league_id'] == league_id
  assert created['member']['email'] == 'applicant@example.com'

  list_response = client.get(f'/leagues/{league_id}/applications')
  assert list_response.status_code == 200
  payloads = list_response.json()
  assert len(payloads) == 1
  assert payloads[0]['member']['full_name'] == '박참가'

  # Fill league to trigger auto bracket generation
  second_application = client.post(
    f'/leagues/{league_id}/applications', json={'member_id': second_member_id}
  )
  assert second_application.status_code == 201

  matches_response = client.get(f'/leagues/{league_id}/matches')
  assert matches_response.status_code == 200
  matches = matches_response.json()
  assert len(matches) == 1
  assert matches[0]['group_number'] == 1

  duplicate_response = client.post(f'/leagues/{league_id}/applications', json=application_payload)
  assert duplicate_response.status_code == 409

  missing_member_response = client.post(
    f'/leagues/{league_id}/applications',
    json={'member_id': 'missing-member'}
  )
  assert missing_member_response.status_code == 404

  missing_league_response = client.post('/leagues/missing-league/applications', json=application_payload)
  assert missing_league_response.status_code == 404

  missing_league_list = client.get('/leagues/missing-league/applications')
  assert missing_league_list.status_code == 404


def test_league_match_creation_and_listing() -> None:
  admin_id = _create_member('관리자', 'admin@tennis.club', level='advanced', role='admin')
  league_id = _create_league('겨울 챔피언십')
  created_match = _create_match(league_id, admin_id)
  assert created_match['league_id'] == league_id

  list_response = client.get(f'/leagues/{league_id}/matches')
  assert list_response.status_code == 200
  matches = list_response.json()
  assert len(matches) == 1
  assert matches[0]['player_a'] == '홍길동'
  assert matches[0]['round'] == 1

  missing_league_response = client.get('/leagues/missing-league/matches')
  assert missing_league_response.status_code == 404


def test_manual_bracket_generation() -> None:
  admin_id = _create_member('관리자', 'admin@tennis.club', role='admin')
  league_id = _create_league('봄 오픈', max_participants=4, auto_generate_bracket=False)

  applicant_ids = [
    _create_member('선수1', 'player1@example.com'),
    _create_member('선수2', 'player2@example.com'),
    _create_member('선수3', 'player3@example.com'),
    _create_member('선수4', 'player4@example.com')
  ]

  for member_id in applicant_ids:
    response = client.post(f'/leagues/{league_id}/applications', json={'member_id': member_id})
    assert response.status_code == 201

  generate_response = client.post(
    f'/leagues/{league_id}/bracket',
    json={'admin_id': admin_id, 'groups_count': 2, 'courts_count': 2}
  )
  assert generate_response.status_code == 200
  matches = generate_response.json()
  assert len(matches) == 2
  assert {match['group_number'] for match in matches} == {1, 2}
