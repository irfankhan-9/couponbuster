import React, { useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Link } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { useLeagues, useAllMembers, useUsers } from '../hooks/useSyndicateData';
import { PodiumDisplay } from './PodiumDisplay';
import { ChampionBadge, CompactBadge } from './ChampionBadge';
import { RankTitle, GlobalLeaderboardEntry } from '../types';
import { Trophy, ChevronRight, Users, Star, Crown } from 'lucide-react';

export const GlobalLeaderboard: React.FC = () => {
  const [user] = useAuthState(auth);
  const { leagues, loading: leaguesLoading } = useLeagues();
  const { members, loading: membersLoading } = useAllMembers();
  const { users, loading: usersLoading } = useUsers();

  const isLoading = leaguesLoading || membersLoading || usersLoading;

  // Calculate champions from all leagues
  const { podiumEntries, leagueChampions, totalChampionships } = useMemo(() => {
    if (!leagues.length || !members.length || !users.length) {
      return { podiumEntries: [], leagueChampions: [], totalChampionships: 0 };
    }

    const championMap: Map<string, GlobalLeaderboardEntry> = new Map();
    const allPodium: any[] = [];

    // For each league, find the top 3
    leagues.forEach((league) => {
      const leagueMembers = members
        .filter(m => m.league_id === league.id && m.status === 'approved')
        .map(m => ({
          user_id: m.user_id,
          user_name: users.find(user => user.id === m.user_id)?.display_name || 'Unknown',
          points: m.points ?? 0,
          wins: m.wins ?? 0,
          adjustment_points: m.adjustment_points ?? 0,
          is_owner: m.user_id === league.owner_id
        }))
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.adjustment_points !== a.adjustment_points) return b.adjustment_points - a.adjustment_points;
          // Tiebreaker: owner shown first when all zero
          if (a.is_owner !== b.is_owner) return a.is_owner ? -1 : 1;
          return 0;
        });

      // Champion = #1 in the league
      if (leagueMembers.length > 0) {
        const champion = leagueMembers[0];
        championMap.set(league.id, {
          league_id: league.id,
          league_name: league.name,
          user_id: champion.user_id,
          user_name: champion.user_name,
          rank: 1,
          points: champion.points,
          wins: champion.wins,
          rank_title: RankTitle.CROWN_CHAMPION
        });

        allPodium.push({
          user_id: champion.user_id,
          user_name: champion.user_name,
          points: champion.points,
          wins: champion.wins,
          rank: 1,
          league_name: league.name
        });
      }
    });

    // Aggregate by user to find top 3 overall
    const userStats: Map<string, { user_name: string; totalPoints: number; totalWins: number; leagues: string[] }> = new Map();

    championMap.forEach((entry) => {
      const existing = userStats.get(entry.user_id) || {
        user_name: entry.user_name,
        totalPoints: 0,
        totalWins: 0,
        leagues: []
      };
      existing.totalPoints += entry.points;
      existing.totalWins += entry.wins;
      existing.leagues.push(entry.league_name);
      userStats.set(entry.user_id, existing);
    });

    // Sort by total points to get top 3
    const top3 = Array.from(userStats.entries())
      .sort((a, b) => b[1].totalPoints - a[1].totalPoints)
      .slice(0, 3)
      .map(([user_id, stats], index) => ({
        user_id,
        user_name: stats.user_name,
        points: stats.totalPoints,
        wins: stats.totalWins,
        rank: (index + 1) as 1 | 2 | 3,
        leagues: stats.leagues
      }));

    return {
      podiumEntries: top3,
      leagueChampions: Array.from(championMap.values()).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.league_name.localeCompare(b.league_name);
      }),
      totalChampionships: championMap.size
    };
  }, [leagues, members, users]);

  // Get current user's rank info
  const currentUserChampionships = useMemo(() => {
    if (!user) return [];
    return leagueChampions.filter(c => c.user_id === user.uid);
  }, [leagueChampions, user]);

  // Get user's title
  const userTitle = useMemo(() => {
    if (!user) return null;
    const podiumEntry = podiumEntries.find(p => p.user_id === user.uid);
    if (podiumEntry) {
      if (podiumEntry.rank === 1) return RankTitle.CROWN_CHAMPION;
      if (podiumEntry.rank === 2) return RankTitle.SILVER_SULTAN;
      if (podiumEntry.rank === 3) return RankTitle.BRONZE_BOSS;
    }
    return null;
  }, [podiumEntries, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-600 mb-4"></div>
        <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Loading Champions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 rounded-2xl shadow-lg shadow-yellow-500/30 mb-4 animate-bounce">
          <Trophy className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
          Global Leaderboard
        </h1>
        <p className="text-slate-500 mt-2 font-medium">
          The elite champions across all {leagues.length} leagues
        </p>
        {/* Link to Global Crown Championship */}
        <Link
          to="/global-league"
          className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-yellow-900 rounded-xl font-black text-sm transition-all shadow-lg shadow-yellow-500/30 hover:scale-105"
        >
          <Crown className="h-4 w-4 fill-current" />
          View Global Crown Championship
        </Link>
      </div>

      {/* Current User's Status */}
      {user && (
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 rounded-[2rem] p-6 text-white shadow-xl border border-emerald-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">Your Championship Status</p>
              <p className="text-xl font-black">
                {currentUserChampionships.length > 0 ? (
                  <>
                    League Champion in{' '}
                    <span className="text-yellow-400">{currentUserChampionships.length}</span>
                    {currentUserChampionships.length === 1 ? ' league' : ' leagues'}
                  </>
                ) : (
                  'No championships yet'
                )}
              </p>
              {userTitle && (
                <div className="mt-3">
                  <ChampionBadge title={userTitle} size="lg" animated />
                </div>
              )}
            </div>
            {currentUserChampionships.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {currentUserChampionships.map((c) => (
                  <Link
                    key={c.league_id}
                    to={`/league/${c.league_id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors backdrop-blur-sm"
                  >
                    <Crown className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-bold">{c.league_name}</span>
                    <ChevronRight className="h-4 w-4 text-emerald-300" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Podium Display */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 md:p-12">
        <PodiumDisplay entries={podiumEntries} showLeague />
      </div>

      {/* League Champions Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-slate-900">League Champions</h2>
            <p className="text-slate-500 text-sm font-medium">Current #1 in each league</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
            <Trophy className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-black text-slate-700">{totalChampionships} Active</span>
          </div>
        </div>

        {leagueChampions.length === 0 ? (
          <div className="bg-slate-50 rounded-[2rem] p-12 text-center border border-slate-100">
            <Trophy className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-bold">No champions yet</p>
            <p className="text-slate-400 text-sm">Join a league to start competing</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leagueChampions.map((champion, index) => (
              <Link
                key={champion.league_id}
                to={`/league/${champion.league_id}`}
                className="group bg-white rounded-3xl shadow-sm border border-slate-200 p-6 hover:shadow-xl hover:border-emerald-100 transition-all duration-300 relative overflow-hidden animate-in fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Background decoration */}
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-yellow-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10">
                  {/* League Name & Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          League Champion
                        </span>
                        <Crown className="h-3 w-3 text-yellow-500 fill-current" />
                      </div>
                      <h3 className="font-black text-slate-900 text-lg leading-tight">
                        {champion.league_name}
                      </h3>
                    </div>
                    <ChampionBadge title={RankTitle.CROWN_CHAMPION} size="sm" />
                  </div>

                  {/* Champion Info */}
                  <div className="flex items-center gap-4 mt-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center shadow-md shadow-yellow-500/30">
                      <span className="text-xl font-black text-white">
                        {champion.user_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 truncate">
                        {champion.user_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg font-black text-amber-600">{champion.points}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase">pts</span>
                        {champion.wins > 0 && (
                          <>
                            <span className="text-slate-200">•</span>
                            <span className="text-sm font-bold text-emerald-600">{champion.wins}W</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center justify-end mt-4 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-black uppercase tracking-widest flex items-center gap-1">
                      View League
                      <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* All Champions by User */}
      {leagueChampions.length > 0 && (
        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-200 p-5 md:p-8">
          <div className="flex items-center justify-between mb-5 md:mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Top Performers</h2>
              <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">
                #1 from every league, ranked by total points
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
              <Star className="h-3.5 w-3.5 text-emerald-500 fill-current" />
              <span className="text-xs font-black text-slate-700">{leagueChampions.length} Champions</span>
            </div>
          </div>

          <div className="space-y-3">
            {leagueChampions.map((champion, index) => (
              <Link
                key={`${champion.league_id}-${champion.user_id}`}
                to={`/league/${champion.league_id}`}
                className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors group"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {/* Rank pill */}
                <div className={`
                  flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center font-black text-base md:text-lg
                  ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-yellow-500/30' : ''}
                  ${index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' : ''}
                  ${index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' : ''}
                  ${index > 2 ? 'bg-white border border-slate-200 text-slate-500' : ''}
                `}>
                  {index + 1}
                </div>

                {/* Avatar */}
                <div className={`
                  flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center
                  ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : ''}
                  ${index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400' : ''}
                  ${index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500' : ''}
                  ${index > 2 ? 'bg-gradient-to-br from-emerald-100 to-emerald-200' : ''}
                `}>
                  <span className={`text-lg md:text-xl font-black ${index > 2 ? 'text-emerald-700' : 'text-white'}`}>
                    {champion.user_name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-slate-900 truncate text-sm md:text-base">
                      {champion.user_name}
                    </span>
                    {index === 0 && <Crown className="h-3.5 w-3.5 text-yellow-500 fill-current animate-pulse flex-shrink-0" />}
                  </div>
                  {/* League tag */}
                  <div className="flex items-center gap-1.5 mt-0.5 md:mt-1 min-w-0">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 md:px-2 md:py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] md:text-xs font-bold truncate max-w-full">
                      <Trophy className="h-2.5 w-2.5 md:h-3 md:w-3 flex-shrink-0" />
                      <span className="truncate">{champion.league_name}</span>
                    </span>
                  </div>
                </div>

                {/* Points + Badge */}
                <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                  {index < 3 && (
                    <div className="hidden md:block">
                      <ChampionBadge
                        title={
                          index === 0 ? RankTitle.CROWN_CHAMPION :
                          index === 1 ? RankTitle.SILVER_SULTAN :
                          RankTitle.BRONZE_BOSS
                        }
                        size="sm"
                      />
                    </div>
                  )}
                  <div className="text-right">
                    <div className={`text-lg md:text-2xl font-black leading-none ${index === 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {champion.points}
                    </div>
                    <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5 md:mt-1">
                      Pts{champion.wins > 0 ? ` · ${champion.wins}W` : ''}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
