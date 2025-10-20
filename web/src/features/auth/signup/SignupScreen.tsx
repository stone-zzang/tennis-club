import { useState } from 'react';

import { createMember } from '../api';
import { useMemberStore } from '../memberStore';

interface SignUpForm {
  fullName: string;
  email: string;
  level: string;
}

export function SignupScreen(): JSX.Element {
  const [form, setForm] = useState<SignUpForm>({ fullName: '', email: '', level: 'intermediate' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const setMember = useMemberStore((state) => state.setMember);

  const handleChange = (field: keyof SignUpForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('submitting');
    setError(null);

    try {
      const member = await createMember({
        full_name: form.fullName,
        email: form.email,
        level: form.level
      });
      setMember(member);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : '가입 신청에 실패했습니다');
      setStatus('error');
    }
  };

  return (
    <section className="mx-auto max-w-md px-5 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">회원 가입</h1>
        <p className="text-sm text-slate-400">리그 참가를 위해 기본 정보를 입력하세요.</p>
      </header>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">성함</span>
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
            placeholder="홍길동"
            value={form.fullName}
            onChange={handleChange('fullName')}
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">이메일</span>
          <input
            type="email"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange('email')}
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">실력 레벨</span>
          <select
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
            value={form.level}
            onChange={handleChange('level')}
          >
            <option value="beginner">입문자</option>
            <option value="intermediate">중급</option>
            <option value="advanced">상급</option>
          </select>
        </label>
        {status === 'error' && <p className="text-sm text-red-400">{error}</p>}
        {status === 'success' && <p className="text-sm text-emerald-400">가입이 완료되었습니다! 리그에 참가 신청해 보세요.</p>}
        <button
          type="submit"
          className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-slate-50 shadow-lg shadow-primary/30 disabled:opacity-60"
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? '신청 중...' : '가입 신청하기'}
        </button>
      </form>
    </section>
  );
}
