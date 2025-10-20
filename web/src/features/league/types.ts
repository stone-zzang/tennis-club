export interface League {
  readonly id: string;
  readonly name: string;
  readonly surface_type: string;
  readonly entry_fee: number;
  readonly max_participants: number;
  readonly auto_generate_bracket: boolean;
  readonly groups_count: number | null;
  readonly courts_count: number | null;
  readonly bracket_generated_at?: string | null;
  readonly final_stage_mode?: 'ranked_play' | 'elimination' | null;
  readonly created_at?: string | null;
}

export interface CreateLeaguePayload {
  readonly name: string;
  readonly surface_type: string;
  readonly entry_fee: number;
  readonly max_participants: number;
  readonly auto_generate_bracket?: boolean;
  readonly groups_count?: number | null;
  readonly courts_count?: number | null;
}

export interface LeagueMatch {
  readonly id: string;
  readonly league_id: string;
  readonly round: number;
  readonly group_number: number;
  readonly stage: 'preliminary' | 'ranked' | 'elimination';
  readonly player_a: string;
  readonly player_b: string;
  readonly court: string;
  readonly scheduled_at: string;
  readonly status: 'scheduled' | 'in_progress' | 'completed';
  readonly score_a: number | null;
  readonly score_b: number | null;
  readonly winner: string | null;
  readonly completed_at: string | null;
  readonly next_match_id: string | null;
  readonly next_match_slot: 'team_a' | 'team_b' | null;
}

export interface MatchScorePayload {
  readonly score_a: number;
  readonly score_b: number;
}
