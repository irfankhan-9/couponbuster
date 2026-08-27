import React, { useState, useMemo } from 'react';
import { Star, Crown, Medal, Award, Check, AlertCircle, Trophy } from 'lucide-react';
import type { EarnedTitle } from '../types';
import {
  MAX_PINNED_TITLES,
  updateDisplayedTitle,
  updatePinnedTitles,
  getWinGroupTitles
} from '../hooks/useUserTitles';
import { useUsers } from '../hooks/useSyndicateData';
import type { User } from '../types';

interface TitleRackManagerProps {
  userId: string;
  earnedTitles: EarnedTitle[];
  displayedTitleId: string | null;
  pinnedIds: string[];
  isOwnProfile: boolean;
}

const variantPalette: Record<string, { gradient: string; text: string; Icon: any }> = {
  global_crown_champion: {
    gradient: 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600',
    text: 'text-yellow-900',
    Icon: Crown
  },
  crown_champion: {
    gradient: 'bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600',
    text: 'text-yellow-900',
    Icon: Crown
  },
  silver_sultan: {
    gradient: 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400',
    text: 'text-slate-800',
    Icon: Medal
  },
  bronze_boss: {
    gradient: 'bg-gradient-to-br from-orange-300 via-orange-400 to-orange-500',
    text: 'text-orange-900',
    Icon: Award
  }
};

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

