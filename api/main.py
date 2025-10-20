from fastapi import Depends, FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from api.db.models import Base
from api.db.session import engine, get_session
from api.schemas.application import (
  LeagueApplicationCreateRequest,
  LeagueApplicationListItem,
  LeagueApplicationResponse
)
from api.schemas.bracket import BracketGenerationRequest
from api.schemas.league import LeagueCreateRequest, LeagueResponse
from api.schemas.match import LeagueMatchCreateRequest, LeagueMatchResponse, MatchScoreUpdateRequest
from api.schemas.member import MemberCreateRequest, MemberResponse, MemberRoleUpdateRequest
from api.schemas.ranking import PlayerRankingResponse
from api.schemas.tournament import TournamentBracketRequest, TournamentAdvanceRequest
from api.schemas.doubles_tournament import (
  DoublesTournamentGenerateRequest,
  MatchUpdateRequest,
  PreliminaryCompleteResponse
)
from api.services.applications import LeagueApplicationService
from api.services.leagues import LeagueService
from api.services.brackets import LeagueBracketService
from api.services.matches import LeagueMatchService
from api.services.members import MemberService
from api.services.rankings import RankingService
from api.services.tournaments import TournamentService
from api.services.doubles_tournament import DoublesTournamentService

app = FastAPI(title="Tennis Club League API", version="0.1.0")
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"]
)


@app.on_event('startup')
def on_startup() -> None:
  Base.metadata.create_all(bind=engine)


@app.get("/", status_code=status.HTTP_200_OK)
async def root() -> dict[str, str]:
  return {
    "message": "Tennis Club League API",
    "version": "0.1.0",
    "docs": "/docs",
    "health": "/health"
  }


@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check() -> dict[str, str]:
  return {"status": "ok"}


