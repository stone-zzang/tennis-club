import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { createMember } from '../api';
import { useMemberStore } from '../memberStore';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';
const ADMIN_EMAIL = 'admin@tennis.club';

const SAMPLE_MEMBERS = [
  { fullName: '샘플회원 A', email: 'sample-a@tennis.club', level: 'beginner' },
  { fullName: '샘플회원 B', email: 'sample-b@tennis.club', level: 'intermediate' },
  { fullName: '샘플회원 C', email: 'sample-c@tennis.club', level: 'advanced' }
];

interface MemberForm {
  fullName: string;
  email: string;
  level: string;
}

interface AdminForm {
  username: string;
  password: string;
}

export function LoginScreen(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const setMember = useMemberStore((state) => state.setMember);
  const [mode, setMode] = useState<'member' | 'admin'>('member');
  const [memberForm, setMemberForm] = useState<MemberForm>({
    fullName: '',
    email: '',
    level: 'intermediate'
  });
  const [adminForm, setAdminForm] = useState<AdminForm>({ username: '', password: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleMemberChange = (field: keyof MemberForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setMemberForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleAdminChange = (field: keyof AdminForm) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setAdminForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const redirectTo = typeof location.state === 'object' && location.state?.from ? location.state.from : '/';

  const handleMemberSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('submitting');
    setError(null);
    try {
      const member = await createMember({
        full_name: memberForm.fullName,
        email: memberForm.email,
        level: memberForm.level
      });
      setMember(member);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다. 다시 시도해주세요.');
      setStatus('error');
    }
  };

  const handleAdminSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('submitting');
    setError(null);
    if (adminForm.username !== ADMIN_USERNAME || adminForm.password !== ADMIN_PASSWORD) {
      setError('관리자 자격 증명이 올바르지 않습니다.');
      setStatus('error');
      return;
    }

    try {
      const admin = await createMember({
        full_name: '관리자',
        email: ADMIN_EMAIL,
        level: 'advanced',
        role: 'admin'
      });
      setMember(admin);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '관리자 인증에 실패했습니다.');
      setStatus('error');
    }
  };

  const handleSampleLogin = async (sample: (typeof SAMPLE_MEMBERS)[number]) => {
    setStatus('submitting');
    setError(null);
    try {
      const member = await createMember({
        full_name: sample.fullName,
        email: sample.email,
        level: sample.level
      });
      setMember(member);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '샘플 계정 로그인에 실패했습니다.');
      setStatus('error');
    }
  };

  return (
    <section className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10 space-y-8 bg-slate-950 text-slate-100">
      <header className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-primary">Tennis Club League</p>
        <h1 className="text-3xl font-semibold">로그인</h1>
        <p className="text-sm text-slate-400">
          일반 회원은 간단한 정보를 입력하고, 관리자는 고정 아이디/비밀번호로 접속하세요.
        </p>
      </header>
      <div className="flex justify-center gap-3 text-sm">
        <button
          type="button"
          className={`flex-1 rounded-xl border px-4 py-2 ${mode === 'member' ? 'border-primary text-primary' : 'border-slate-800 text-slate-400'}`}
          onClick={() => {
            setMode('member');
            setError(null);
            setStatus('idle');
          }}
        >
          회원 로그인
        </button>
        <button
          type="button"
          className={`flex-1 rounded-xl border px-4 py-2 ${mode === 'admin' ? 'border-primary text-primary' : 'border-slate-800 text-slate-400'}`}
          onClick={() => {
            setMode('admin');
            setError(null);
            setStatus('idle');
          }}
        >
          관리자 로그인
        </button>
      </div>

      {mode === 'member' ? (
        <form className="space-y-5" onSubmit={handleMemberSubmit}>
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">이름</span>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
              placeholder="홍길동"
              value={memberForm.fullName}
              onChange={handleMemberChange('fullName')}
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">이메일</span>
            <input
              type="email"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
              placeholder="you@example.com"
              value={memberForm.email}
              onChange={handleMemberChange('email')}
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">실력 레벨</span>
            <select
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
              value={memberForm.level}
              onChange={handleMemberChange('level')}
            >
              <option value="beginner">입문자</option>
              <option value="intermediate">중급</option>
              <option value="advanced">상급</option>
            </select>
          </label>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-slate-50 shadow-lg shadow-primary/30 disabled:opacity-60"
            disabled={status === 'submitting'}
          >
            {status === 'submitting' ? '진행 중...' : '시작하기'}
          </button>
          <div className="space-y-2 text-xs text-slate-400">
            <p>샘플 계정으로 바로 확인해보세요:</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_MEMBERS.map((sample) => (
                <button
                  key={sample.email}
                  type="button"
                  className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-200"
                  onClick={() => handleSampleLogin(sample)}
                  disabled={status === 'submitting'}
                >
                  {sample.fullName}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-500">
            정식 가입 페이지로 이동하려면 <button type="button" className="underline" onClick={() => navigate('/signup')}>회원 가입</button>을 누르세요.
          </p>
        </form>
      ) : (
        <form className="space-y-5" onSubmit={handleAdminSubmit}>
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">관리자 아이디</span>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
              placeholder="admin"
              value={adminForm.username}
              onChange={handleAdminChange('username')}
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">비밀번호</span>
            <input
              type="password"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
              placeholder="admin"
              value={adminForm.password}
              onChange={handleAdminChange('password')}
              required
            />
          </label>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-slate-50 shadow-lg shadow-primary/30 disabled:opacity-60"
            disabled={status === 'submitting'}
          >
            {status === 'submitting' ? '진행 중...' : '관리자 접속'}
          </button>
        </form>
      )}
    </section>
  );
}