export const TitleRackManager: React.FC<TitleRackManagerProps> = ({
  userId,
  earnedTitles,
  displayedTitleId,
  pinnedIds,
  isOwnProfile
}) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { users } = useUsers();
  const currentUser = useMemo<User | undefined>(
    () => users.find((u) => u.id === userId),
    [users, userId]
  );

  // Local working copy of pinned titles so toggles feel instant
  const [localPinned, setLocalPinned] = useState<string[]>(pinnedIds);
  React.useEffect(() => {
    setLocalPinned(pinnedIds);
  }, [pinnedIds.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const pinnedTitles = localPinned
    .map((id) => earnedTitles.find((t) => t.id === id))
    .filter((t): t is EarnedTitle => Boolean(t));

  const handleTogglePin = async (title: EarnedTitle) => {
    if (!isOwnProfile) return;
    setError(null);
    const already = localPinned.includes(title.id);
    let next: string[];
    if (already) {
      next = localPinned.filter((id) => id !== title.id);
      // If we removed the currently displayed title, drop the displayed_title_id
      if (title.id === displayedTitleId) {
        try {
          setSaving(true);
          await updateDisplayedTitle(userId, null);
        } catch (e: any) {
          setError(e?.message || 'Failed to clear displayed title');
          setSaving(false);
          return;
        }
      }
    } else {
      if (localPinned.length >= MAX_PINNED_TITLES) {
        setError(`You can showcase at most ${MAX_PINNED_TITLES} titles on your profile.`);
        return;
      }
      next = [...localPinned, title.id];
    }

    setLocalPinned(next);
    try {
      setSaving(true);
      await updatePinnedTitles(userId, next);
    } catch (e: any) {
      setError(e?.message || 'Failed to update pinned titles');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDisplayed = async (title: EarnedTitle | null) => {
    if (!isOwnProfile) return;
    setError(null);
    // If selecting a title that isn't pinned, auto-pin it (up to the cap)
    if (title && !localPinned.includes(title.id)) {
      if (localPinned.length >= MAX_PINNED_TITLES) {
        setError(`Pin the title first — showcase cap is ${MAX_PINNED_TITLES}.`);
        return;
      }
      const next = [...localPinned, title.id];
      setLocalPinned(next);
      try {
        setSaving(true);
        await updatePinnedTitles(userId, next);
      } catch (e: any) {
        setError(e?.message || 'Failed to pin title');
        setSaving(false);
        return;
      }
    }
    try {
      setSaving(true);
      await updateDisplayedTitle(userId, title?.id ?? null);
    } catch (e: any) {
      setError(e?.message || 'Failed to update displayed title');
    } finally {
      setSaving(false);
    }
  };

  if (earnedTitles.length === 0) {
    return (
      <div className="bg-slate-50 rounded-[2rem] p-10 text-center border border-slate-100">
        <Trophy className="h-14 w-14 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-black text-slate-700 mb-2">No Titles Yet</h3>
        <p className="text-slate-500 text-sm font-medium max-w-xs mx-auto">
          Earn titles by climbing to #1, #2, or #3 in any syndicate, or by winning
          the Global Crown Championship.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-sm font-bold">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* The "Rack" — actively displayed + 4 more showcase slots */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[2rem] p-6 md:p-8 shadow-xl border border-slate-700 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-yellow-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">My Showcase Rack</p>
              <h3 className="text-xl font-black text-white">Pick Your Display</h3>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full text-white text-xs font-black">
              <Star className="h-3.5 w-3.5 text-yellow-400 fill-current" />
              <span>{localPinned.length} / {MAX_PINNED_TITLES}</span>
            </div>
          </div>

          {/* 5 slot rack: one active, the rest pinned showcase */}
          <div className="grid grid-cols-5 gap-2 md:gap-3">
            {Array.from({ length: MAX_PINNED_TITLES }).map((_, slotIdx) => {
              const title = pinnedTitles[slotIdx];
              const isActiveSlot = slotIdx === 0; // first slot is the "currently displayed"
              const displayed = isActiveSlot && title && title.id === displayedTitleId;
              const palette = title ? variantPalette[title.badge_variant] : null;
              const Icon = palette?.Icon;
              const winCount = title ? getWinGroupTitles(currentUser, title).length : 1;
              const emoji = title ? emojiForTitle(title) : '';
              return (
                <button
                  key={`slot-${slotIdx}`}
                  type="button"
                  disabled={!isOwnProfile || !title}
                  onClick={() => {
                    if (!title) return;
                    handleSetDisplayed(isActiveSlot ? title : null);
                  }}
                  className={`group relative h-20 md:h-28 rounded-2xl flex flex-col items-center justify-center p-2 transition-all duration-300 border ${
                    !title
                      ? 'bg-white/5 border-dashed border-white/15 text-white/40 cursor-default'
                      : displayed
                        ? `${palette?.gradient ?? ''} ${palette?.text ?? ''} border-yellow-200 shadow-lg shadow-yellow-500/40 scale-[1.03]`
                        : `bg-white/10 border-white/20 text-white hover:bg-white/20 ${isOwnProfile ? 'cursor-pointer' : 'cursor-default'}`
                  }`}
                  title={title ? `Click to display — ${title.source_name}` : `Empty slot ${slotIdx + 1}`}
                >
                  {title ? (
                    <>
                      <span className="text-base md:text-lg leading-none mb-0.5 select-none" aria-hidden="true">
                        {emoji.repeat(Math.max(winCount, 1))}
                      </span>
                      {Icon && <Icon className="h-4 w-4 md:h-5 md:w-5 fill-current" />}
                      <span className="text-[10px] md:text-[11px] font-black uppercase tracking-tight leading-tight text-center line-clamp-2">
                        {title.rank_label}
                      </span>
                      <span className="text-[8px] md:text-[9px] font-bold opacity-70 leading-tight text-center line-clamp-1 mt-0.5">
                        {title.source_name}
                      </span>
                      {title.is_temporary && (
                        <span className="absolute top-1 right-1 text-[10px] leading-none" title="Current season — may be revoked">
                          ⏳
                        </span>
                      )}
                      {winCount > 1 && (
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full bg-white/30 text-[9px] font-black leading-none">
                          x{winCount}
                        </span>
                      )}
                      {displayed && (
                        <span className="absolute -top-2 -right-2 h-5 w-5 bg-emerald-400 rounded-full flex items-center justify-center shadow-md">
                          <Check className="h-3 w-3 text-emerald-900" strokeWidth={4} />
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-2xl md:text-3xl font-black opacity-30">+</span>
                  )}
                  <span className="absolute top-1 left-2 text-[9px] font-black opacity-50">
                    {slotIdx + 1}
                  </span>
                </button>
              );
            })}
          </div>
          {isOwnProfile && (
            <p className="mt-4 text-[11px] text-white/50 font-medium text-center">
              Slot 1 is what other users see next to your name everywhere. Choose any pinned title.
            </p>
          )}
        </div>
      </div>

      {/* Full collection grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">My Title Collection</h3>
            <p className="text-xs text-slate-500 font-medium">Pin up to {MAX_PINNED_TITLES} to showcase on your profile.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {earnedTitles.map((title) => {
            const pinned = localPinned.includes(title.id);
            const palette = variantPalette[title.badge_variant];
            const Icon = palette.Icon;
            const isActive = title.id === displayedTitleId;
            const winCount = getWinGroupTitles(currentUser, title).length;
            const emoji = emojiForTitle(title);
            return (
              <button
                key={title.id}
                type="button"
                disabled={!isOwnProfile}
                onClick={() => handleTogglePin(title)}
                className={`group relative text-left p-4 rounded-2xl border transition-all ${
                  pinned
                    ? 'bg-white border-yellow-200 shadow-md ring-2 ring-yellow-100'
                    : 'bg-slate-50 border-slate-100 hover:border-emerald-100'
                } ${isOwnProfile ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`relative flex-shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center ${palette.gradient} ${palette.text}`}>
                    <Icon className="h-5 w-5 fill-current" />
                    {title.is_temporary && (
                      <span
                        className="absolute -top-1 -right-1 text-xs leading-none"
                        title="Current season — may be revoked"
                      >
                        ⏳
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base leading-none select-none" aria-hidden="true">
                        {emoji.repeat(Math.max(winCount, 1))}
                      </span>
                      <span className="text-xs font-black text-slate-900">{title.rank_label}</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">in</span>
                    </div>
                    <p className="text-sm font-black text-slate-700 truncate">{title.source_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-slate-400 font-medium">
                        Earned {new Date(title.earned_at).toLocaleDateString()}
                      </p>
                      {title.is_temporary && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                          ⏳ Current Season
                        </span>
                      )}
                      {winCount > 1 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                          x{winCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isActive && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black">
                        <Check className="h-2.5 w-2.5" strokeWidth={4} />
                        DISPLAY
                      </span>
                    )}
                    {isOwnProfile && (
                      <span className={`inline-flex items-center justify-center h-7 w-7 rounded-full border-2 transition-colors ${
                        pinned
                          ? 'bg-yellow-400 border-yellow-400 text-yellow-900'
                          : 'bg-white border-slate-200 text-slate-300 group-hover:border-yellow-300'
                      }`}>
                        <Star className={`h-3.5 w-3.5 ${pinned ? 'fill-current' : ''}`} />
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {saving && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2 rounded-full shadow-xl text-xs font-black uppercase tracking-widest animate-in slide-in-from-bottom-4">
          Saving…
        </div>
      )}
    </div>
  );
};
