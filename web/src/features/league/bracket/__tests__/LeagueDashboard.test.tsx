import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { LeagueDashboard } from '../LeagueDashboard';
import { useMemberStore } from '../../../auth/memberStore';

afterEach(() => {
  vi.unstubAllGlobals();
  useMemberStore.getState().clearMember();
  window.localStorage.removeItem('tennis-member-store');
});

describe('LeagueDashboard', () => {
  it('renders league metadata from the API', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      if (typeof input === 'string' && input.endsWith('/applications')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              id: 'application-1',
              status: 'pending',
              member: {
                id: 'member-1',
                full_name: '박참가',
                email: 'applicant@example.com',
                level: 'beginner'
              }
            }
          ]
        });
      }

      if (typeof input === 'string' && input.endsWith('/matches')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              id: 'match-1',
              league_id: '123',
              round: 1,
              group_number: 1,
              stage: 'preliminary',
              player_a: '박참가',
              player_b: '김코치',
              court: 'Court 1',
              scheduled_at: '2024-04-12T09:00:00Z',
              status: 'scheduled',
              score_a: null,
              score_b: null,
              winner: null,
              completed_at: null,
              next_match_id: null,
              next_match_slot: null,
              created_at: '2024-04-10T09:00:00Z'
            }
          ]
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({
          id: '123',
          name: '봄 시즌 리그',
          surface_type: 'clay',
          entry_fee: 25000,
          max_participants: 16,
          auto_generate_bracket: true,
          groups_count: 1,
          courts_count: 1,
          final_stage_mode: null,
          bracket_generated_at: '2024-04-11T09:00:00Z',
          created_at: '2024-04-01T09:00:00Z'
        })
      });
    }));

    useMemberStore.getState().setMember({
      id: 'member-1',
      full_name: '관리자',
      email: 'admin@example.com',
      level: 'advanced',
      role: 'admin'
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/leagues/123' }]}> 
        <Routes>
          <Route path="/leagues/:leagueId" element={<LeagueDashboard />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('봄 시즌 리그')).toBeInTheDocument();
    expect(await screen.findByText('박참가')).toBeInTheDocument();
    const groupLabels = await screen.findAllByText('그룹 1');
    expect(groupLabels.length).toBeGreaterThan(0);
    expect(await screen.findByText('박참가 vs 김코치')).toBeInTheDocument();
  });
});
