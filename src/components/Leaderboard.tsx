import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { LeaderboardEntry, Pick, Team, RankTitle } from '../types';
import { ShieldCheck, Star, Crown, Medal, Award } from 'lucide-react';
import { ChampionBadge, CompactBadge } from './ChampionBadge';
import { UserNameWithTitle } from './UserNameWithTitle';

interface LeaderboardProps {
  data: LeaderboardEntry[];
  currentPicks?: Pick[];
  teams?: Team[];
  showBadges?: boolean;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ data, currentPicks = [], teams = [], showBadges = true }) => {
  const sortedData = [...data].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aAdjustment = a.adjustment_points ?? 0;
    const bAdjustment = b.adjustment_points ?? 0;
    return bAdjustment - aAdjustment;
  });

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-700">
      <div className="p-8 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900">Leaderboard</h3>
            <p className="text-sm text-slate-500 font-medium">Season Standings & Picks</p>
          </div>
          {showBadges && sortedData.length >= 1 && (
            <div className="flex items-center gap-2">
              <span className="text-yellow-500"><Crown className="h-5 w-5 fill-current" /></span>
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Live Rankings</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart Section */}
      <div className="h-48 w-full bg-slate-50/50 p-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sortedData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="user_name" type="category" width={80} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              contentStyle={{
                borderRadius: '16px',
                border: 'none',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                fontWeight: 900,
                fontSize: '12px'
              }}
            />
            <Bar dataKey="points" radius={[0, 8, 8, 0]} barSize={16}>
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#cbd5e1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* List Section */}
      <div className="divide-y divide-slate-100">
        {sortedData.map((entry, index) => {
          const userPick = currentPicks.find(p => p.user_id === entry.user_id);

          const bankerTeam = teams.find(t => t.id === userPick?.pick1_team_id);
          const coverTeam = teams.find(t => t.id === userPick?.pick2_team_id);

          // Determine title for this position
          const positionTitle = index === 0 ? RankTitle.CROWN_CHAMPION :
                               index === 1 ? RankTitle.SILVER_SULTAN :
                               index === 2 ? RankTitle.BRONZE_BOSS : null;

          return (
            <div key={entry.user_id} className={`p-6 transition-all duration-300 hover:bg-slate-50 ${index === 0 ? 'bg-gradient-to-r from-yellow-50/50 to-transparent' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {/* Rank Badge with special styling for top 3 */}
                  <div className={`relative flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black transition-all duration-300 ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-yellow-900 shadow-lg shadow-yellow-500/30 ring-2 ring-yellow-200' :
                    index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900 shadow-md' :
                    index === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-orange-900 shadow-md' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {index === 0 ? (
                      <Crown className="h-4 w-4 fill-current" />
                    ) : index === 1 ? (
                      <Medal className="h-4 w-4" />
                    ) : index === 2 ? (
                      <Award className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <UserNameWithTitle
                      userId={entry.user_id}
                      name={entry.user_name}
                      nameClassName="font-black text-slate-900 tracking-tight leading-none"
                    />
                    {/* Title badge for top 3 */}
                    {positionTitle && showBadges && (
                      <div className="mt-1.5">
                        <ChampionBadge title={positionTitle} size="sm" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-baseline space-x-1.5">
                  <div className="flex items-baseline space-x-0.5">
                    <span className={`text-xl font-black ${
                      index === 0 ? 'text-yellow-600' :
                      index === 1 ? 'text-slate-600' :
                      index === 2 ? 'text-orange-600' : 'text-emerald-600'
                    }`}>{entry.points}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">pts</span>
                  </div>
                  {entry.adjustment_points !== 0 && (
                    <div className="flex items-baseline space-x-0.5 bg-slate-100 px-1.5 py-0.5 rounded-md">
                      <span className="text-[10px] font-black text-slate-500">{entry.adjustment_points! > 0 ? '+' : ''}{entry.adjustment_points}</span>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">( A )</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Picks Display */}
              <div className="flex flex-wrap gap-2">
                {bankerTeam ? (
                  <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-100 shadow-sm animate-in zoom-in-95 duration-300">
                    <Star className="h-3 w-3 mr-1.5 fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-wider">{bankerTeam.name}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-50 text-slate-300 border border-slate-100 italic">
                    <span className="text-[10px] font-bold uppercase tracking-wider">No Banker</span>
                  </div>
                )}

                {coverTeam ? (
                  <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm animate-in zoom-in-95 duration-300">
                    <ShieldCheck className="h-3 w-3 mr-1.5" />
                    <span className="text-[10px] font-black uppercase tracking-wider">{coverTeam.name}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-50 text-slate-300 border border-slate-100 italic">
                    <span className="text-[10px] font-bold uppercase tracking-wider">No Cover</span>
                  </div>
                )}
              </div>

              {/* Position indicator for top 3 */}
              {index === 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-yellow-300 to-transparent" />
                  <span className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">Current Leader</span>
                  <div className="h-px flex-1 bg-gradient-to-l from-yellow-300 to-transparent" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
