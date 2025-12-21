
import React from 'react';
// Re-writing imports to fix potential resolution issues with react-router-dom
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { AdminPanel } from './pages/Admin';
import { Leagues } from './pages/Leagues';
import { Landing } from './pages/Landing';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<Landing />} />
        
        {/* Protected App Routes wrapped in Layout */}
        <Route path="/leagues" element={<Layout><Leagues /></Layout>} />
        <Route path="/league/:leagueId" element={<Layout><Dashboard /></Layout>} />
        <Route path="/admin" element={<Layout><AdminPanel /></Layout>} />
        
        {/* Fallback */}
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </HashRouter>
  );
};

export default App;
