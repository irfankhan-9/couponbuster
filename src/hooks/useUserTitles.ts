import { useMemo, useEffect } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useUsers } from './useSyndicateData';
import type { AdminTitle, EarnedTitle, RankTitle, User } from '../types';

export const MAX_PINNED_TITLES = 5;

/**
 * Returns the full catalogue of titles earned by a given user.
 */
export function useEarnedTitles(userId: string | undefined | null): EarnedTitle[] {
  const { users } = useUsers();
  return useMemo(() => {
    if (!userId) return [];
    const u = users.find((x) => x.id === userId) as User | undefined;
    return Array.isArray(u?.earned_titles) ? u!.earned_titles! : [];
  }, [users, userId]);
}

/**
 * Returns the single title object that the user has chosen to display beside their
 * name across the site. Falls back to null when not configured or no longer owned.
 */
export function useDisplayedTitle(userId: string | undefined | null): EarnedTitle | null {
  const { users } = useUsers();
  return useMemo(() => {
    if (!userId) return null;
    const u = users.find((x) => x.id === userId) as User | undefined;
    const allTitles = Array.isArray(u?.earned_titles) ? u!.earned_titles! : [];
    const displayedId = u?.displayed_title_id ?? null;
    if (!displayedId) return null;
    return allTitles.find((t) => t.id === displayedId) ?? null;
  }, [users, userId]);
}

/**
 * Pinned titles (max 5) — these are the titles shown on the user's public profile.
 */
export function usePinnedTitles(userId: string | undefined | null): EarnedTitle[] {
  const { users } = useUsers();
  return useMemo(() => {
    if (!userId) return [];
    const u = users.find((x) => x.id === userId) as User | undefined;
    const allTitles = Array.isArray(u?.earned_titles) ? u!.earned_titles! : [];
    const pinnedIds = Array.isArray(u?.pinned_title_ids) ? u!.pinned_title_ids! : [];
    return pinnedIds
      .map((id) => allTitles.find((t) => t.id === id))
      .filter((t): t is EarnedTitle => Boolean(t));
  }, [users, userId]);
}

/**
 * Replace which title is shown next to the user name everywhere. Pass null to clear.
 */
export async function updateDisplayedTitle(userId: string, titleId: string | null): Promise<void> {
  await setDoc(
    doc(db, 'users', userId),
    { displayed_title_id: titleId },
    { merge: true }
  );
}

/**
 * Replace the entire pinned-titles set. Enforces the 5-title cap client-side.
 */
export async function updatePinnedTitles(userId: string, titleIds: string[]): Promise<void> {
  const trimmed = Array.from(new Set(titleIds)).slice(0, MAX_PINNED_TITLES);
  await setDoc(
    doc(db, 'users', userId),
    { pinned_title_ids: trimmed },
    { merge: true }
  );
}

/**
 * Returns admin-defined title templates (e.g. "Plumbing League Champion").
 * Used by the admin panel for the grant-to-user form.
 */
export function useAdminTitleDefs(): { titles: AdminTitle[]; loading: boolean; error: any } {
  const [snapshot, loading, error] = useCollection(collection(db, 'admin_titles'));
  const titles = useMemo(
    () => (snapshot?.docs.map((d) => ({ id: d.id, ...d.data() } as AdminTitle)) ?? []),
    [snapshot]
  );
  return { titles, loading, error };
}

/**
 * Counts how many times the user has won a title from the same source_id.
 * Used by the inline badge to render multiple emoji (e.g. 🏆🏆).
 *
 * For source_id === 'global' or per-league IDs, this counts all entries
 * in the user's earned_titles array with that source_id.
 */
export function useWinCount(userId: string | undefined | null, sourceId: string | undefined | null): number {
  const { users } = useUsers();
  return useMemo(() => {
    if (!userId || !sourceId) return 1;
    const u = users.find((x) => x.id === userId) as User | undefined;
    const titles: EarnedTitle[] = Array.isArray(u?.earned_titles) ? u!.earned_titles! : [];
    const matches = titles.filter((t) => t.source_id === sourceId);
    return Math.max(matches.length, 1);
  }, [users, userId, sourceId]);
}

