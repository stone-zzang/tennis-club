import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SignupScreen } from '../SignupScreen';
import { useMemberStore } from '../../memberStore';

afterEach(() => {
  vi.unstubAllGlobals();
  useMemberStore.getState().clearMember();
  window.localStorage.removeItem('tennis-member-store');
});

describe('SignupScreen', () => {
  it('submits form and stores member data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'member-1',
        full_name: '김선수',
        email: 'player@example.com',
        level: 'intermediate',
        role: 'member'
      })
    }));

    render(<SignupScreen />);

    fireEvent.change(screen.getByPlaceholderText('홍길동'), { target: { value: '김선수' } });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'player@example.com' }
    });
    fireEvent.click(screen.getByRole('button', { name: '가입 신청하기' }));

    expect(
      await screen.findByText('가입이 완료되었습니다! 리그에 참가 신청해 보세요.')
    ).toBeInTheDocument();
    expect(useMemberStore.getState().currentMember?.email).toBe('player@example.com');
  });
});
