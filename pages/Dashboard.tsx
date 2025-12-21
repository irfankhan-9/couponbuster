import React, { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { MOCK_LEAGUES, MOCK_WEEKS, MOCK_MEMBERS, CURRENT_USER_ID, MOCK_USERS, MOCK_PICKS } from '../constants';
import { formatCurrency } from '../utils/scoring';
import { calculateLeagueWindow } from '../utils/scheduler';
import { processTurnHandover } from '../utils/draftLogic';
import { DraftRoom } from '../components/DraftRoom';
import { Leaderboard } from '../components/Leaderboard';
import { Users, PiggyBank, ChevronLeft, ShieldCheck, Lock, AlertCircle, Moon } from 'lucide-react';
import { Pick, Week } from '../types';

export const Dashboard: React.FC = () => {
  const { leagueId } = useParams();
  
  // Local State to simulate DB updates during the session
  const [weeks, setWeeks] = useState<Week[]>(MOCK_WEEKS);
  const [picks, setPicks] = useState<Pick[]>(MOCK_PICKS);
  
  // 1. Data Integrity: Locate League
  const activeLeague = MOCK_LEAGUES.find(l => l.id === leagueId);
  
  // 2. Strict Guarding: Verify Membership Record
  const membership = MOCK_MEMBERS.find(m => m.league_id === activeLeague?.id && m.user_id === CURRENT_USER_ID);
  
  const currentUser = MOCK_USERS.find(u => u.id === CURRENT_USER_ID);

  // SCENARIO A: League doesn't exist or user is not a member/rejected
  if (!activeLeague || !membership || membership.status === 'rejected' || !currentUser) {
      return <Navigate to="/leagues" replace />;
  }
  
  // SCENARIO B: Access Restricted (Pending Status)
  if (membership.status === 'pending') {
      return (
          <div className="max-w-2xl mx-auto mt-12 text-center p-12 bg-white rounded-[3rem] shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-1000">
              <div className="w-24 h-24 bg-amber-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 relative">
                  <div className="absolute inset-0 bg-amber-100 rounded-[2rem] animate-pulse opacity-40"></div>
                  <Lock className="h-10 w-10 text-amber-600 relative z-10" />
              </div>
              <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Access Restricted</h2>
              <p className="text-slate-500 mb-10 leading-relaxed text-lg px-6 font-medium">
                  Your membership for <span className="font-black text-emerald-600">{activeLeague.name}</span> is currently <span className="text-amber-600">Awaiting Admin Approval</span>. 
                  Dashboard features and Draft Room are locked until verification is complete.
              </p>
              
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-10 text-left flex items-start space-x-4">
                  <AlertCircle className="h-6 w-6 text-slate-400 mt-1 flex-shrink-0" />
                  <div>
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Anti-Cheat Notice</h4>
                      <p className="text-xs text-slate-400 mt-1 font-medium">Syndicate picks are strictly synchronized. Manual URL entry does not bypass administrative approval requirements.</p>
                  </div>
              </div>

              <Link to="/leagues" className="group inline-flex items-center text-slate-400 font-black hover:text-emerald-600 transition-all uppercase tracking-[0.2em] text-[10px]">
                  <ChevronLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
                  Return to Dashboard
              </Link>
          </div>
      );
  }

  // SCENARIO C: Verified Access (Approved Status)
  const leagueWeeks = weeks.filter(w => w.league_id === activeLeague.id);
  const baseActiveWeek = leagueWeeks.find(w => w.status === 'open') || [...leagueWeeks].sort((a,b) => b.week_number - a.week_number)[0];

  // 3. Scheduler Logic: Calculate Real-Time Window
  const { isOpen, deadlineDate } = calculateLeagueWindow(activeLeague);

  // Inject the calculated deadline
  const activeWeek = baseActiveWeek ? {
      ...baseActiveWeek,
      deadline_at: deadlineDate.toISOString()
  } : null;

  // Handle Pick Submission (Draft Logic)
  const handlePickSubmit = (teamId: string) => {
      if (!activeWeek) return;

      // 1. Create or Update Pick
      const newPicks = [...picks];
      const existingPickIndex = newPicks.findIndex(p => p.week_id === activeWeek.id && p.user_id === CURRENT_USER_ID);

      if (existingPickIndex >= 0) {
          // Update existing pick
          if (activeWeek.draft_round === 1) {
              newPicks[existingPickIndex].pick1_team_id = teamId;
          } else {
              newPicks[existingPickIndex].pick2_team_id = teamId;
          }
      } else {
          // New pick entry
          newPicks.push({
              id: `p-${Date.now()}`,
              week_id: activeWeek.id,
              user_id: CURRENT_USER_ID,
              submitted_at: new Date().toISOString(),
              pick1_team_id: activeWeek.draft_round === 1 ? teamId : undefined,
              pick2_team_id: activeWeek.draft_round === 2 ? teamId : undefined,
          });
      }
      setPicks(newPicks);

      // 2. Handover Turn
      const updates = processTurnHandover(activeWeek, activeWeek.pick_order);
      
      const newWeeks = weeks.map(w => {
          if (w.id === activeWeek.id) {
              return { ...w, ...updates };
          }
          return w;
      });
      setWeeks(newWeeks);
  };

  const leaderboardData = MOCK_MEMBERS
    .filter(m => m.league_id === activeLeague.id && m.status === 'approved')
    .map(m => {
        const user = MOCK_USERS.find(u => u.id === m.user_id);
        return {
            user_id: m.user_id,
            user_name: user?.display_name || 'Unknown',
            points: m.points,
            wins: m.wins
        };
    });

  const activePlayersCount = leaderboardData.length;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* League Header Card */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 opacity-20"></div>

        <Link 
          to="/leagues" 
          className="group inline-flex items-center text-slate-400 hover:text-emerald-600 transition-all duration-300 mb-8 animate-in slide-in-from-left-4 fade-in duration-1000"
        >
          <ChevronLeft className="h-4 w-4 mr-1.5 transition-transform duration-300 group-hover:-translate-x-1" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Global Leagues</span>
        </Link>

        <div className="lg:flex lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
               <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 uppercase tracking-widest border border-emerald-100">
                 <ShieldCheck className="h-3 w-3 mr-1" />
                 Verified Member
               </span>
               <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Season 2024/25</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight sm:text-5xl">{activeLeague.name}</h1>
            <div className="mt-5 flex items-center text-sm">
              <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                <Users className="flex-shrink-0 mr-2 h-4 w-4 text-slate-400" />
                <span className="font-black text-slate-900">{activePlayersCount}</span>
                <span className="ml-1.5 text-slate-500 font-medium">/ {activeLeague.max_players} Players</span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 lg:mt-0">
             <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 rounded-3xl p-7 text-white shadow-2xl min-w-[280px] border border-emerald-700 relative group overflow-hidden">
                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                
                <div className="flex items-center text-emerald-400 text-[10px] uppercase font-black tracking-widest mb-2">
                    <PiggyBank className="h-5 w-5 mr-3" />
                    Accumulated Savings Pot
                </div>
                <div className="text-5xl font-black text-white tracking-tighter">{formatCurrency(activeLeague.current_pot_pence)}</div>
                <div className="mt-4 pt-4 border-t border-emerald-700/50 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-300/60 uppercase tracking-wide">Growth Projection</span>
                    <span className="text-xs font-black text-emerald-400">+{formatCurrency(activeLeague.pot_deduction_pence)} / user</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          {activeWeek && isOpen ? (
             <DraftRoom 
                week={activeWeek}
                leagueMembers={MOCK_MEMBERS} // Pass global for mapping names if needed, but we used MOCK_USERS inside DraftRoom
                users={MOCK_USERS}
                currentPicks={picks}
                currentUser={currentUser}
                onPickSubmit={handlePickSubmit}
             />
          ) : (
            <div className="bg-slate-50 p-20 rounded-[2.5rem] border border-slate-200 text-center shadow-inner">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                    <Moon className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Market Closed</h3>
                <p className="text-slate-500 mt-2 text-lg max-w-md mx-auto leading-relaxed">
                   The pick window is closed for the weekend. <br/>
                   The market re-opens on <span className="text-emerald-600 font-bold">Monday morning</span>.
                </p>
                <div className="mt-8 inline-flex items-center justify-center bg-white px-6 py-3 rounded-xl border border-slate-200 shadow-sm text-xs font-black uppercase tracking-widest text-slate-400">
                    Next Deadline: Friday 11:00 PM
                </div>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <Leaderboard data={leaderboardData} />
          <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group">
            <div className="absolute inset-0 bg-emerald-600 opacity-0 group-hover:opacity-5 transition-opacity"></div>
            <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-4">Syndicate Rules</h4>
            <div className="space-y-4">
               <div className="flex items-start space-x-3">
                  <div className="h-5 w-5 bg-emerald-800 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">1</div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">Wait for your turn in the live draft.</p>
               </div>
               <div className="flex items-start space-x-3">
                  <div className="h-5 w-5 bg-emerald-800 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">2</div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">Unique teams only. Once a team is picked, it's gone.</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};