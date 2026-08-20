
import React from 'react';
// Re-writing imports to fix potential resolution issues with react-router-dom
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './lib/firebase';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { AdminPanel } from './pages/Admin';
import { Leagues } from './pages/Leagues';
import { Landing } from './pages/Landing';
import Login from './components/Login';
import { ResetPassword, ResetStandalone } from './pages/Reset';
import { GlobalLeaderboard } from './components/GlobalLeaderboard';
import { GlobalLeagueBetting } from './components/GlobalLeagueBetting';
import { GlobalLeagueLeaderboard } from './components/GlobalLeagueLeaderboard';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  // Fallback: if user lands on Firebase default handler path, render our branded reset page
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/__/auth/action')) {
    return <ResetStandalone />;
  }
  return (
    <HashRouter>
      <Routes>
        {/* Public Landing Page & Sections */}
        <Route path="/" element={<Landing />} />
        <Route path="/how-it-works" element={<Landing />} />
        <Route path="/benefits" element={<Landing />} />
        <Route path="/pricing" element={<Landing />} />
        <Route path="/faq" element={<Landing />} />

        {/* Public Reset Password Page */}
        <Route path="/reset" element={<ResetPassword />} />

        {/* Protected App Routes wrapped in Layout */}
        <Route path="/leagues" element={
          <ProtectedRoute>
            <Layout><Leagues /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/league/:leagueId" element={
          <ProtectedRoute>
            <Layout><Dashboard /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <Layout><AdminPanel /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/leaderboard" element={
          <ProtectedRoute>
            <Layout><GlobalLeaderboard /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/global-league" element={
          <ProtectedRoute>
            <Layout><GlobalLeagueBetting /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/global-league/leaderboard" element={
          <ProtectedRoute>
            <Layout><GlobalLeagueLeaderboard /></Layout>
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
