import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { applyToLeague, getLeague } from '../api';
import type { League } from '../types';
import { useMemberStore } from '../../auth/memberStore';

export function ApplyScreen(): JSX.Element {
  const { leagueId } = useParams();
  const { currentMember } = useMemberStore();
  const [league, setLeague] = useState<League | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [applyStatus, setApplyStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!leagueId) return;
    let isMounted = true;

    async function loadLeague(): Promise<void> {
      setStatus('loading');
      setError(null);
      try {
        const response = await getLeague(leagueId);
        if (isMounted) {
          setLeague(response);
          setStatus('loaded');
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : '리그 정보를 불러오지 못했습니다');
          setStatus('error');
        }
      }
    }

    void loadLeague();
    return () => {
      isMounted = false;
    };
  }, [leagueId]);

  const handleApply = useCallback(async () => {
    if (!leagueId) {
      return;
    }
    if (!currentMember) {
      setError('리그에 참가하려면 먼저 회원 가입이 필요합니다.');
      setApplyStatus('error');
      return;
    }

    setApplyStatus('submitting');
    setError(null);
    try {
      await applyToLeague(leagueId, currentMember.id);
      setApplyStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : '참가 신청에 실패했습니다');
      setApplyStatus('error');
    }
  }, [currentMember, leagueId]);

  return (
    <section className="mx-auto max-w-md px-5 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">리그 참가 신청</h1>
        {status === 'loading' && <p className="text-xs text-slate-500">리그 정보를 불러오는 중...</p>}
        {status === 'error' && <p className="text-xs text-red-400">{error}</p>}
        {league && (
          <p className="text-sm text-slate-400">
            {league.name} • {league.surface_type} 코트 • 참가비 ₩{league.entry_fee.toLocaleString()}
          </p>
        )}
      </header>
      <div className="rounded-2xl bg-slate-900/60 p-4 space-y-3">
        <p className="text-sm text-slate-300">대회 규정</p>
        <ul className="space-y-2 text-xs text-slate-400">
          <li>• 참가비는 경기 시작 전 현장 납부</li>
          <li>• 기본 셋은 8게임 프로셋</li>
          <li>• 경기 결과는 10분 이내 입력</li>
        </ul>
      </div>
      {!currentMember && (
        <p className="text-xs text-slate-400">
          아직 회원가입을 완료하지 않았다면 <Link to="/signup" className="text-primary underline">가입 페이지</Link>로 이동하세요.
        </p>
      )}
      {applyStatus === 'success' && <p className="text-sm text-emerald-400">참가 신청이 완료되었습니다!</p>}
      {applyStatus === 'error' && error && <p className="text-sm text-red-400">{error}</p>}
      <button
        className="w-full rounded-xl bg-secondary px-4 py-3 font-medium text-slate-900 disabled:opacity-60"
        disabled={applyStatus === 'submitting' || !leagueId}
        onClick={handleApply}
      >
        {applyStatus === 'submitting' ? '신청 중...' : '참가 신청하기'}
      </button>
    </section>
  );
}
