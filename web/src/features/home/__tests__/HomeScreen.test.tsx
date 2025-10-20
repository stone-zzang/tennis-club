import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomeScreen } from '../HomeScreen';
import { useMemberStore } from '../../auth/memberStore';

const mockLeagues = [
  {
    id: 'league-1',
    name: '봄 시즌 리그',
    surface_type: 'clay',
    entry_fee: 25000,
    max_participants: 16,
    auto_generate_bracket: true,
    groups_count: 1,
    courts_count: 1,
    bracket_generated_at: null,
    created_at: '2024-04-01T00:00:00Z'
  }
];

afterEach(() => {
  vi.unstubAllGlobals();
  useMemberStore.getState().clearMember();
  window.localStorage.removeItem('tennis-member-store');
});

describe('HomeScreen', () => {
  it('shows greeting and upcoming leagues', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockLeagues
    }));

    useMemberStore.getState().setMember({
      id: 'member-1',
      full_name: '김선수',
      email: 'player@example.com',
      level: 'intermediate',
      role: 'member'
    });

    render(
      <MemoryRouter>
        <HomeScreen />
      </MemoryRouter>
    );

    expect(await screen.findByText(/김선수/)).toBeInTheDocument();
    expect(await screen.findByText('봄 시즌 리그')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: '참가 신청' })).toBeInTheDocument();
  });
});
