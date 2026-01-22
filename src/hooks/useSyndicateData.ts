import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { League, LeagueMember, Week, Pick } from '../types';

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