/**
 * Helper: returns the win count for a specific EarnedTitle synchronously given
 * the full user (avoids hook call in render). Useful when callers already have
 * the user object in scope.
 */
export function countWinsForUser(user: User | undefined, sourceId: string | undefined): number {
  if (!user || !sourceId) return 1;
  const titles: EarnedTitle[] = Array.isArray(user.earned_titles) ? user.earned_titles : [];
  const matches = titles.filter((t) => t.source_id === sourceId);
  return Math.max(matches.length, 1);
}

/**
 * Returns a stable list of EarnedTitle entries for the user that share the same
 * source_id as the given title. Used for the "won X times" indicator in the
 * collection/profile.
 */
export function getWinGroupTitles(user: User | undefined, title: EarnedTitle): EarnedTitle[] {
  if (!user || !title) return [title];
  const titles: EarnedTitle[] = Array.isArray(user.earned_titles) ? user.earned_titles : [];
  return titles.filter((t) => t.source_id === title.source_id);
}

/**
 * Client-side safety check: returns true if the given title is still actively
 * held by the user in the top 3 of the source league. Server is the source of
 * truth; this is a UI hint only (e.g. for opacity / fading).
 */
export function isTitleCurrentlyHeld(
  title: EarnedTitle,
  top3UserIdsByLeague: Record<string, Set<string>>
): boolean {
  if (title.category === 'admin_historical') return true;
  if (title.category !== 'auto_current_season') return true;
  const set = top3UserIdsByLeague[title.source_id];
  if (!set) return true; // unknown league → don't downgrade
  // We don't know the user here, so the caller should consult the user field
  // directly. Kept as a no-op helper for future use.
  return true;
}

/**
 * One-shot migration for users who already had a legacy rank_title set.
 * If they don't yet have earned_titles / displayed_title_id, derive them from the
 * existing rank_title + league_champion_of and write them back.
 *
 * Safe to call repeatedly — bails out as soon as the user has the new fields set.
 */
export function useLegacyTitleMigration(userId: string | undefined | null) {
  const { users } = useUsers();
  useEffect(() => {
    if (!userId) return;
    const u = users.find((x) => x.id === userId) as User | undefined;
    if (!u) return;
    if (Array.isArray(u.earned_titles)) return; // already migrated

    const rankTitle: RankTitle | null | undefined = u.rank_title ?? null;
    const leagueChampionOf = u.league_champion_of ?? null;
    if (!rankTitle || !leagueChampionOf) return;

    const id = `${leagueChampionOf}_${rankTitle}`;
    const earned: EarnedTitle = {
      id,
      type: rankTitle === 'crown_champion' ? 'league_champion'
        : rankTitle === 'silver_sultan' ? 'league_runner_up'
        : rankTitle === 'bronze_boss' ? 'league_third'
        : 'league_champion',
      source_id: leagueChampionOf,
      source_name: 'Syndicate',
      rank_label: rankTitle === 'crown_champion' ? '#1'
        : rankTitle === 'silver_sultan' ? '#2'
        : rankTitle === 'bronze_boss' ? '#3'
        : '#1',
      earned_at: new Date().toISOString(),
      badge_variant: rankTitle,
      points_at_earn: 0,
      category: 'auto_current_season',
      is_temporary: true
    };

    // Attempt to enrich source_name from the leagues collection, fallback to literal
    void (async () => {
      try {
        const leagueSnap = await getDoc(doc(db, 'leagues', leagueChampionOf));
        if (leagueSnap.exists()) {
          earned.source_name = leagueSnap.data()?.name || 'Syndicate';
        }
      } catch { /* ignore */ }

      try {
        await setDoc(doc(db, 'users', userId), {
          earned_titles: [earned],
          displayed_title_id: id,
          pinned_title_ids: [id]
        }, { merge: true });
      } catch { /* non-fatal */ }
    })();
  }, [users, userId]);
}
