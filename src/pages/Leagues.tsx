import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useLeagues, useAllMembers, useUsers } from '../hooks/useSyndicateData';
import { JoinLeagueModal } from '../components/JoinLeagueModal';
import { ChampionBadge } from '../components/ChampionBadge';
import { RankTitle } from '../types';
import { Users, Lock, Globe, ShieldCheck, ChevronRight, AlertCircle, Crown } from 'lucide-react';
import { formatCurrency } from '../utils/scoring';
import { UserNameWithTitle } from '../components/UserNameWithTitle';

export const Leagues: React.FC = () => {
  const [user, authLoading] = useAuthState(auth);
  const { leagues, loading: leaguesLoading } = useLeagues();
  const { members, loading: membersLoading } = useAllMembers();
  const { users, loading: usersLoading } = useUsers();

  const [selectedLeague, setSelectedLeague] = useState<{ id: string, name: string } | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const isLoading = authLoading || leaguesLoading || membersLoading || usersLoading;

  // Calculate champions for each league
  const leagueChampions = useMemo(() => {
    const champions: Record<string, { user_id: string; user_name: string; points: number }> = {};

    leagues.forEach((league) => {
      const leagueMembers = members
        .filter(m => m.league_id === league.id && m.status === 'approved')
        .map(m => {
          const u = users.find(u => u.id === m.user_id);
          return {
            user_id: m.user_id,
            user_name: u?.display_name || 'Unknown',
            points: m.points,
            adjustment_points: m.adjustment_points || 0
          };
        })
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return b.adjustment_points - a.adjustment_points;
        });

      if (leagueMembers.length > 0) {
        champions[league.id] = leagueMembers[0];
      }
    });

    return champions;
  }, [leagues, members, users]);

  const handleJoinClick = (league: { id: string, name: string }) => {
    setSelectedLeague(league);
  };

  const handleJoinSubmit = async () => {
    if (!selectedLeague || !user) return;
    try {
      setJoinError(null);
      setIsJoining(true);
            await addDoc(collection(db, 'members'), {
                league_id: selectedLeague.id,
                user_id: user.uid,
                status: 'pending',
                is_admin: false,
                joined_at: new Date().toISOString(),
                points: 0,
                wins: 0,
                adjustment_points: 0
            });

            // Auto-create/refresh the user profile so they have a record
            await setDoc(doc(db, 'users', user.uid), {
                display_name: user.displayName || user.email?.split('@')[0] || 'Member',
                email: user.email || '',
                role: 'member',
                rank_title: null,
                total_winnings_pence: 0,
                earned_titles: [],
                displayed_title_id: null,
                pinned_title_ids: [],
                created_at: new Date().toISOString()
            }, { merge: true });
      setJoinSuccess('Join request sent');
      setSelectedLeague(null);
    } catch (e: any) {
      console.error("Error joining league", e);
      setJoinError(e?.message || 'Failed to join');
    }
    finally {
      setIsJoining(false);
      setTimeout(() => setJoinSuccess(null), 2500);
    }
  };

  const isMember = (leagueId: string) => {
    // Only check if user is logged in
    if (!user) return undefined;
    return members.find(m => m.league_id === leagueId && m.user_id === user.uid);
  };

  const getApprovedMemberCount = (leagueId: string) => {
    return members.filter(m => m.league_id === leagueId && m.status === 'approved').length;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {joinSuccess && (
        <div className="max-w-3xl mx-auto bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl px-4 py-3 text-sm font-bold text-center">
          {joinSuccess}
        </div>
      )}
      {joinError && (
        <div className="max-w-3xl mx-auto bg-red-50 border border-red-100 text-red-600 rounded-2xl px-4 py-3 text-sm font-bold text-center">
          {joinError}
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Syndicates</h1>
          <p className="text-slate-500 mt-2 text-lg font-medium">Browse active competitions and request access to join.</p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Strict Membership Active</span>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {leagues.map((league) => {
          const membership = isMember(league.id);
          const approvedCount = getApprovedMemberCount(league.id);
          const isFull = approvedCount >= league.max_players;
          const champion = leagueChampions[league.id];

          return (
            <div key={league.id} className="group bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 flex flex-col justify-between hover:shadow-xl hover:border-emerald-100 transition-all duration-300 relative overflow-hidden">
              {/* Subtle background branding */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-emerald-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:border-emerald-100 transition-colors">
                    {league.privacy === 'public' ? <Globe className="h-6 w-6 text-slate-400 group-hover:text-emerald-600 transition-colors" /> : <Lock className="h-6 w-6 text-slate-400 group-hover:text-emerald-600 transition-colors" />}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border shadow-sm ${isFull ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                      {isFull ? 'League Full' : league.privacy}
                    </span>
                    {/* Champion Indicator */}
                    {champion && (
                      <Link
                        to={`/profile/${champion.user_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-full border border-yellow-100 hover:border-yellow-200 transition-colors"
                      >
                        <Crown className="h-3 w-3 text-yellow-500 fill-current" />
                        <span className="text-[9px] font-black text-yellow-700 uppercase tracking-wider">{champion.user_name}</span>
                      </Link>
                    )}
                  </div>
                </div>

                <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">{league.name}</h3>

                <div className="space-y-4 mb-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-slate-400">
                      <Users className="h-4 w-4 mr-2" />
                      <span className="text-xs font-bold uppercase tracking-wide">Capacity</span>
                    </div>
                    <span className={`text-sm font-black ${isFull ? 'text-red-600' : 'text-slate-900'}`}>{approvedCount} / {league.max_players}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-slate-400">
                      <div className="w-4 h-4 mr-2 flex items-center justify-center font-bold text-[10px]">£</div>
                      <span className="text-xs font-bold uppercase tracking-wide">Entry Fee</span>
                    </div>
                    <span className="text-sm font-black text-emerald-600">{formatCurrency(league.weekly_fee_pence)}<span className="text-[10px] text-slate-400 ml-1">/WK</span></span>
                  </div>
                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Saved Pot</span>
                    <span className="text-xs font-black text-slate-400">{formatCurrency(league.current_pot_pence)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-auto relative z-10">
                {membership ? (
                  membership.status === 'approved' ? (
                    <Link to={`/league/${league.id}`} className="w-full inline-flex items-center justify-center px-6 py-4 border-2 border-emerald-600 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white font-black text-sm transition-all duration-300 transform active:scale-95 group/btn">
                      Go to Dashboard
                      <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                  ) : membership.status === 'pending' ? (
                    <div className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-amber-50 border-2 border-amber-100 text-amber-700 rounded-2xl font-black text-sm cursor-not-allowed">
                      <Lock className="h-4 w-4" />
                      <span>Approval Pending</span>
                    </div>
                  ) : (
                    <div className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-red-50 border-2 border-red-100 text-red-700 rounded-2xl font-black text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>Request Rejected</span>
                    </div>
                  )
                ) : (
                  <button
                    onClick={() => handleJoinClick(league)}
                    disabled={isFull}
                    className={`w-full text-center px-6 py-4 rounded-2xl font-black text-sm transition-all duration-300 transform active:scale-95 shadow-lg ${isFull ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' : 'bg-slate-900 text-white hover:bg-emerald-600 shadow-slate-200 hover:shadow-emerald-200'}`}
                  >
                    {isFull ? 'Syndicate Full' : 'Join Syndicate'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <JoinLeagueModal
        isOpen={!!selectedLeague}
        leagueName={selectedLeague?.name || ''}
        onClose={() => setSelectedLeague(null)}
        onSubmit={handleJoinSubmit}
        loading={isJoining}
      />
    </div>
  );
};