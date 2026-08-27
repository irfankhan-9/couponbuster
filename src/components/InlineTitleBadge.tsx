import React from 'react';
import type { EarnedTitle } from '../types';

interface InlineTitleBadgeProps {
  title: EarnedTitle | null | undefined;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  /** How many times the user has won this title (controls emoji repetition). */
  count?: number;
  /** Override the auto-applied temporary indicator. */
  showTemporary?: boolean;
}

// Default emoji map by rank_label. Admin-defined titles may override via custom_emoji.
const RANK_EMOJI: Record<string, string> = {
  '#1': '🏆',
  '#2': '🥈',
  '#3': '🥉',
  'Global': '👑'
};

function emojiForTitle(title: EarnedTitle): string {
  if (title.custom_emoji) return title.custom_emoji;
  return RANK_EMOJI[title.rank_label] ?? '🏆';
}

/**
 * Compact badge designed to live directly next to a username across the site.
 * Shows a small chip with rank + source. Tooltip with full description.
 * Emoji repeats when `count > 1` (e.g. Carl 🏆🏆 for two Plumbing League wins).
 * A ⏳ marker is added when the title is temporary (current-season auto).
 */
export const InlineTitleBadge: React.FC<InlineTitleBadgeProps> = ({
  title,
  size = 'xs',
  className = '',
  count = 1,
  showTemporary
}) => {
  if (!title) return null;

  const sizeClasses = {
    xs: {
      container: 'px-1.5 py-0.5 text-[9px]',
      icon: 'h-2.5 w-2.5',
      emojiText: 'text-[10px]'
    },
    sm: {
      container: 'px-2 py-0.5 text-[10px]',
      icon: 'h-3 w-3',
      emojiText: 'text-[11px]'
    },
    md: {
      container: 'px-2.5 py-1 text-xs',
      icon: 'h-3.5 w-3.5',
      emojiText: 'text-xs'
    }
  };

  // Match visual styling to the badge variant
  const palette: Record<string, { gradient: string; text: string; border: string; ring: string }> = {
    global_crown_champion: {
      gradient: 'bg-gradient-to-r from-yellow-400 to-amber-500',
      text: 'text-yellow-900',
      border: 'border-yellow-300',
      ring: 'ring-yellow-300'
    },
    crown_champion: {
      gradient: 'bg-gradient-to-r from-yellow-300 to-amber-400',
      text: 'text-yellow-900',
      border: 'border-yellow-300',
      ring: 'ring-yellow-300'
    },
    silver_sultan: {
      gradient: 'bg-gradient-to-r from-slate-200 to-slate-300',
      text: 'text-slate-800',
      border: 'border-slate-300',
      ring: 'ring-slate-300'
    },
    bronze_boss: {
      gradient: 'bg-gradient-to-r from-orange-300 to-orange-400',
      text: 'text-orange-900',
      border: 'border-orange-300',
      ring: 'ring-orange-300'
    }
  };

  const colors = palette[title.badge_variant] ?? palette.crown_champion;
  const sizes = sizeClasses[size];

  const emoji = emojiForTitle(title);
  const repeats = Math.max(count, 1);
  const emojiString = emoji.repeat(repeats);

  const isTemporary = showTemporary ?? title.is_temporary;
  const tooltip = isTemporary
    ? `${title.rank_label} in ${title.source_name} (Current Season — may be revoked)`
    : `${title.rank_label} in ${title.source_name}`;

  return (
    <span
      title={tooltip}
      aria-label={tooltip}
      className={`inline-flex items-center gap-0.5 ${sizes.container} ${colors.gradient} ${colors.text} border ${colors.border} rounded-full font-black uppercase tracking-tight whitespace-nowrap shadow-sm max-w-full ${className}`}
    >
      <span className={`${sizes.emojiText} leading-none flex-shrink-0 select-none`}
        aria-hidden="true"
      >
        {emojiString}
      </span>
      <span className="truncate">{title.rank_label}</span>
      {isTemporary && (
        <span
          className={`${sizes.emojiText} leading-none flex-shrink-0 select-none`}
          aria-label="Temporary — current season"
          title="Current season — will be revoked if dropped from top 3"
        >
          ⏳
        </span>
      )}
    </span>
  );
};
