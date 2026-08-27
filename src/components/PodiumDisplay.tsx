import React from 'react';
import { RankTitle } from '../types';
import { Crown, Medal, Award, Trophy } from 'lucide-react';
import { UserNameWithTitle } from './UserNameWithTitle';

interface PodiumEntry {
  user_id: string;
  user_name: string;
  points: number;
  wins: number;
  rank: 1 | 2 | 3;
  league_name?: string;
}

interface PodiumDisplayProps {
  entries: PodiumEntry[];
  showLeague?: boolean;
}

export const PodiumDisplay: React.FC<PodiumDisplayProps> = ({ entries, showLeague = false }) => {
  // Sort to ensure correct order: 2, 1, 3 (podium style)
  const sortedEntries = [...entries].sort((a, b) => a.rank - b.rank);

  const getRankConfig = (rank: 1 | 2 | 3) => {
    const configs = {
      1: {
        title: 'Crown Champion',
        subtitle: '#1 Overall',
        icon: Crown,
        gradient: 'from-yellow-400 via-amber-500 to-yellow-600',
        bgGradient: 'bg-gradient-to-br from-yellow-50 to-amber-50',
        borderColor: 'border-yellow-300',
        textColor: 'text-yellow-900',
        height: 'h-64',
        order: 'order-2',
        trophy: true,
        emoji: '👑',
        pointsColor: 'text-amber-600',
        shimmer: true
      },
      2: {
        title: 'Silver Sultan',
        subtitle: '#2 Place',
        icon: Medal,
        gradient: 'from-slate-300 via-slate-400 to-slate-500',
        bgGradient: 'bg-gradient-to-br from-slate-50 to-slate-100',
        borderColor: 'border-slate-300',
        textColor: 'text-slate-800',
        height: 'h-48',
        order: 'order-1',
        trophy: false,
        emoji: '🏅',
        pointsColor: 'text-slate-600',
        shimmer: false
      },
      3: {
        title: 'Bronze Boss',
        subtitle: '#3 Place',
        icon: Award,
        gradient: 'from-orange-300 via-orange-400 to-orange-500',
        bgGradient: 'bg-gradient-to-br from-orange-50 to-orange-100',
        borderColor: 'border-orange-300',
        textColor: 'text-orange-900',
        height: 'h-36',
        order: 'order-3',
        trophy: false,
        emoji: '🥉',
        pointsColor: 'text-orange-600',
        shimmer: false
      }
    };
    return configs[rank];
  };

  const getEntryByRank = (rank: 1 | 2 | 3) => {
    return sortedEntries.find(e => e.rank === rank);
  };

  const first = getEntryByRank(1);
  const second = getEntryByRank(2);
  const third = getEntryByRank(3);

  if (!first && !second && !third) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Trophy className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-400 font-bold">No champions yet</p>
          <p className="text-slate-300 text-sm">Complete some leagues to see champions here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl shadow-lg shadow-yellow-500/30 mb-4">
          <Trophy className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
          League Champions
        </h2>
        <p className="text-slate-500 font-medium mt-1">
          The elite across all {entries.length || 'your'} leagues
        </p>
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-3 md:gap-6 px-4">
        {/* #2 - Silver Sultan */}
        {second ? (
          <div className={`flex flex-col items-center ${getRankConfig(2).order}`}>
            <div className="relative">
              {/* Avatar */}
              <div className={`
                w-20 h-20 md:w-24 md:h-24 rounded-full
                bg-gradient-to-br ${getRankConfig(2).gradient}
                flex items-center justify-center
                shadow-lg ${getRankConfig(2).borderColor}
                border-4
                transform hover:scale-105 transition-transform duration-300
              `}>
                <span className="text-3xl md:text-4xl font-black text-white">
                  {second.user_name.charAt(0).toUpperCase()}
                </span>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                  <span className="text-white text-sm font-black">2</span>
                </div>
              </div>
              {/* Shimmer effect for top */}
              {getRankConfig(2).shimmer && (
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
              )}
            </div>

            {/* Name & Badge */}
            <div className="mt-4 text-center">
              <p className="font-black text-slate-800 text-sm md:text-base truncate max-w-[120px] inline-flex items-center justify-center gap-1">
                <UserNameWithTitle
                  userId={second.user_id}
                  name={second.user_name}
                  nameClassName="font-black text-slate-800 text-sm md:text-base truncate"
                />
              </p>
              <div className={`
                inline-flex items-center gap-1 px-2 py-1 rounded-full
                bg-gradient-to-br ${getRankConfig(2).gradient}
                ${getRankConfig(2).textColor} text-[9px] font-black uppercase tracking-wider
                mt-2
              `}>
                <span>🏅</span>
                <span>{getRankConfig(2).title}</span>
              </div>
              {showLeague && second.league_name && (
                <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[100px]">
                  {second.league_name}
                </p>
              )}
            </div>

            {/* Points */}
            <div className="mt-2 px-4 py-2 rounded-xl bg-slate-100 border border-slate-200">
              <span className={`text-lg font-black ${getRankConfig(2).pointsColor}`}>
                {second.points}
              </span>
              <span className="text-[10px] text-slate-400 ml-1">PTS</span>
            </div>

            {/* Podium Base */}
            <div className={`
              w-24 md:w-32 ${getRankConfig(2).height} ${getRankConfig(2).bgGradient}
              rounded-t-2xl border-t-4 ${getRankConfig(2).borderColor}
              flex items-end justify-center pb-4
              border-x-2 ${getRankConfig(2).borderColor}
            `}>
              <span className="text-4xl md:text-5xl font-black text-slate-200/50">2</span>
            </div>
          </div>
        ) : (
          <div className="w-24 md:w-32 flex flex-col items-center">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-100 border-4 border-dashed border-slate-200 flex items-center justify-center">
              <Medal className="h-8 w-8 text-slate-300" />
            </div>
            <div className={`w-24 md:w-32 ${getRankConfig(2).height} bg-slate-50 rounded-t-2xl border-t-4 border-dashed border-slate-200 flex items-end justify-center pb-4 border-x-2 border-slate-200`}>
              <span className="text-4xl md:text-5xl font-black text-slate-200/50">2</span>
            </div>
          </div>
        )}

        {/* #1 - Crown Champion (Center, Taller) */}
        {first ? (
          <div className={`flex flex-col items-center -mt-4 ${getRankConfig(1).order}`}>
            {/* Crown Icon above avatar */}
            <div className="relative">
              <div className={`
                absolute -top-6 left-1/2 transform -translate-x-1/2
                w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500
                rounded-full flex items-center justify-center
                shadow-lg shadow-yellow-500/50 animate-bounce
                border-2 border-white
              `}>
                <Crown className="h-6 w-6 text-white fill-current" />
              </div>

              {/* Avatar */}
              <div className={`
                w-24 h-24 md:w-32 md:h-32 rounded-full
                bg-gradient-to-br ${getRankConfig(1).gradient}
                flex items-center justify-center
                shadow-xl ${getRankConfig(1).borderColor}
                border-4 ring-4 ring-yellow-200
                transform hover:scale-105 transition-transform duration-300
                mt-6
              `}>
                <span className="text-4xl md:text-5xl font-black text-white">
                  {first.user_name.charAt(0).toUpperCase()}
                </span>
                <div className="absolute -top-1 -right-1 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-pulse">
                  <span className="text-yellow-900 text-lg font-black">1</span>
                </div>
              </div>

              {/* Animated glow */}
              <div className="absolute inset-0 rounded-full bg-yellow-400/20 animate-ping" />
            </div>

            {/* Name & Badge */}
            <div className="mt-4 text-center">
              <p className="font-black text-slate-800 text-base md:text-lg inline-flex items-center justify-center gap-1.5">
                <UserNameWithTitle
                  userId={first.user_id}
                  name={first.user_name}
                  nameClassName="font-black text-slate-800 text-base md:text-lg"
                />
              </p>
              <div className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                bg-gradient-to-br ${getRankConfig(1).gradient}
                ${getRankConfig(1).textColor} text-[10px] font-black uppercase tracking-wider
                mt-2 shadow-lg shadow-yellow-500/30
              `}>
                <Crown className="h-3.5 w-3.5 fill-current" />
                <span>{getRankConfig(1).title}</span>
              </div>
              {showLeague && first.league_name && (
                <p className="text-xs text-slate-400 mt-1">
                  {first.league_name}
                </p>
              )}
            </div>

            {/* Points & Wins */}
            <div className="mt-2 px-5 py-3 rounded-xl bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 shadow-inner">
              <div className="flex items-center justify-center gap-2">
                <span className={`text-2xl font-black ${getRankConfig(1).pointsColor}`}>
                  {first.points}
                </span>
                <span className="text-[10px] text-amber-400 font-black uppercase">PTS</span>
              </div>
              {first.wins > 0 && (
                <div className="text-[10px] text-amber-400/80 font-bold mt-1">
                  {first.wins} WIN{first.wins !== 1 ? 'S' : ''}
                </div>
              )}
            </div>

            {/* Podium Base */}
            <div className={`
              w-28 md:w-40 ${getRankConfig(1).height} ${getRankConfig(1).bgGradient}
              rounded-t-2xl border-t-4 ${getRankConfig(1).borderColor}
              flex items-end justify-center pb-4
              border-x-2 ${getRankConfig(1).borderColor}
              shadow-xl
            `}>
              <span className="text-5xl md:text-6xl font-black text-yellow-200/50">1</span>
            </div>
          </div>
        ) : (
          <div className="w-28 md:w-40 flex flex-col items-center -mt-4">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-yellow-50 border-4 border-dashed border-yellow-200 flex items-center justify-center mt-6">
              <Crown className="h-10 w-10 text-yellow-300" />
            </div>
            <div className={`w-28 md:w-40 ${getRankConfig(1).height} bg-yellow-50/50 rounded-t-2xl border-t-4 border-dashed border-yellow-200 flex items-end justify-center pb-4 border-x-2 border-yellow-200`}>
              <span className="text-5xl md:text-6xl font-black text-yellow-200/50">1</span>
            </div>
          </div>
        )}

        {/* #3 - Bronze Boss */}
        {third ? (
          <div className={`flex flex-col items-center ${getRankConfig(3).order}`}>
            {/* Avatar */}
            <div className="relative">
              <div className={`
                w-20 h-20 md:w-24 md:h-24 rounded-full
                bg-gradient-to-br ${getRankConfig(3).gradient}
                flex items-center justify-center
                shadow-lg ${getRankConfig(3).borderColor}
                border-4
                transform hover:scale-105 transition-transform duration-300
              `}>
                <span className="text-3xl md:text-4xl font-black text-white">
                  {third.user_name.charAt(0).toUpperCase()}
                </span>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                  <span className="text-white text-sm font-black">3</span>
                </div>
              </div>
            </div>

            {/* Name & Badge */}
            <div className="mt-4 text-center">
              <p className="font-black text-slate-800 text-sm md:text-base truncate max-w-[120px] inline-flex items-center justify-center gap-1">
                <UserNameWithTitle
                  userId={third.user_id}
                  name={third.user_name}
                  nameClassName="font-black text-slate-800 text-sm md:text-base truncate"
                />
              </p>
              <div className={`
                inline-flex items-center gap-1 px-2 py-1 rounded-full
                bg-gradient-to-br ${getRankConfig(3).gradient}
                ${getRankConfig(3).textColor} text-[9px] font-black uppercase tracking-wider
                mt-2
              `}>
                <span>🥉</span>
                <span>{getRankConfig(3).title}</span>
              </div>
              {showLeague && third.league_name && (
                <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[100px]">
                  {third.league_name}
                </p>
              )}
            </div>

            {/* Points */}
            <div className="mt-2 px-4 py-2 rounded-xl bg-orange-50 border border-orange-100">
              <span className={`text-lg font-black ${getRankConfig(3).pointsColor}`}>
                {third.points}
              </span>
              <span className="text-[10px] text-orange-400 ml-1">PTS</span>
            </div>

            {/* Podium Base */}
            <div className={`
              w-24 md:w-32 ${getRankConfig(3).height} ${getRankConfig(3).bgGradient}
              rounded-t-2xl border-t-4 ${getRankConfig(3).borderColor}
              flex items-end justify-center pb-4
              border-x-2 ${getRankConfig(3).borderColor}
            `}>
              <span className="text-4xl md:text-5xl font-black text-orange-200/50">3</span>
            </div>
          </div>
        ) : (
          <div className="w-24 md:w-32 flex flex-col items-center">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-orange-50 border-4 border-dashed border-orange-200 flex items-center justify-center">
              <Award className="h-8 w-8 text-orange-300" />
            </div>
            <div className={`w-24 md:w-32 ${getRankConfig(3).height} bg-orange-50/50 rounded-t-2xl border-t-4 border-dashed border-orange-200 flex items-end justify-center pb-4 border-x-2 border-orange-200`}>
              <span className="text-4xl md:text-5xl font-black text-orange-200/50">3</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
