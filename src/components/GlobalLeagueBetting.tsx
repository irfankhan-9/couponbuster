import React, { useState } from 'react';
import { Crown, Trophy, Users, TrendingUp, Globe, ChevronRight, Loader2, CheckCircle } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { useGlobalLeague, useGlobalLeagueEntries, useGlobalLeagueRequests } from '../hooks/useSyndicateData';
import { ChampionBadge } from './ChampionBadge';
import { UserNameWithTitle } from './UserNameWithTitle';
import { RankTitle } from '../types';
import { Link, useNavigate } from 'react-router-dom';

export const GlobalLeagueBetting: React.FC = () => {
  const [currentUser] = useAuthState(auth);
  const navigate = useNavigate();
  const { globalLeague, loading: leagueLoading } = useGlobalLeague();
  const { entries, loading: entriesLoading } = useGlobalLeagueEntries();
  const { requests } = useGlobalLeagueRequests();
  const [isJoining, setIsJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const userEntry = entries.find(e => e.user_id === currentUser?.uid);
  const hasPendingRequest = requests.some(r => r.user_id === currentUser?.uid && r.status === 'pending');
  const currentChampion = entries.find(e => e.is_global_crown_champion);
  const userRank = userEntry ? entries.findIndex(e => e.user_id === currentUser?.uid) + 1 : null;

  const formatPence = (pence: number) => `£${(pence / 100).toFixed(2)}`;
  const entryFee = globalLeague?.entry_stake_pence || 500;
  const isActive = globalLeague?.is_active ?? true;

  const handleJoin = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (userEntry) return;

    setIsJoining(true);
    setJoinError(null);

    try {
      // Get user display name
      const userDoc = await getDocs(query(
        collection(db, 'users'),
        where('__name__', '==', currentUser.uid)
      ));
      const displayName = userDoc.docs[0]?.data().display_name || currentUser.email?.split('@')[0] || 'Unknown';

      // Create join REQUEST (not entry - admin approves)
      await addDoc(collection(db, 'global_league_requests'), {
        user_id: currentUser.uid,
        display_name: displayName,
        requested_at: new Date().toISOString(),
        status: 'pending'
      });

      setJoinSuccess(true);
      setTimeout(() => setJoinSuccess(false), 5000);
    } catch (error) {
      console.error('Error submitting request:', error);
      setJoinError('Failed to submit request. Please try again.');
      setTimeout(() => setJoinError(null), 4000);
    }

    setIsJoining(false);
  };

  if (leagueLoading || entriesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Loading Global League...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-yellow-900 rounded-[2rem] p-8 md:p-12 text-white">
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 opacity-20">
          <Crown className="h-64 w-64 text-yellow-400 fill-current" />
        </div>
        <div className="absolute bottom-0 left-0 -translate-y-1/2 -translate-x-1/4 opacity-10">
          <Trophy className="h-48 w-48 text-white fill-current" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="relative">
              <Crown className="h-14 w-14 text-yellow-400 fill-current animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">Global Crown Championship</h1>
              <p className="text-emerald-200 text-lg font-medium mt-1">Compete across ALL leagues for ultimate glory</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <Trophy className="h-6 w-6 text-yellow-400" />
                <span className="text-emerald-200 text-xs font-black uppercase tracking-widest">Entry Fee</span>
              </div>
              <p className="text-3xl font-black">{formatPence(entryFee)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <Users className="h-6 w-6 text-blue-400" />
                <span className="text-emerald-200 text-xs font-black uppercase tracking-widest">Participants</span>
              </div>
              <p className="text-3xl font-black">{entries.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="h-6 w-6 text-emerald-400" />
                <span className="text-emerald-200 text-xs font-black uppercase tracking-widest">Your Points</span>
              </div>
              <p className="text-3xl font-black">{userEntry?.total_points || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Champion */}
      {currentChampion && (
        <div className="bg-gradient-to-r from-yellow-900/50 to-amber-900/50 rounded-2xl p-6 border border-yellow-500/30">
          <p className="text-yellow-400 text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
            <Crown className="h-4 w-4 fill-current" />
            Current Global Crown Champion
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <ChampionBadge title={RankTitle.GLOBAL_CROWN_CHAMPION} size="lg" animated />
            <Link
              to={`/profile/${currentChampion.user_id}`}
              className="text-2xl font-black text-white hover:underline decoration-yellow-400/60 underline-offset-4"
            >
              {currentChampion.display_name}
            </Link>
            <span className="text-emerald-400 font-bold text-lg">{currentChampion.total_points} pts</span>
            <Link
              to="/global-league/leaderboard"
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-yellow-900 rounded-xl font-black text-sm transition-colors"
            >
              View Standings
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Top 3 Podium */}
      {entries.length > 0 && (
        <div className="bg-white rounded-[2rem] shadow-lg border border-slate-200 p-6 md:p-8">
          <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Top Performers
          </h2>
          <div className="grid grid-cols-3 gap-3 md:gap-6">
            {[1, 0, 2].map((index) => {
              const entry = entries[index];
              if (!entry) return null;
              const heights = ['h-28 md:h-36', 'h-36 md:h-44', 'h-24 md:h-32'];
              const positions = ['order-2', 'order-1', 'order-3'];
              const bgColors = ['from-yellow-500', 'from-slate-300', 'from-orange-600'];
              const medals = ['🥇', '🥈', '🥉'];

              return (
                <div key={entry.id} className={`flex flex-col items-center ${positions[index]}`}>
                  <div className="text-4xl md:text-5xl mb-3">{medals[index]}</div>
                  <div className={`w-full bg-gradient-to-t ${bgColors[index]} to-transparent rounded-t-2xl p-4 text-center`}>
                    <Link
                      to={`/profile/${entry.user_id}`}
                      className="block font-black text-white text-sm md:text-base truncate hover:underline decoration-yellow-300/70 underline-offset-2"
                    >
                      {entry.display_name}
                    </Link>
                    <p className="text-white/90 font-bold text-lg md:text-xl">{entry.total_points}</p>
                    <p className="text-white/60 text-xs">pts</p>
                    {entry.is_global_crown_champion && (
                      <div className="mt-2">
                        <ChampionBadge title={RankTitle.GLOBAL_CROWN_CHAMPION} size="sm" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Join/Status Section */}
      {!userEntry ? (
        <div className="bg-white rounded-[2rem] shadow-lg border border-slate-200 p-6 md:p-8 text-center">
          <Globe className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-900 mb-2">Join the Global Championship</h2>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Compete against the best players across all leagues. Your points from every league count towards your global ranking.
          </p>
          
          {joinError && (
            <div className="mb-4 px-4 py-3 bg-red-100 text-red-700 rounded-xl font-bold text-sm">
              {joinError}
            </div>
          )}
          
          {joinSuccess && (
            <div className="mb-4 px-4 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Request submitted! Waiting for admin approval.
            </div>
          )}

          {!isActive ? (
            <div className="px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl inline-flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Entries Currently Closed
            </div>
          ) : hasPendingRequest ? (
            <div className="px-6 py-4 bg-amber-100 text-amber-700 font-bold rounded-xl inline-flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Request Pending - Waiting for Admin Approval
            </div>
          ) : (
            <button
              onClick={handleJoin}
              disabled={isJoining}
              className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 text-white font-black py-4 px-8 rounded-2xl transition-all transform hover:scale-105 shadow-xl shadow-emerald-500/30"
            >
              {isJoining ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Crown className="h-5 w-5" />
                  Join Global League - {formatPence(entryFee)}
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 rounded-2xl p-6 border border-emerald-700">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-1">Your Status</p>
              <p className="text-white font-black text-xl">Participating in Global League</p>
              {userRank && (
                <p className="text-emerald-300 font-bold mt-1">
                  Global Rank: <span className="text-yellow-400">#{userRank}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-emerald-300 text-xs font-black uppercase">Total Points</p>
                <p className="text-3xl font-black text-white">{userEntry.total_points}</p>
              </div>
              <Link
                to="/global-league/leaderboard"
                className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-white transition-colors"
              >
                <Trophy className="h-4 w-4" />
                Full Standings
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {entries.length === 0 && !userEntry && (
        <div className="bg-slate-50 rounded-[2rem] p-12 text-center border border-slate-200">
          <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-black text-slate-700 mb-2">No Participants Yet</h3>
          <p className="text-slate-500">Be the first to join the Global Crown Championship!</p>
        </div>
      )}
    </div>
  );
};
