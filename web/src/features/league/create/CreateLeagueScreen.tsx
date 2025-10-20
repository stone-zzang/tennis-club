import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createLeague } from '../api';

interface CreateLeagueForm {
  readonly name: string;
  readonly surface_type: string;
  readonly entry_fee: number;
  readonly max_participants: number;
}

const INITIAL_FORM: CreateLeagueForm = {
  name: '',
  surface_type: 'hard',
  entry_fee: 0,
  max_participants: 8
};

export function CreateLeagueScreen(): JSX.Element {
  const navigate = useNavigate();
  const [form, setForm] = useState<CreateLeagueForm>(INITIAL_FORM);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const updateForm = <K extends keyof CreateLeagueForm>(key: K, value: CreateLeagueForm[K]): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setStatus('submitting');
    setError(null);

    try {
      const league = await createLeague({
        name: form.name,
        surface_type: form.surface_type,
        entry_fee: Number(form.entry_fee),
        max_participants: Number(form.max_participants)
      });
      navigate(`/leagues/${league.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '리그 생성에 실패했습니다');
      setStatus('error');
    } finally {
      setStatus('idle');
    }
  };

  return (
    <section className="mx-auto max-w-md px-5 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">리그 생성</h1>
        <p className="text-sm text-slate-400">코트 종류와 참가 인원을 설정하고 새로운 시즌을 열어보세요.</p>
      </header>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">리그 이름</span>
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
            placeholder="2024 봄 시즌"
            value={form.name}
            onChange={(event) => updateForm('name', event.target.value)}
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">코트 타입</span>
          <select
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
            value={form.surface_type}
            onChange={(event) => updateForm('surface_type', event.target.value)}
          >
            <option value="hard">하드</option>
            <option value="clay">클레이</option>
            <option value="grass">잔디</option>
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">참가비 (₩)</span>
          <input
            type="number"
            min={0}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
            value={form.entry_fee}
            onChange={(event) => updateForm('entry_fee', Number(event.target.value))}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">최대 참가 인원</span>
          <input
            type="number"
            min={2}
            max={128}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
            value={form.max_participants}
            onChange={(event) => updateForm('max_participants', Number(event.target.value))}
          />
        </label>
        {status === 'error' && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-xl bg-secondary px-4 py-3 font-medium text-slate-900 disabled:opacity-60"
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? '생성 중...' : '리그 생성하기'}
        </button>
      </form>
    </section>
  );
}
