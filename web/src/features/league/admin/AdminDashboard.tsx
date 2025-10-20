import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { createLeague, listLeagues } from '../api';
import type { League } from '../types';
import { useMemberStore } from '../../auth/memberStore';

interface CreateLeagueForm {
  name: string;
  surface_type: string;
  entry_fee: number;
  max_participants: number;
  auto_generate_bracket: boolean;
  groups_count: number;
  courts_count: number;
}

export function AdminDashboard(): JSX.Element {
  const admin = useMemberStore((state) => state.currentMember);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [form, setForm] = useState<CreateLeagueForm>({
    name: '',
    surface_type: 'hard',
    entry_fee: 0,
    max_participants: 8,
    auto_generate_bracket: true,
    groups_count: 1,
    courts_count: 1
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLeagues(): Promise<void> {
      const response = await listLeagues();
      setLeagues(response);
    }
    void loadLeagues();
  }, []);

  const handleChange = (field: keyof CreateLeagueForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.type === 'checkbox'
        ? (event.target as HTMLInputElement).checked
        : event.target.value;
      setForm((prev) => ({ ...prev, [field]: field.includes('count') || field === 'entry_fee' || field === 'max_participants' ? Number(value) : value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('submitting');
    setError(null);
    try {
      await createLeague({
        name: form.name,
        surface_type: form.surface_type,
        entry_fee: Number(form.entry_fee),
        max_participants: Number(form.max_participants),
        auto_generate_bracket: form.auto_generate_bracket,
        groups_count: form.groups_count,
        courts_count: form.courts_count
      });
      setForm((prev) => ({ ...prev, name: '' }));
      setStatus('success');
      const refreshed = await listLeagues();
      setLeagues(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : '리그 생성에 실패했습니다.');
      setStatus('error');
    }
  };

  return (
    <section className="mx-auto min-h-screen max-w-xl px-5 py-10 space-y-8 bg-slate-950 text-slate-100">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.4em] text-primary">Admin Console</p>
        <h1 className="text-3xl font-semibold">관리자 대시보드</h1>
        <p className="text-sm text-slate-400">{admin?.full_name} 님, 여기에서 리그를 생성하고 상태를 관리하세요.</p>
      </header>
      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <h2 className="text-lg font-semibold">새 리그 생성</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2 text-sm">
            <span className="text-slate-300">리그 이름</span>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100"
              placeholder="2024 시즌 오픈"
              value={form.name}
              onChange={handleChange('name')}
              required
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="text-slate-300">코트 타입</span>
              <select
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100"
                value={form.surface_type}
                onChange={handleChange('surface_type')}
              >
                <option value="hard">하드</option>
                <option value="clay">클레이</option>
                <option value="grass">잔디</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-300">참가비 (₩)</span>
              <input
                type="number"
                min={0}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100"
                value={form.entry_fee}
                onChange={handleChange('entry_fee')}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-2 text-sm">
              <span className="text-slate-300">최대 참가 인원</span>
              <input
                type="number"
                min={4}
                max={128}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100"
                value={form.max_participants}
                onChange={handleChange('max_participants')}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-300">그룹 수</span>
              <input
                type="number"
                min={1}
                max={16}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100"
                value={form.groups_count}
                onChange={handleChange('groups_count')}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-300">코트 수</span>
              <input
                type="number"
                min={1}
                max={16}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100"
                value={form.courts_count}
                onChange={handleChange('courts_count')}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.auto_generate_bracket}
              onChange={handleChange('auto_generate_bracket')}
            />
            참가 인원 충족 시 자동으로 대진표 생성
          </label>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-slate-50 shadow-lg shadow-primary/30 disabled:opacity-60"
            disabled={status === 'submitting'}
          >
            {status === 'submitting' ? '생성 중...' : '리그 생성하기'}
          </button>
        </form>
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">리그 현황</h2>
        {leagues.length === 0 ? (
          <p className="text-sm text-slate-500">생성된 리그가 없습니다. 위 폼을 사용하여 새 리그를 추가하세요.</p>
        ) : (
          <ul className="space-y-3">
            {leagues.map((league) => (
              <li key={league.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-slate-100">{league.name}</p>
                    <p className="text-xs text-slate-400">
                      그룹 {league.groups_count ?? 1}개 • 코트 {league.courts_count ?? 1}개 • 참가 정원 {league.max_participants}명
                    </p>
                    <p className="text-xs text-slate-500">
                      {league.auto_generate_bracket ? '자동 대진표' : '수동 생성'} {league.bracket_generated_at ? '• 생성 완료' : ''}
                    </p>
                  </div>
                  <Link
                    className="rounded-lg border border-primary/40 px-3 py-2 text-xs text-primary"
                    to={`/leagues/${league.id}`}
                  >
                    상세 보기
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