@app.post("/members", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
async def create_member(payload: MemberCreateRequest, session: Session = Depends(get_session)) -> MemberResponse:
  service = MemberService(session)
  return service.create_member(payload)


@app.patch("/members/{member_id}/role", response_model=MemberResponse)
async def update_member_role(
  member_id: str,
  payload: MemberRoleUpdateRequest,
  session: Session = Depends(get_session)
) -> MemberResponse:
  service = MemberService(session)
  return service.update_member_role(member_id, payload)


@app.get("/leagues", response_model=list[LeagueResponse])
async def list_leagues(session: Session = Depends(get_session)) -> list[LeagueResponse]:
  service = LeagueService(session)
  return service.list_leagues()


@app.post("/leagues", response_model=LeagueResponse, status_code=status.HTTP_201_CREATED)
async def create_league(payload: LeagueCreateRequest, session: Session = Depends(get_session)) -> LeagueResponse:
  service = LeagueService(session)
  return service.create_league(payload)


@app.get("/leagues/{league_id}", response_model=LeagueResponse)
async def get_league(league_id: str, session: Session = Depends(get_session)) -> LeagueResponse:
  service = LeagueService(session)
  return service.get_league(league_id)


@app.get(
  "/leagues/{league_id}/applications",
  response_model=list[LeagueApplicationListItem]
)
async def list_league_applications(
  league_id: str,
  session: Session = Depends(get_session)
) -> list[LeagueApplicationListItem]:
  service = LeagueApplicationService(session)
  return service.list_applications(league_id)


@app.post(
  "/leagues/{league_id}/applications",
  response_model=LeagueApplicationResponse,
  status_code=status.HTTP_201_CREATED
)
async def create_league_application(
  league_id: str,
  payload: LeagueApplicationCreateRequest,
  session: Session = Depends(get_session)
) -> LeagueApplicationResponse:
  service = LeagueApplicationService(session)
  return service.create_application(league_id, payload)


@app.delete(
  "/leagues/{league_id}/applications/{member_id}",
  status_code=status.HTTP_204_NO_CONTENT
)
async def cancel_league_application(
  league_id: str,
  member_id: str,
  session: Session = Depends(get_session)
) -> None:
  service = LeagueApplicationService(session)
  service.cancel_application(league_id, member_id)


@app.get(
  "/leagues/{league_id}/matches",
  response_model=list[LeagueMatchResponse]
)
async def list_league_matches(
  league_id: str,
  session: Session = Depends(get_session)
) -> list[LeagueMatchResponse]:
  service = LeagueMatchService(session)
  return service.list_matches(league_id)


@app.post(
  "/leagues/{league_id}/matches",
  response_model=LeagueMatchResponse,
  status_code=status.HTTP_201_CREATED
)
async def create_league_match(
  league_id: str,
  payload: LeagueMatchCreateRequest,
  session: Session = Depends(get_session)
) -> LeagueMatchResponse:
  service = LeagueMatchService(session)
  return service.create_match(league_id, payload)


@app.post(
  "/leagues/{league_id}/bracket",
  response_model=list[LeagueMatchResponse]
)
async def generate_league_bracket(
  league_id: str,
  payload: BracketGenerationRequest,
  session: Session = Depends(get_session)
) -> list[LeagueMatchResponse]:
  service = LeagueBracketService(session)
  matches = service.generate_bracket(
    league_id=league_id,
    admin_id=payload.admin_id,
    groups_count=payload.groups_count,
    courts_count=payload.courts_count
  )
  return [LeagueMatchResponse.model_validate(match, from_attributes=True) for match in matches]


@app.patch(
  "/matches/{match_id}/score",
  response_model=LeagueMatchResponse
)
async def update_match_score(
  match_id: str,
  payload: MatchScoreUpdateRequest,
  session: Session = Depends(get_session)
) -> LeagueMatchResponse:
  service = LeagueMatchService(session)
  return service.update_match_score(match_id, payload)


@app.get(
  "/leagues/{league_id}/rankings",
  response_model=list[PlayerRankingResponse]
)
async def get_league_rankings(
  league_id: str,
  group_number: int | None = None,
  session: Session = Depends(get_session)
) -> list[PlayerRankingResponse]:
  service = RankingService(session)
  rankings = service.calculate_group_rankings(league_id, group_number)
  return [
    PlayerRankingResponse(
      player_name=r.player_name,
      group_number=r.group_number,
      wins=r.wins,
      losses=r.losses,
      points_for=r.points_for,
      points_against=r.points_against,
      points_diff=r.points_diff,
      matches_played=r.matches_played,
      win_rate=r.win_rate
    )
    for r in rankings
  ]


@app.post(
  "/leagues/{league_id}/tournament",
  response_model=list[LeagueMatchResponse]
)
async def generate_tournament_bracket(
  league_id: str,
  payload: TournamentBracketRequest,
  session: Session = Depends(get_session)
) -> list[LeagueMatchResponse]:
  service = TournamentService(session)
  matches = service.generate_tournament_bracket(
    league_id=league_id,
    admin_id=payload.admin_id,
    courts_count=payload.courts_count,
    top_n_per_group=payload.top_n_per_group
  )
  return [LeagueMatchResponse.model_validate(match, from_attributes=True) for match in matches]


@app.post(
  "/leagues/{league_id}/tournament/advance",
  response_model=list[LeagueMatchResponse]
)
async def advance_tournament_round(
  league_id: str,
  payload: TournamentAdvanceRequest,
  session: Session = Depends(get_session)
) -> list[LeagueMatchResponse]:
  service = TournamentService(session)
  matches = service.advance_tournament_round(
    league_id=league_id,
    admin_id=payload.admin_id,
    current_round=payload.current_round,
    courts_count=payload.courts_count
  )
  return [LeagueMatchResponse.model_validate(match, from_attributes=True) for match in matches]


@app.get(
  "/leagues/{league_id}/preliminary/status",
  response_model=PreliminaryCompleteResponse
)
async def check_preliminary_status(
  league_id: str,
  session: Session = Depends(get_session)
) -> PreliminaryCompleteResponse:
  service = DoublesTournamentService(session)
  is_complete = service.check_preliminary_complete(league_id)

  # Count matches
  from sqlalchemy import select, func
  from api.db.models import LeagueMatch
  total = session.execute(
    select(func.count(LeagueMatch.id)).where(
      LeagueMatch.league_id == league_id,
      LeagueMatch.round == 1
    )
  ).scalar_one()

  completed = session.execute(
    select(func.count(LeagueMatch.id)).where(
      LeagueMatch.league_id == league_id,
      LeagueMatch.round == 1,
      LeagueMatch.status == 'completed'
    )
  ).scalar_one()

  return PreliminaryCompleteResponse(
    is_complete=is_complete,
    total_matches=total,
    completed_matches=completed
  )


@app.post(
  "/leagues/{league_id}/doubles-tournament",
  response_model=list[LeagueMatchResponse]
)
async def generate_doubles_tournament(
  league_id: str,
  payload: DoublesTournamentGenerateRequest,
  session: Session = Depends(get_session)
) -> list[LeagueMatchResponse]:
  service = DoublesTournamentService(session)
  matches = service.generate_final_stage(
    league_id=league_id,
    admin_id=payload.admin_id,
    mode=payload.mode,
    courts_count=payload.courts_count,
    num_matches=payload.num_matches
  )
  return [LeagueMatchResponse.model_validate(match, from_attributes=True) for match in matches]


@app.patch(
  "/matches/{match_id}",
  response_model=LeagueMatchResponse
)
async def update_match(
  match_id: str,
  payload: MatchUpdateRequest,
  session: Session = Depends(get_session)
) -> LeagueMatchResponse:
  service = DoublesTournamentService(session)
  match = service.update_match(
    match_id=match_id,
    admin_id=payload.admin_id,
    scheduled_at=payload.scheduled_at,
    court=payload.court
  )
  return LeagueMatchResponse.model_validate(match, from_attributes=True)
