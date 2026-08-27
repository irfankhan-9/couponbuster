import React, { useMemo } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';
import { useUsers, useAllMembers } from '../hooks/useSyndicateData';
import {
  useEarnedTitles,
  useDisplayedTitle,
  useLegacyTitleMigration,
  getWinGroupTitles,
  MAX_PINNED_TITLES
} from '../hooks/useUserTitles';
import { TitleRackManager } from '../components/TitleRackManager';
import { ChampionBadge } from '../components/ChampionBadge';
import { User, RankTitle, EarnedTitle } from '../types';
import {
  User as UserIcon,
  Mail,
  Shield,
  Award,
  Crown,
  Edit3,
  ExternalLink,
  Trophy,
  ChevronRight,
  Sparkles,
  Star,
  Medal,
  Flame,
  History
} from 'lucide-react';

export const Profile: React.FC = () => {
  const params = useParams();
  const [currentUser] = useAuthState(auth);
  const { users, loading } = useUsers();
  const { members } = useAllMembers();

  const targetUserId = params.userId || currentUser?.uid || null;
  const isOwnProfile = !params.userId || params.userId === currentUser?.uid;

  const targetUser = useMemo<User | null>(() => {
    if (!targetUserId) return null;
    return users.find((u) => u.id === targetUserId) ?? null;
  }, [users, targetUserId]);

  const earnedTitles = useEarnedTitles(targetUserId);
  const displayedTitle = useDisplayedTitle(targetUserId);

  // Legacy migration
  useLegacyTitleMigration(targetUserId);

  // Aggregate stats for this user across leagues
  const userStats = useMemo(() => {
    if (!targetUserId) return null;
    const ownedMembers = members.filter(
      (m) => m.user_id === targetUserId && m.status === 'approved'
    );
    const totalPoints = ownedMembers.reduce(
      (sum, m) => sum + (m.points || 0) + (m.adjustment_points || 0),
      0
    );
    const totalWins = ownedMembers.reduce((sum, m) => sum + (m.wins || 0), 0);
    return {
      leagueCount: ownedMembers.length,
      totalPoints,
      totalWins
    };
  }, [members, targetUserId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center flex-col">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-600 mb-4"></div>
        <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">
          Loading profile…
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  if (!targetUserId) {
    return <Navigate to="/leagues" replace />;
  }

  if (!targetUser) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center p-12 bg-white rounded-[3rem] shadow-xl border border-slate-100">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <UserIcon className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">User Not Found</h2>
        <p className="text-slate-500 mb-6 font-medium">
          That profile doesn't exist or may have been removed.
        </p>
        <Link to="/leagues" className="inline-flex items-center text-emerald-600 font-black hover:underline">
          Back to Leagues
        </Link>
      </div>
    );
  }

  const pinnedIds = Array.isArray(targetUser.pinned_title_ids) ? targetUser.pinned_title_ids : [];
  const hasDisplayed = Boolean(displayedTitle);
  const firstName = (targetUser.display_name || '').split(' ')[0] || 'there';

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      {/* HERO HEADER */}
      <ProfileHero
        targetUser={targetUser}
        displayedTitle={displayedTitle}
        earnedTitles={earnedTitles}
        isOwnProfile={isOwnProfile}
        hasDisplayed={hasDisplayed}
        stats={userStats}
        firstName={firstName}
      />

      {/* STATS STRIP */}
      <StatsStrip
        earnedTitles={earnedTitles}
        pinnedCount={pinnedIds.length}
        stats={userStats}
        hasDisplayedTitle={hasDisplayed}
      />

      {/* TITLES SECTION */}
      <div className="space-y-6">
        {/* Headline */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-1">
              {isOwnProfile ? 'Your Collection' : `${firstName}'s Collection`}
            </p>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Titles Showcase
            </h2>
          </div>
          {!isOwnProfile && displayedTitle && (
            <Link
              to="/profile"
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 hidden md:inline-flex items-center gap-1"
            >
              View My Profile
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {/* Manager or Read-Only Preview */}
        {isOwnProfile ? (
          <TitleRackManager
            userId={targetUser.id}
            earnedTitles={earnedTitles}
            displayedTitleId={targetUser.displayed_title_id ?? null}
            pinnedIds={pinnedIds}
            isOwnProfile
          />
        ) : (
          <ReadOnlyPreview
            earnedTitles={earnedTitles}
            pinnedIds={pinnedIds}
            displayedTitle={displayedTitle}
            ownerUser={targetUser}
          />
        )}
      </div>
    </div>
  );
};

/* ---------------------------- HERO HEADER ---------------------------- */

const ProfileHero: React.FC<{
  targetUser: User;
  displayedTitle: EarnedTitle | null;
  earnedTitles: EarnedTitle[];
  isOwnProfile: boolean;
  hasDisplayed: boolean;
  stats: { leagueCount: number; totalPoints: number; totalWins: number } | null;
  firstName: string;
}> = ({ targetUser, displayedTitle, earnedTitles, isOwnProfile, hasDisplayed, firstName }) => {
  const roleLabel =
    targetUser.role === 'global-admin' ? 'Global Admin'
      : targetUser.role === 'league-admin' ? 'League Admin'
      : 'Syndicate Member';

  const isAdmin = targetUser.role === 'global-admin' || targetUser.role === 'league-admin';

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 rounded-[2.5rem] shadow-2xl border border-emerald-800/50 p-6 md:p-10 lg:p-12 text-white">
      {/* Decorative glows */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-yellow-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.05),transparent_50%)] pointer-events-none" />

      <div className="relative z-10">
        {/* Top row: avatar + name + roles + edit */}
        <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-8">
          {/* Avatar */}
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <div className="relative">
              <div className="h-24 w-24 md:h-32 md:w-32 rounded-3xl bg-gradient-to-br from-white/20 to-white/5 border-2 border-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
                <span className="text-4xl md:text-5xl font-black text-white tracking-tight">
                  {(targetUser.display_name || '?').slice(0, 1).toUpperCase()}
                </span>
              </div>
              {isAdmin && (
                <div className="absolute -bottom-2 -right-2 h-9 w-9 bg-yellow-400 rounded-xl flex items-center justify-center border-2 border-white shadow-md">
                  <Shield className="h-4 w-4 text-emerald-900" fill="currentColor" />
                </div>
              )}
              {/* Title corner badge */}
              {displayedTitle && (
                <div className="absolute -top-2 -left-2 h-9 w-9 md:h-10 md:w-10 bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 rounded-2xl flex items-center justify-center border-2 border-white shadow-md text-base md:text-lg">
                  {displayedTitle.custom_emoji ?? (displayedTitle.rank_label === '#1' ? '🏆' : displayedTitle.rank_label === '#2' ? '🥈' : '🥉')}
                </div>
              )}
            </div>
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0 text-center md:text-left">
            {/* Role chips */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                <Shield className="h-3 w-3" />
                {roleLabel}
              </span>
              {displayedTitle && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-400/20 backdrop-blur-sm rounded-full text-[10px] font-black uppercase tracking-widest border border-yellow-300/30 text-yellow-200">
                  <Crown className="h-3 w-3 fill-current" />
                  Showing {displayedTitle.rank_label}
                </span>
              )}
            </div>

            {/* Display name (large) */}
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] mb-2 break-words">
              {targetUser.display_name}
            </h1>

            {/* Email (subtle) */}
            <div className="flex items-center justify-center md:justify-start gap-1.5 text-emerald-200 mb-4">
              <Mail className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="text-xs font-bold truncate max-w-full">
                {targetUser.email}
              </span>
            </div>

            {/* Displayed title big card */}
            {displayedTitle ? (
              <div className="inline-flex items-center gap-2 md:gap-3 px-4 py-2.5 md:px-5 md:py-3 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl shadow-lg">
                <Crown className="h-5 w-5 text-yellow-400 fill-current flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm md:text-base font-black tracking-tight leading-tight">
                    {displayedTitle.rank_label} in {displayedTitle.source_name}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200/80">
                    {displayedTitle.is_temporary ? 'Current Season' : 'Permanent Title'}
                  </p>
                </div>
                {displayedTitle.is_temporary && (
                  <span className="text-base ml-1" title="Current season — may be revoked">⏳</span>
                )}
              </div>
            ) : (
              isOwnProfile && earnedTitles.length > 0 && (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/5 backdrop-blur-sm border border-white/10 border-dashed rounded-2xl text-emerald-200">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-bold">No title displayed — pick one below</span>
                </div>
              )
            )}
          </div>

          {/* Edit CTA */}
          {isOwnProfile && (
            <Link
              to="/profile"
              className="md:self-start inline-flex items-center gap-2 px-5 py-3 bg-white text-emerald-900 hover:bg-emerald-50 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl hover:shadow-2xl hover:scale-105 self-center md:self-start"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit Showcase
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------------------------- STATS STRIP ---------------------------- */

const StatsStrip: React.FC<{
  earnedTitles: EarnedTitle[];
  pinnedCount: number;
  stats: { leagueCount: number; totalPoints: number; totalWins: number } | null;
  hasDisplayedTitle: boolean;
}> = ({ earnedTitles, pinnedCount, stats, hasDisplayedTitle }) => {
  const firstCount = earnedTitles.filter((t) => t.rank_label === '#1').length;
  const totalTitles = earnedTitles.length;

  const items = [
    {
      label: 'Total Titles',
      value: totalTitles,
      sub: 'earned',
      icon: Trophy,
      gradient: 'from-emerald-500 to-emerald-700',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-700'
    },
    {
      label: 'Crown Wins',
      value: firstCount,
      sub: '#1 finishes',
      icon: Crown,
      gradient: 'from-yellow-400 to-amber-500',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-700'
    },
    {
      label: 'On Display',
      value: `${pinnedCount}/${MAX_PINNED_TITLES}`,
      sub: 'pinned',
      icon: Star,
      gradient: 'from-indigo-500 to-indigo-700',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-700'
    },
    {
      label: 'Syndicates',
      value: stats?.leagueCount ?? 0,
      sub: 'active',
      icon: Flame,
      gradient: 'from-rose-500 to-rose-700',
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-700'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {items.map(({ label, value, sub, icon: Icon, gradient, iconBg, iconColor }) => (
        <div
          key={label}
          className="relative overflow-hidden bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 p-4 md:p-5 hover:shadow-md transition-shadow"
        >
          <div className={`absolute -top-8 -right-8 w-20 h-20 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-xl pointer-events-none`} />
          <div className="relative">
            <div className={`flex items-center justify-center h-9 w-9 md:h-10 md:w-10 rounded-xl ${iconBg} mb-3`}>
              <Icon className={`h-4 w-4 md:h-5 md:w-5 ${iconColor}`} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              {label}
            </p>
            <p className="text-2xl md:text-3xl font-black text-slate-900 leading-none">
              {value}
            </p>
            <p className="text-[10px] font-bold text-slate-400 mt-1">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ---------------------------- READ-ONLY PREVIEW ---------------------------- */

const ReadOnlyPreview: React.FC<{
  earnedTitles: EarnedTitle[];
  pinnedIds: string[];
  displayedTitle: ReturnType<typeof useDisplayedTitle>;
  ownerUser: User | undefined;
}> = ({ earnedTitles, pinnedIds, displayedTitle, ownerUser }) => {
  const pinnedTitles = pinnedIds
    .map((id) => earnedTitles.find((t) => t.id === id))
    .filter((t): t is EarnedTitle => Boolean(t));

  // Group pinned titles by source_id so we can show 🏆🏆 stacks for repeated wins.
  const groupedPinned = useMemo(() => {
    const map = new Map<string, EarnedTitle[]>();
    pinnedTitles.forEach((t) => {
      const arr = map.get(t.source_id) ?? [];
      arr.push(t);
      map.set(t.source_id, arr);
    });
    return Array.from(map.entries()).map(([sourceId, group]) => ({
      sourceId,
      group,
      representative: group[0],
      count: group.length
    }));
  }, [pinnedTitles]);

  if (earnedTitles.length === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-[2rem] p-10 md:p-12 text-center border border-slate-200">
        <div className="inline-flex h-16 w-16 items-center justify-center bg-white rounded-2xl shadow-sm mb-4">
          <Trophy className="h-8 w-8 text-slate-300" />
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2">No titles yet</h3>
        <p className="text-slate-500 text-sm font-medium max-w-xs mx-auto">
          This player hasn't earned any titles yet. Titles appear automatically when climbing to the top of a syndicate.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* FEATURED SHOWCASE (pinned) */}
      {groupedPinned.length > 0 && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6 md:p-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-1">
                Featured
              </p>
              <h3 className="text-lg md:text-xl font-black text-slate-900">Public Showcase</h3>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <Star className="h-3 w-3 fill-current" />
              {pinnedTitles.length} / {MAX_PINNED_TITLES}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 md:gap-4">
            {groupedPinned.map(({ sourceId, representative, count }) => (
              <TitleCard
                key={sourceId}
                title={representative}
                count={count}
                size="md"
                variant="showcase"
              />
            ))}
          </div>
        </div>
      )}

      {/* FULL COLLECTION */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-1">
              Archive
            </p>
            <h3 className="text-lg md:text-xl font-black text-slate-900">
              Full Collection
              <span className="ml-2 text-slate-400 font-bold text-sm">
                ({earnedTitles.length})
              </span>
            </h3>
          </div>
          <History className="h-5 w-5 text-slate-300" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {earnedTitles.map((title) => {
            const winCount = getWinGroupTitles(ownerUser, title).length;
            return (
              <TitleCard
                key={title.id}
                title={title}
                count={winCount}
                size="sm"
                variant="collection"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ---------------------------- TITLE CARD ---------------------------- */

const variantPalette: Record<string, { gradient: string; text: string; bg: string; border: string }> = {
  global_crown_champion: {
    gradient: 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600',
    text: 'text-yellow-900',
    bg: 'bg-gradient-to-br from-yellow-50 to-amber-50',
    border: 'border-yellow-200'
  },
  crown_champion: {
    gradient: 'bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600',
    text: 'text-yellow-900',
    bg: 'bg-gradient-to-br from-yellow-50 to-amber-50',
    border: 'border-yellow-200'
  },
  silver_sultan: {
    gradient: 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400',
    text: 'text-slate-800',
    bg: 'bg-gradient-to-br from-slate-50 to-slate-100',
    border: 'border-slate-200'
  },
  bronze_boss: {
    gradient: 'bg-gradient-to-br from-orange-300 via-orange-400 to-orange-500',
    text: 'text-orange-900',
    bg: 'bg-gradient-to-br from-orange-50 to-amber-50',
    border: 'border-orange-200'
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

const TitleCard: React.FC<{
  title: EarnedTitle;
  count: number;
  size: 'sm' | 'md';
  variant: 'showcase' | 'collection';
}> = ({ title, count, size, variant }) => {
  const palette = variantPalette[title.badge_variant] ?? variantPalette.crown_champion;
  const emoji = emojiForTitle(title);
  const emojiString = emoji.repeat(Math.max(count, 1));
  const isShowcase = variant === 'showcase';

  const containerBase = isShowcase
    ? 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'
    : `${palette.bg} border-transparent hover:border-slate-200`;

  const avatarSize = size === 'md' ? 'h-14 w-14' : 'h-12 w-12';
  const emojiText = size === 'md' ? 'text-xl' : 'text-base';
  const titleText = size === 'md' ? 'text-base' : 'text-sm';

  return (
    <div
      className={`relative group rounded-2xl border p-4 md:p-5 transition-all duration-300 ${containerBase}`}
    >
      {/* ⏳ marker for current-season */}
      {title.is_temporary && (
        <span
          className="absolute top-2 right-2 text-base"
          title="Current season — may be revoked"
        >
          ⏳
        </span>
      )}

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className={`${avatarSize} rounded-2xl ${palette.gradient} ${palette.text} flex items-center justify-center shadow-md`}>
            <span className={`${emojiText} leading-none select-none font-black`} aria-hidden="true">
              {emojiString}
            </span>
          </div>
          {count > 1 && (
            <span className="absolute -bottom-1 -right-1 min-w-[1.25rem] h-5 px-1 bg-indigo-600 text-white rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white shadow-sm">
              x{count}
            </span>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`${titleText} font-black text-slate-900`}>{title.rank_label}</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">in</span>
            {title.is_temporary && (
              <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                Season
              </span>
            )}
          </div>
          <p className={`${titleText} font-black text-slate-800 truncate`}>
            {title.source_name}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">
            Earned {new Date(title.earned_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;