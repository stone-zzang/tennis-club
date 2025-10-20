import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { listLeagues } from '../league/api';
import type { League } from '../league/types';
import { useMemberStore } from '../auth/memberStore';
import { ThemeToggle } from '../../components/ThemeToggle';

const LEVEL_LABELS: Record<string, string> = {
  beginner: '입문자',
  intermediate: '중급',
  advanced: '상급'
};

export function HomeScreen(): JSX.Element {
  const member = useMemberStore((state) => state.currentMember);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLeagues(): Promise<void> {
      setStatus('loading');
      setError(null);
      try {
        const response = await listLeagues();
        setLeagues(response);
        setStatus('loaded');
      } catch (err) {
        setError(err instanceof Error ? err.message : '리그 정보를 불러오지 못했습니다');
        setStatus('error');
      }
    }

    void loadLeagues();
  }, []);

  const upcomingLeagues = useMemo(
    () => leagues.filter((league) => !league.bracket_generated_at),
    [leagues]
  );

  const ongoingLeagues = useMemo(
    () => leagues.filter((league) => Boolean(league.bracket_generated_at)),
    [leagues]
  );

  return (
    <section className="mx-auto max-w-md px-5 py-10 space-y-8">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Tennis Club League</p>
          <ThemeToggle />
        </div>
        <h1 className="text-3xl font-semibold dark:text-slate-100 text-slate-900">반갑습니다, {member?.full_name ?? '게스트'} 님!</h1>
        <p className="text-sm dark:text-slate-400 text-slate-600">
          모바일 친화적인 리그 관리 도구로 참가 신청부터 대진표까지 모두 확인하세요.
        </p>
      </header>

      <section className="rounded-2xl dark:bg-slate-900/60 bg-slate-100 p-5 space-y-2">
        <h2 className="text-lg font-semibold dark:text-slate-100 text-slate-900">내 랭크</h2>
        <p className="text-sm dark:text-slate-300 text-slate-700">
          현재 레벨: {LEVEL_LABELS[member?.level ?? 'intermediate'] ?? member?.level ?? '중급'}
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold dark:text-slate-100 text-slate-900">진행 예정 리그</h2>
          {status === 'loading' && <span className="text-xs dark:text-slate-500 text-slate-400">불러오는 중...</span>}
        </div>
        {status === 'error' && <p className="text-xs text-red-400">{error}</p>}
        {status === 'loaded' && upcomingLeagues.length === 0 ? (
          <p className="text-sm dark:text-slate-400 text-slate-600">등록된 진행 예정 리그가 없습니다. 새 시즌을 기다려주세요!</p>
        ) : (
          <ul className="space-y-3 text-sm dark:text-slate-300 text-slate-700">
            {upcomingLeagues.map((league) => (
              <li key={league.id} className="rounded-xl border dark:border-slate-800 border-slate-200 p-4 dark:bg-slate-900/40 bg-white">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold dark:text-slate-100 text-slate-900">{league.name}</p>
                    <p className="text-xs dark:text-slate-500 text-slate-500">
                      {league.surface_type} 코트 • 최대 {league.max_participants}명
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/leagues/${league.id}/apply`}
                      className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white"
                    >
                      참가 신청
                    </Link>
                    <Link
                      to={`/leagues/${league.id}`}
                      className="rounded-lg border dark:border-slate-800 border-slate-300 px-3 py-2 text-xs dark:text-slate-200 text-slate-700"
                    >
                      상세 보기
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold dark:text-slate-100 text-slate-900">진행 중인 리그</h2>
        {ongoingLeagues.length === 0 ? (
          <p className="text-sm dark:text-slate-400 text-slate-600">현재 진행 중인 리그가 없습니다.</p>
        ) : (
          <ul className="space-y-3 text-sm dark:text-slate-300 text-slate-700">
            {ongoingLeagues.map((league) => (
              <li key={league.id} className="rounded-xl border dark:border-slate-800 border-slate-200 p-4 dark:bg-slate-900/40 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold dark:text-slate-100 text-slate-900">{league.name}</p>
                    <p className="text-xs dark:text-slate-500 text-slate-500">
                      대진표 생성: {league.bracket_generated_at ? new Date(league.bracket_generated_at).toLocaleString() : '대기 중'}
                    </p>
                  </div>
                  <Link
                    to={`/leagues/${league.id}`}
                    className="rounded-lg border dark:border-slate-800 border-slate-300 px-3 py-2 text-xs dark:text-slate-200 text-slate-700"
                  >
                    경기 보기
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
