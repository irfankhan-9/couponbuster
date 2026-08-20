import React from 'react';
import { RankTitle } from '../types';
import { Crown, Medal, Award } from 'lucide-react';

interface ChampionBadgeProps {
  title: RankTitle;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  userName?: string;
  animated?: boolean;
  className?: string;
}

export const ChampionBadge: React.FC<ChampionBadgeProps> = ({
  title,
  size = 'md',
  showName = false,
  userName,
  animated = true,
  className = ''
}) => {
  const sizeClasses = {
    sm: {
      container: 'px-2 py-1 text-[8px]',
      icon: 'h-3 w-3',
      gap: 'gap-1'
    },
    md: {
      container: 'px-3 py-1.5 text-[10px]',
      icon: 'h-3.5 w-3.5',
      gap: 'gap-1.5'
    },
    lg: {
      container: 'px-4 py-2 text-xs',
      icon: 'h-4 w-4',
      gap: 'gap-2'
    }
  };

  const titleConfig = {
    [RankTitle.GLOBAL_CROWN_CHAMPION]: {
      label: 'Global Crown Champion',
      icon: Crown,
      gradient: 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600',
      textColor: 'text-yellow-900',
      borderColor: 'border-yellow-300',
      shadowColor: 'shadow-yellow-500/30',
      glowClass: animated ? 'animate-pulse shadow-lg shadow-yellow-500/50' : '',
      prefix: '👑'
    },
    [RankTitle.CROWN_CHAMPION]: {
      label: 'Crown Champion',
      icon: Crown,
      gradient: 'bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600',
      textColor: 'text-yellow-900',
      borderColor: 'border-yellow-300',
      shadowColor: 'shadow-yellow-500/30',
      glowClass: animated ? 'animate-pulse shadow-lg shadow-yellow-500/50' : '',
      prefix: '👑'
    },
    [RankTitle.SILVER_SULTAN]: {
      label: 'Silver Sultan',
      icon: Medal,
      gradient: 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400',
      textColor: 'text-slate-800',
      borderColor: 'border-slate-300',
      shadowColor: 'shadow-slate-400/30',
      glowClass: '',
      prefix: '🏅'
    },
    [RankTitle.BRONZE_BOSS]: {
      label: 'Bronze Boss',
      icon: Award,
      gradient: 'bg-gradient-to-br from-orange-300 via-orange-400 to-orange-500',
      textColor: 'text-orange-900',
      borderColor: 'border-orange-300',
      shadowColor: 'shadow-orange-500/30',
      glowClass: '',
      prefix: '🥉'
    }
  };

  const config = titleConfig[title];
  const IconComponent = config.icon;
  const sizes = sizeClasses[size];

  return (
    <div className={`inline-flex items-center ${className}`}>
      <div
        className={`
          inline-flex items-center ${sizes.gap} ${sizes.container}
          ${config.gradient} ${config.textColor}
          border ${config.borderColor} rounded-full font-black uppercase tracking-wider
          shadow-md ${config.shadowColor} ${config.glowClass}
          transition-all duration-300 hover:scale-105
        `}
      >
        {size !== 'sm' && (
          <IconComponent className={`${sizes.icon} ${title === RankTitle.CROWN_CHAMPION ? 'fill-current' : ''}`} />
        )}
        {size === 'sm' && <span>{config.prefix}</span>}
        <span>{config.label}</span>
      </div>
      {showName && userName && (
        <span className="ml-2 text-sm font-bold text-slate-700">{userName}</span>
      )}
    </div>
  );
};

// Compact version for inline use
export const CompactBadge: React.FC<{ title: RankTitle }> = ({ title }) => {
  const config = {
    [RankTitle.GLOBAL_CROWN_CHAMPION]: { emoji: '👑', color: 'text-yellow-500 animate-pulse' },
    [RankTitle.CROWN_CHAMPION]: { emoji: '👑', color: 'text-yellow-500' },
    [RankTitle.SILVER_SULTAN]: { emoji: '🏅', color: 'text-slate-400' },
    [RankTitle.BRONZE_BOSS]: { emoji: '🥉', color: 'text-orange-500' }
  };

  const { emoji, color } = config[title];

  return (
    <span className={`${color} text-lg`}>
      {emoji}
    </span>
  );
};
