import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { HomeScreen } from './features/home/HomeScreen';
import { SignupScreen } from './features/auth/signup/SignupScreen';
import { LeagueDashboard } from './features/league/bracket/LeagueDashboard';
import { ApplyScreen } from './features/league/apply/ApplyScreen';
import { BottomNav } from './components/BottomNav';
import { useMemberStore } from './features/auth/memberStore';
import { LoginScreen } from './features/auth/login/LoginScreen';
import { AdminDashboard } from './features/league/admin/AdminDashboard';

function RequireMember({ children }: { children: JSX.Element }): JSX.Element {
  const member = useMemberStore((state) => state.currentMember);
  const location = useLocation();
  if (!member) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

function RequireAdmin({ children }: { children: JSX.Element }): JSX.Element {
  const member = useMemberStore((state) => state.currentMember);
  const location = useLocation();
  if (!member) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (member.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppRoutes(): JSX.Element {
  const member = useMemberStore((state) => state.currentMember);

  return (
    <Routes>
      <Route
        path="/login"
        element={member ? <Navigate to="/" replace /> : <LoginScreen />}
      />
      <Route
        path="/"
        element={
          <RequireMember>
            <HomeScreen />
          </RequireMember>
        }
      />
      <Route path="/signup" element={<SignupScreen />} />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminDashboard />
          </RequireAdmin>
        }
      />
      <Route
        path="/leagues/:leagueId"
        element={
          <RequireMember>
            <LeagueDashboard />
          </RequireMember>
        }
      />
      <Route
        path="/leagues/:leagueId/apply"
        element={
          <RequireMember>
            <ApplyScreen />
          </RequireMember>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App(): JSX.Element {
  const member = useMemberStore((state) => state.currentMember);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
        <AppRoutes />
      </div>
      {member && <BottomNav />}
    </BrowserRouter>
  );
}

export default App;
