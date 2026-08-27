import React from 'react';
import { Crown, Medal, Award, Trophy } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';
import { useGlobalLeagueEntries } from '../hooks/useSyndicateData';
import { ChampionBadge } from './ChampionBadge';
import { UserNameWithTitle } from './UserNameWithTitle';
import { RankTitle } from '../types';

export const GlobalLeagueLeaderboard: React.FC = () => {
  const [currentUser] = useAuthState(auth);
  const { entries, loading } = useGlobalLeagueEntries();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Loading Standings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 rounded-2xl shadow-lg shadow-yellow-500/30 mb-4">
          <Crown className="h-8 w-8 text-white fill-current" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
          Global Crown Championship
        </h1>
        <p className="text-slate-500 mt-2 font-medium">
          {entries.length} participants competing for ultimate glory
        </p>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-[2rem] shadow-lg overflow-hidden border border-slate-200">
        {/* Table Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-5">
          <h2 className="text-lg font-black text-white flex items-center gap-3">
            <Trophy className="h-6 w-6 text-yellow-400" />
            Standings
          </h2>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Rank</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Player</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-widest">Points</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-widest">Wins</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry, index) => {
                const rank = index + 1;
                const isCurrentUser = entry.user_id === currentUser?.uid;
                const isChampion = entry.is_global_crown_champion;

                return (
                  <tr
                    key={entry.id}
                    className={`
                      transition-colors
                      ${isCurrentUser ? 'bg-emerald-50' : ''}
                      ${rank === 1 && !isCurrentUser ? 'bg-yellow-50/50' : ''}
                      hover:bg-slate-50
                      ${isChampion ? 'border-l-4 border-l-yellow-500' : ''}
                    `}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {/* Rank Badge */}
                        <div className={`
                          flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black
                          ${rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-yellow-500/30' : ''}
                          ${rank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' : ''}
                          ${rank === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' : ''}
                          ${rank > 3 ? 'bg-slate-100 text-slate-600' : ''}
                        `}>
                          {rank <= 3 ? (
                            rank === 1 ? <Crown className="h-5 w-5 fill-current" /> :
                            rank === 2 ? <Medal className="h-5 w-5" /> :
                            <Award className="h-5 w-5" />
                          ) : (
                            `#${rank}`
                          )}
                        </div>

                        {/* Champion Badge */}
                        {isChampion && (
                          <ChampionBadge title={RankTitle.GLOBAL_CROWN_CHAMPION} size="sm" />
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className={`
                          w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg
                          ${rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : ''}
                          ${rank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-400' : ''}
                          ${rank === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-500' : ''}
                          ${rank > 3 ? 'bg-gradient-to-br from-emerald-100 to-emerald-200' : ''}
                          text-white
                        `}>
                          {entry.display_name.charAt(0).toUpperCase()}
                        </div>

                        <span className={`
                          font-bold inline-flex items-center gap-1.5 max-w-full
                          ${isCurrentUser ? 'text-emerald-700' : 'text-slate-800'}
                        `}>
                          <UserNameWithTitle
                            userId={entry.user_id}
                            name={entry.display_name}
                            nameClassName={`font-bold ${isCurrentUser ? 'text-emerald-700' : 'text-slate-800'}`}
                          />
                          {isCurrentUser && (
                            <span className="text-xs font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">You</span>
                          )}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <span className={`
                        font-black text-lg
                        ${rank === 1 ? 'text-amber-600' : 'text-slate-800'}
                      `}>
                        {entry.total_points}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-slate-600">
                        {entry.wins}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {entries.length === 0 && (
          <div className="text-center py-16 px-6">
            <Trophy className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-700 mb-2">No Participants Yet</h3>
            <p className="text-slate-500">Join the Global Crown Championship to compete!</p>
          </div>
        )}
      </div>
    </div>
  );
};
