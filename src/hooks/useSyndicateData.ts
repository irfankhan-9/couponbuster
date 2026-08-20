import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { League, LeagueMember, Week, Pick, LeagueChampion, RankTitle, GlobalLeague, GlobalLeagueEntry } from '../types';

export function useLeagues() {
    const [snapshot, loading, error] = useCollection(collection(db, 'leagues'));
    const leagues = snapshot?.docs.map(d => ({ id: d.id, ...d.data() } as League)) || [];
    return { leagues, loading, error };
}

export function useLeagueMembers(leagueId: string | undefined) {
    const q = leagueId
        ? query(collection(db, 'members'), where('league_id', '==', leagueId))
        : null;
    const [snapshot, loading, error] = useCollection(q);
    const members = snapshot?.docs.map(d => ({ id: d.id, ...d.data() } as LeagueMember)) || [];
    return { members, loading, error };
}

export function useLeagueWeeks(leagueId: string | undefined) {
    const q = leagueId
        ? query(collection(db, 'weeks'), where('league_id', '==', leagueId))
        : null;
    const [snapshot, loading, error] = useCollection(q);
    const weeks = snapshot?.docs.map(d => ({ id: d.id, ...d.data() } as Week)) || [];
    return { weeks, loading, error };
}

export function useActiveWeek(leagueId: string | undefined) {
    const { weeks: rawWeeks, loading, error } = useLeagueWeeks(leagueId);

    // Manual client-side sort by week_number asc to avoid composite index requirement
    const weeks = [...rawWeeks].sort((a, b) => a.week_number - b.week_number);

    // "Active" is the first one that isn't closed, OR the last one in the list.
    const activeWeek = weeks.find(w => w.status !== 'closed' && w.status !== 'approved') || weeks[weeks.length - 1] || null;
    return { activeWeek, weeks, loading, error };
}

export function useWeekPicks(weekId: string | undefined) {
    const q = weekId
        ? query(collection(db, 'picks'), where('week_id', '==', weekId))
        : null;
    const [snapshot, loading, error] = useCollection(q);
    const picks = snapshot?.docs.map(d => ({ id: d.id, ...d.data() } as Pick)) || [];
    return { picks, loading, error };
}

export function useUsers() {
    const [snapshot, loading, error] = useCollection(collection(db, 'users'));
    const users = snapshot?.docs.map(d => ({ id: d.id, ...d.data() } as any)) || [];
    return { users, loading, error };
}

export function useAllMembers() {
    const [snapshot, loading, error] = useCollection(collection(db, 'members'));
    const members = snapshot?.docs.map(d => ({ id: d.id, ...d.data() } as LeagueMember)) || [];
    return { members, loading, error };
}

export function useAllWeeks() {
    const [snapshot, loading, error] = useCollection(collection(db, 'weeks'));
    const weeks = snapshot?.docs.map(d => ({ id: d.id, ...d.data() } as Week)) || [];
    return { weeks, loading, error };
}

// Hook for league champions (new collection for fast leaderboard queries)
export function useLeagueChampions() {
    const [snapshot, loading, error] = useCollection(collection(db, 'league_champions'));
    const champions = snapshot?.docs.map(d => ({ id: d.id, ...d.data() } as LeagueChampion)) || [];
    return { champions, loading, error };
}

// Helper function to calculate rank title based on position
export function getRankTitle(rank: number): RankTitle | null {
    if (rank === 1) return RankTitle.CROWN_CHAMPION;
    if (rank === 2) return RankTitle.SILVER_SULTAN;
    if (rank === 3) return RankTitle.BRONZE_BOSS;
    return null;
}

// Helper to get user's highest title from multiple leagues
export function getHighestTitle(titles: (RankTitle | null)[]): RankTitle | null {
    if (titles.includes(RankTitle.CROWN_CHAMPION)) return RankTitle.CROWN_CHAMPION;
    if (titles.includes(RankTitle.SILVER_SULTAN)) return RankTitle.SILVER_SULTAN;
    if (titles.includes(RankTitle.BRONZE_BOSS)) return RankTitle.BRONZE_BOSS;
    return null;
}

// Hook for global league configuration
export function useGlobalLeague() {
    const [snapshot, loading, error] = useCollection(collection(db, 'global_league'));
    const globalLeague = snapshot?.docs.map(d => ({ id: d.id, ...d.data() } as GlobalLeague))[0];
    return { globalLeague, loading, error };
}

// Hook for all global league entries sorted by points
export function useGlobalLeagueEntries() {
    const [snapshot, loading, error] = useCollection(
        query(collection(db, 'global_league_entries'), orderBy('total_points', 'desc'))
    );
    const entries = snapshot?.docs.map(d => ({ id: d.id, ...d.data() } as GlobalLeagueEntry)) || [];
    return { entries, loading, error };
}

// Hook for pending join requests
export function useGlobalLeagueRequests() {
    const [snapshot, loading, error] = useCollection(
        query(collection(db, 'global_league_requests'), orderBy('requested_at', 'desc'))
    );
    const requests = snapshot?.docs.map(d => ({ id: d.id, ...d.data() })) || [];
    return { requests, loading, error };
}
