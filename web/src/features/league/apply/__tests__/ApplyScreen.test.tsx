import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import { ApplyScreen } from '../ApplyScreen';
import { useMemberStore } from '../../../auth/memberStore';

afterEach(() => {
  vi.unstubAllGlobals();
  useMemberStore.getState().clearMember();
  window.localStorage.removeItem('tennis-member-store');
});

describe('ApplyScreen', () => {
  it('submits application for the current member', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === 'string' && init?.method === 'POST') {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }

      if (typeof input === 'string' && input.includes('/leagues/') && (!init || init.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'league-1',
            name: '가을 챔피언십',
            surface_type: 'hard',
            entry_fee: 15000,
            max_participants: 12,
            auto_generate_bracket: true,
            groups_count: 1,
            courts_count: 1,
            bracket_generated_at: null,
            created_at: '2024-04-01T00:00:00Z'
          })
        });
      }

      return Promise.reject(new Error('Unexpected fetch call'));
    });

    vi.stubGlobal('fetch', fetchMock);

    useMemberStore.getState().setMember({
      id: 'member-1',
      full_name: '박참가',
      email: 'applicant@example.com',
      level: 'beginner',
      role: 'member'
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/leagues/league-1/apply' }]}> 
        <Routes>
          <Route path="/leagues/:leagueId/apply" element={<ApplyScreen />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/가을 챔피언십/)).toBeInTheDocument();
    const submitButtons = screen.getAllByRole('button', { name: '참가 신청하기' });
    fireEvent.click(submitButtons[0]);
    expect(await screen.findByText('참가 신청이 완료되었습니다!')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('prompts signup when member context is missing', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'league-1',
        name: '가을 챔피언십',
        surface_type: 'hard',
        entry_fee: 15000,
        max_participants: 12,
        auto_generate_bracket: true,
        groups_count: 1,
        courts_count: 1,
        bracket_generated_at: null,
        created_at: '2024-04-01T00:00:00Z'
      })
    });

    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter initialEntries={[{ pathname: '/leagues/league-1/apply' }]}> 
        <Routes>
          <Route path="/leagues/:leagueId/apply" element={<ApplyScreen />} />
        </Routes>
      </MemoryRouter>
    );

    const prompts = await screen.findAllByText(/아직 회원가입을 완료하지 않았다면/);
    expect(prompts[0]).toBeInTheDocument();
    const submitButtons = screen.getAllByRole('button', { name: '참가 신청하기' });
    fireEvent.click(submitButtons[0]);
    expect(
      await screen.findByText('리그에 참가하려면 먼저 회원 가입이 필요합니다.')
    ).toBeInTheDocument();
  });
});
