import { useLocation, useNavigate } from 'react-router-dom';

import { useMemberStore } from '../features/auth/memberStore';
import { HomeIcon, LogoutIcon, ShieldIcon, TrophyIcon } from './icons';

const navButtonClass = (active: boolean) =>
  `flex flex-col items-center gap-1 text-xs ${active ? 'text-primary' : 'text-slate-400'}`;

export function BottomNav(): JSX.Element | null {
  const navigate = useNavigate();
  const location = useLocation();
  const member = useMemberStore((state) => state.currentMember);
  const clearMember = useMemberStore((state) => state.clearMember);

  if (!member) {
    return null;
  }

  const handleLogout = () => {
    clearMember();
    navigate('/login', { replace: true });
  };

  const isAdmin = member.role === 'admin';

  return (
    <nav className="fixed bottom-0 left-0 right-0 mx-auto max-w-md bg-slate-900/95 backdrop-blur border-t border-slate-800">
      <div className="flex justify-around py-3">
        <button type="button" onClick={() => navigate('/')}
          className={navButtonClass(location.pathname === '/')}
        >
          <HomeIcon className="h-6 w-6" />
          <span>홈</span>
        </button>
        {isAdmin ? (
          <button type="button" onClick={() => navigate('/admin')}
            className={navButtonClass(location.pathname.startsWith('/admin') || location.pathname.includes('/leagues/new'))}
          >
            <ShieldIcon className="h-6 w-6" />
            <span>관리</span>
          </button>
        ) : (
          <button type="button" onClick={() => navigate('/')} className={navButtonClass(false)}>
            <TrophyIcon className="h-6 w-6" />
            <span>내 리그</span>
          </button>
        )}
        <button type="button" onClick={handleLogout} className={navButtonClass(false)}>
          <LogoutIcon className="h-6 w-6" />
          <span>로그아웃</span>
        </button>
      </div>
    </nav>
  );
}
