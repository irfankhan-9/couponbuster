import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, runTransaction, collection, setDoc, query, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useLeagues, useLeagueMembers, useActiveWeek, useWeekPicks, useUsers } from '../hooks/useSyndicateData';
import { formatCurrency } from '../utils/scoring';
import { calculateLeagueWindow } from '../utils/scheduler';
import { processTurnHandover } from '../utils/draftLogic';
import { DraftRoom } from '../components/DraftRoom';
import { Leaderboard } from '../components/Leaderboard';
import { MobileNav } from '../components/MobileNav';
import { UserNameWithTitle } from '../components/UserNameWithTitle';
import { Users, PiggyBank, ChevronLeft, ShieldCheck, Lock, AlertCircle, Moon } from 'lucide-react';
import { Week, User } from '../types';
import { TEAMS } from '../constants';

export const Dashboard: React.FC = () => {
  const { leagueId } = useParams();
  const [user, authLoading] = useAuthState(auth);
  const [activeTab, setActiveTab] = React.useState<'draft' | 'table' | 'pot' | 'rules'>('draft');

  const { leagues, loading: leaguesLoading, error: leaguesError } = useLeagues();
  const { members, loading: membersLoading, error: membersError } = useLeagueMembers(leagueId);
  const { users: allUsers, loading: usersLoading, error: usersError } = useUsers();
  const { activeWeek, loading: weekLoading, error: weekError } = useActiveWeek(leagueId);
  const { picks } = useWeekPicks(activeWeek?.id);

  const isLoading = authLoading || leaguesLoading || membersLoading || usersLoading || weekLoading;
  const hasError = leaguesError || membersError || usersError || weekError;

  // 1. Data Integrity: Locate League
  const activeLeague = leagues.find(l => l.id === leagueId);

  // 2. Strict Guarding: Verify Membership Record
  const membership = members.find(m => m.league_id === activeLeague?.id && m.user_id === user?.uid);

  const currentUserProfile = allUsers.find(u => u.id === user?.uid) as User | undefined;

  const isOwner = user?.uid === activeLeague?.owner_id;

// Self-heal: if the user profile document is missing (common for brand-new members)
    // create it from the Auth profile so we don't bounce them back.
    React.useEffect(() => {
      if (user && !currentUserProfile && !isLoading) {
        setDoc(doc(db, 'users', user.uid), {
          display_name: user.displayName || user.email?.split('@')[0] || 'Member',
          email: user.email || '',
          role: 'member',
          rank_title: null,
          total_winnings_pence: 0,
          earned_titles: [],
          displayed_title_id: null,
          pinned_title_ids: [],
          created_at: new Date().toISOString()
        }, { merge: true }).catch(() => { /* non-fatal */ });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, currentUserProfile, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-600 mb-4"></div>
        <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Syncing League Data...</p>
      </div>
    );
  }

  if (hasError) {
    const mainError = leaguesError || membersError || usersError || weekError;
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-red-100 p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Sync Error</h2>
          <p className="text-slate-500 mb-6 font-medium leading-relaxed">
            There was a problem communicating with the database. This usually happens if a required data index is missing or you have lost connection.
          </p>
          <div className="bg-red-50 p-4 rounded-xl text-left mb-6 overflow-hidden">
            <p className="text-red-800 text-xs font-mono break-words">{mainError?.message}</p>
          </div>
          <button onClick={() => window.location.reload()} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-colors">
            Try Re-Syncing
          </button>
        </div>
      </div>
    );
  }

  // SCENARIO A: League doesn't exist OR user is neither a member nor the owner
  if (!activeLeague || (!membership && !isOwner) || (membership && membership.status === 'rejected')) {
    return <Navigate to="/leagues" replace />;
  }

  // After self-heal, if still missing, treat as member (don't redirect)
  const effectiveUserProfile = currentUserProfile || (user ? {
    id: user.uid,
    email: user.email || '',
    display_name: user.displayName || user.email?.split('@')[0] || 'Member',
    role: 'member' as any,
    rank_title: null as any,
    total_winnings_pence: 0,
    created_at: new Date().toISOString()
  } as any : null);

  // SCENARIO B: Access Restricted (Pending Status) — owners bypass this
  if (membership && membership.status === 'pending' && !isOwner) {
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

  // 3. Scheduler Logic: Calculate Real-Time Window
  const { isOpen, deadlineDate } = calculateLeagueWindow(activeLeague);

  // Inject the calculated deadline into activeWeek if it exists
  const displayWeek = activeWeek ? {
    ...activeWeek,
    deadline_at: deadlineDate.toISOString()
  } : null;

  // Handle Pick Submission (Draft Logic)
  const handlePickSubmit = async (teamId: string) => {
    if (!displayWeek || !user) return;

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Get Fresh Week Data (Consistency Check)
        const weekRef = doc(db, 'weeks', displayWeek.id);
        const weekDoc = await transaction.get(weekRef);
        if (!weekDoc.exists()) throw new Error("Week not found");

        const freshWeek = { id: weekDoc.id, ...weekDoc.data() } as Week;

        // 2. Validate Turn
        if (freshWeek.current_turn_user_id !== user.uid) {
          throw new Error("It is not your turn!");
        }

        // 3. CRITICAL: Check if team is already taken (prevent race condition)
        // Query all picks for this week to verify team availability
        const picksRef = collection(db, 'picks');
        const picksQuery = query(picksRef, where('week_id', '==', freshWeek.id));
        const picksSnapshot = await transaction.get(picksQuery);

        const takenTeamIds = new Set<string>();
        picksSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.pick1_team_id) takenTeamIds.add(data.pick1_team_id);
          if (data.pick2_team_id) takenTeamIds.add(data.pick2_team_id);
        });

        if (takenTeamIds.has(teamId)) {
          throw new Error("This team has already been picked by another user!");
        }

        // 4. Determine Pick ID (Compound Key for Uniqueness or Auto-ID)
        // We'll search for existing pick for this user/week in memory first isn't enough for transaction safety
        // But since we are creating new picks usually, let's use a deterministic ID or just Add.
        // Master Plan says: "Create/Update picks doc".
        // Let's use deterministic ID: `weekID_userID` to prevent duplicates easily.
        const pickId = `${freshWeek.id}_${user.uid}`;
        const pickRef = doc(db, 'picks', pickId);
        const pickDoc = await transaction.get(pickRef);

        if (pickDoc.exists()) {
          // Updating existing pick (Round 2?)
          // Check if we are in Round 2
          if (freshWeek.draft_round === 2) {
            transaction.update(pickRef, {
              pick2_team_id: teamId
            });
          } else {
            // Should not happen in linear draft unless correcting?
            // Overwriting Round 1 pick if still active?
            transaction.update(pickRef, {
              pick1_team_id: teamId
            });
          }
        } else {
          // New Pick
          transaction.set(pickRef, {
            week_id: freshWeek.id,
            user_id: user.uid,
            pick1_team_id: freshWeek.draft_round === 1 ? teamId : null,
            pick2_team_id: freshWeek.draft_round === 2 ? teamId : null,
            submitted_at: new Date().toISOString()
          });
        }

        // 5. Handover Turn
        const updates = processTurnHandover(freshWeek, freshWeek.pick_order);
        transaction.update(weekRef, updates);
      });
    } catch (error: any) {
      console.error("Submission failed:", error);
      alert(`Failed to submit pick: ${error.message}`);
    }
  };

  const leaderboardData = members
    .filter(m => m.league_id === activeLeague?.id && m.status === 'approved')
    .map(m => {
      const u = allUsers.find(user => user.id === m.user_id);
      return {
        user_id: m.user_id,
        user_name: u?.display_name || 'Unknown',
        points: m.points,
        wins: m.wins,
        adjustment_points: m.adjustment_points || 0
      };
    });

  const activePlayersCount = leaderboardData.length;

  return (
    <div className="relative pb-24 md:pb-0 animate-in fade-in duration-700">
      {/* Mobile Sticky Header */}
      <div className="md:hidden sticky top-20 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-5 py-3 flex items-center justify-between shadow-sm">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">League Dashboard</span>
          <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none truncate max-w-[180px]">{activeLeague.name}</h2>
        </div>
        <div className="bg-emerald-900 px-3 py-2 rounded-xl text-white flex items-center gap-2 shadow-lg shadow-emerald-900/20">
          <PiggyBank className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-black">{formatCurrency(activeLeague.current_pot_pence)}</span>
        </div>
      </div>

      {/* Desktop Navigation Link */}
      <Link
        to="/leagues"
        className="hidden md:inline-flex items-center text-slate-400 hover:text-emerald-600 transition-all duration-300 mb-8 animate-in slide-in-from-left-4 fade-in duration-1000"
      >
        <ChevronLeft className="h-4 w-4 mr-1.5 transition-transform duration-300 group-hover:-translate-x-1" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Global Leagues</span>
      </Link>

      {/* Main Container */}
      <div className="space-y-6 md:space-y-10">
        {/* Desktop Header (Hidden on Mobile) */}
        <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 opacity-20"></div>

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

        {/* Desktop View: Grid Layout */}
        <div className="hidden md:grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            {!isOpen ? (
              <MarketClosed />
            ) : (displayWeek && (displayWeek.status === 'open' || !activeLeague?.enable_automatic_deadlines)) ? (
              <DraftRoom
                week={displayWeek}
                leagueMembers={members}
                users={allUsers as User[]}
                currentPicks={picks}
                currentUser={effectiveUserProfile}
                onPickSubmit={handlePickSubmit}
              />
            ) : (
              <MarketOpenNotStarted />
            )}
          </div>

          <div className="space-y-8">
            <Leaderboard data={leaderboardData} currentPicks={picks} teams={TEAMS} />
            <SyndicateRules />
          </div>
        </div>

        {/* Mobile View: Tabbed Layout */}
        <div className="md:hidden">
          {activeTab === 'draft' && (
            <div className="space-y-6">
              {!isOpen ? (
                <MarketClosed />
              ) : (displayWeek && (displayWeek.status === 'open' || !activeLeague?.enable_automatic_deadlines)) ? (
                <DraftRoom
                  week={displayWeek}
                  leagueMembers={members}
                  users={allUsers as User[]}
                  currentPicks={picks}
                  currentUser={effectiveUserProfile}
                  onPickSubmit={handlePickSubmit}
                />
              ) : (
                <MarketOpenNotStarted />
              )}
            </div>
          )}

          {activeTab === 'table' && (
            <div className="animate-in slide-in-from-right-4 fade-in duration-300">
              <Leaderboard data={leaderboardData} currentPicks={picks} teams={TEAMS} />
            </div>
          )}

          {activeTab === 'pot' && (
            <div className="animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 rounded-[2.5rem] p-8 text-white shadow-2xl border border-emerald-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
                <div className="flex items-center text-emerald-400 text-[10px] uppercase font-black tracking-[0.2em] mb-4">
                  <PiggyBank className="h-6 w-6 mr-3" />
                  Live Syndicate Vault
                </div>
                <div className="text-6xl font-black text-white tracking-tighter mb-2">{formatCurrency(activeLeague.current_pot_pence)}</div>
                <p className="text-emerald-300/80 text-sm font-medium mb-8">This pot is updated after every successful game week.</p>

                <div className="space-y-4 pt-6 border-t border-emerald-700/50">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Weekly Contribution</span>
                    <span className="font-bold">{formatCurrency(activeLeague.pot_deduction_pence)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active Players</span>
                    <span className="font-bold">{activePlayersCount}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="animate-in slide-in-from-right-4 fade-in duration-300">
              <SyndicateRules />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

// Helper Components for Cleaner Main Logic
const MarketClosed = () => (
  <div className="bg-slate-50 p-12 sm:p-20 rounded-[2.5rem] border border-slate-200 text-center shadow-inner">
    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
      <Moon className="h-10 w-10 text-slate-300" />
    </div>
    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Market Closed</h3>
    <p className="text-slate-500 mt-2 text-lg max-w-md mx-auto leading-relaxed">
      The pick window is closed for the weekend. <br />
      The market re-opens on <span className="text-emerald-600 font-bold">Sunday 11:00 PM (UK)</span>.
    </p>
    <div className="mt-8 inline-flex items-center justify-center bg-white px-6 py-3 rounded-xl border border-slate-200 shadow-sm text-xs font-black uppercase tracking-widest text-slate-400">
      Next Deadline: Friday 11:00 PM
    </div>
  </div>
);

const MarketOpenNotStarted = () => (
  <div className="bg-slate-50 p-12 sm:p-20 rounded-[2.5rem] border border-slate-200 text-center shadow-inner">
    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
      <AlertCircle className="h-10 w-10 text-amber-500" />
    </div>
    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Market Open</h3>
    <p className="text-slate-500 mt-2 text-lg max-w-md mx-auto leading-relaxed">
      The market is officially OPEN, but the admin hasn't initialized <span className="text-emerald-600 font-bold">Week 1</span> yet.
    </p>
    <p className="text-xs text-slate-400 mt-4">Picks will appear once the game week is started in the Admin Console.</p>
  </div>
);

const SyndicateRules = () => (
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
);