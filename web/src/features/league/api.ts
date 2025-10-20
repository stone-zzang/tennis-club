import { http } from '../../lib/api';
import type { CreateLeaguePayload, League, LeagueMatch, MatchScorePayload } from './types';

export interface LeagueApplicationListItem {
  readonly id: string;
  readonly status: string;
  readonly applied_at?: string;
  readonly member?: {
    readonly id: string;
    readonly full_name: string;
    readonly email: string;
    readonly level: string;
  } | null;
}

export interface BracketGenerationPayload {
  readonly admin_id: string;
  readonly groups_count: number;
  readonly courts_count: number;
}

export type FinalStageMode = 'ranked_play' | 'elimination';

export interface FinalStagePayload {
  readonly admin_id: string;
  readonly mode: FinalStageMode;
  readonly num_matches?: number;
  readonly courts_count: number;
}

export interface MatchUpdatePayload {
  readonly admin_id: string;
  readonly scheduled_at?: string;
  readonly court?: string;
}

export interface PreliminaryStatus {
  readonly is_complete: boolean;
  readonly total_matches: number;
  readonly completed_matches: number;
}

export async function listLeagues(): Promise<League[]> {
  return http<League[]>('/leagues', { method: 'GET' });
}

export async function getLeague(id: string): Promise<League> {
  return http<League>(`/leagues/${id}`, { method: 'GET' });
}

export async function createLeague(payload: CreateLeaguePayload): Promise<League> {
  return http<League>('/leagues', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function applyToLeague(leagueId: string, memberId: string): Promise<void> {
  await http(`/leagues/${leagueId}/applications`, {
    method: 'POST',
    body: JSON.stringify({ member_id: memberId }),
    parseJson: false
  });
}

export async function listLeagueApplications(leagueId: string): Promise<LeagueApplicationListItem[]> {
  return http<LeagueApplicationListItem[]>(`/leagues/${leagueId}/applications`, { method: 'GET' });
}

export async function listLeagueMatches(leagueId: string): Promise<LeagueMatch[]> {
  return http<LeagueMatch[]>(`/leagues/${leagueId}/matches`, { method: 'GET' });
}

export async function generateBracket(leagueId: string, payload: BracketGenerationPayload): Promise<LeagueMatch[]> {
  return http<LeagueMatch[]>(`/leagues/${leagueId}/bracket`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateMatchScore(matchId: string, payload: MatchScorePayload): Promise<LeagueMatch> {
  return http<LeagueMatch>(`/matches/${matchId}/score`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function cancelApplication(leagueId: string, memberId: string): Promise<void> {
  await http(`/leagues/${leagueId}/applications/${memberId}`, {
    method: 'DELETE',
    parseJson: false
  });
}

export async function checkPreliminaryStatus(leagueId: string): Promise<PreliminaryStatus> {
  return http<PreliminaryStatus>(`/leagues/${leagueId}/preliminary/status`, { method: 'GET' });
}

export async function generateFinalStage(leagueId: string, payload: FinalStagePayload): Promise<LeagueMatch[]> {
  return http<LeagueMatch[]>(`/leagues/${leagueId}/doubles-tournament`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateMatch(matchId: string, payload: MatchUpdatePayload): Promise<LeagueMatch> {
  return http<LeagueMatch>(`/matches/${matchId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}
