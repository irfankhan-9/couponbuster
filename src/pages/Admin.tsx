import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { addDoc, updateDoc, deleteDoc, doc, collection, runTransaction, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useLeagues, useAllMembers, useAllWeeks, useUsers, useActiveWeek, useWeekPicks } from '../hooks/useSyndicateData';
import {
    UserCheck,
    PlusCircle,
    MinusCircle,
    ChevronLeft,
    LayoutDashboard,
    Settings,
    Trophy,
    ArrowRight,
    PiggyBank,
    Clock,
    CalendarPlus,
    Unlock,
    Lock,
    Users,
    RefreshCcw,
    Star,
    ShieldCheck
} from 'lucide-react';
import { formatCurrency } from '../utils/scoring';
import { League, Week, LeagueMember } from '../types';
import { getInitialDraftOrder, rotateWeeklyOrder } from '../utils/draftLogic';
import { calculateLeagueWindow } from '../utils/scheduler';
import { TEAMS } from '../constants';
import logoFull from '../assets/logo_full.png';
import logoNav from '../assets/logo_nav.png';
import { ErrorBoundary } from '../components/ErrorBoundary';

export const AdminPanel: React.FC = () => {
    const [user] = useAuthState(auth);

    // Real-time Data
    const { leagues = [], loading: leaguesLoading } = useLeagues() || {};
    const { members = [] } = useAllMembers() || {};
    const { weeks = [] } = useAllWeeks() || {};
    const { users = [] } = useUsers() || {};

    // URL State
    const [searchParams, setSearchParams] = useSearchParams();
    const activeLeagueId = searchParams.get('leagueId');

    // Current Week and Picks for display
    const { activeWeek } = useActiveWeek(activeLeagueId || undefined);
    const { picks = [] } = useWeekPicks(activeWeek?.id) || {};

    const setActiveLeagueId = (id: string | null) => {
        if (id) {
            setSearchParams({ leagueId: id });
        } else {
            setSearchParams({});
        }
    };
    const [isCreating, setIsCreating] = useState(false);
    const [isLaunching, setIsLaunching] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [authorized, setAuthorized] = useState(() => sessionStorage.getItem('cb_admin_session') === 'true');
    const [gateName, setGateName] = useState('');
    const [gatePassword, setGatePassword] = useState('');
    const [gateLoading, setGateLoading] = useState(false);
    const [gateError, setGateError] = useState<string | null>(null);

    // Global Reset State
    const [showGlobalResetModal, setShowGlobalResetModal] = useState(false);
    const [globalResetConfirm, setGlobalResetConfirm] = useState('');
    const [isGlobalResetting, setIsGlobalResetting] = useState(false);

    // Creation State
    const [newLeague, setNewLeague] = useState({
        name: '',
        maxPlayers: 20,
        weeklyFee: 20,
        potDeduction: 2
    });

    // Draft Order State
    const [customDraftOrder, setCustomDraftOrder] = useState<string[]>([]);
    const [isEditingDraftOrder, setIsEditingDraftOrder] = useState(false);

    const activeLeague = (leagues || []).find(l => l.id === activeLeagueId);
    const isAdmin = !!(
        activeLeague && user && (
            activeLeague.owner_id === user.uid ||
            activeLeague.league_admins?.includes(user.uid)
        )
    );
    const isOwner = !!(activeLeague && user && activeLeague.owner_id === user.uid);
    const activeLeagueWeeks = (weeks || [])
        .filter(w => w.league_id === activeLeagueId)
        .sort((a, b) => a.week_number - b.week_number);
    const currentOpenWeek = activeLeagueWeeks.find(w => w.status === 'open') || activeLeagueWeeks[activeLeagueWeeks.length - 1];

    // Initialize custom draft order from Week 1
    React.useEffect(() => {
        if (!activeLeagueId) return;

        // Compute locally to avoid dependency issues
        const localLeagueMembers = members.filter(m => m.league_id === activeLeagueId);
        const localApprovedMembers = localLeagueMembers.filter(m => m.status === 'approved');

        const week1 = activeLeagueWeeks.find(w => w.week_number === 1);
        if (week1 && localApprovedMembers.length > 0) {
            let targetOrder: string[] = [];
            if (week1.custom_draft_order && week1.custom_draft_order.length > 0) {
                targetOrder = week1.custom_draft_order;
            } else {
                targetOrder = getInitialDraftOrder(localApprovedMembers, week1);
            }

            // Prevent Infinite Loop: Only update if strictly different
            setCustomDraftOrder(prev => {
                // If the user is currently editing, don't let prop updates overwrite their local changes
                if (isEditingDraftOrder) return prev;
                if (JSON.stringify(prev) === JSON.stringify(targetOrder)) return prev;
                return targetOrder;
            });
        }
    }, [activeLeagueWeeks, members, activeLeagueId, isEditingDraftOrder]);

    // Handle Loading: Show spinner only if loading active
    if (activeLeagueId && !activeLeague) {
        if (leaguesLoading) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center">
                        <div className="h-10 w-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
                        <h3 className="font-black text-slate-800 text-lg">Loading Syndicate...</h3>
                    </div>
                </div>
            );
        } else {
            // Loaded but not found? Reset ID
            setActiveLeagueId(null);
            return null;
        }
    }

    // Admin Access Gate (Name + Password)
    if (!authorized) {
        const handleGateSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            setGateError(null);
            setGateLoading(true);
            try {
                const validName = gateName.trim() === 'josh';
                const validPass = gatePassword === '$josh123';
                if (!validName || !validPass) {
                    throw new Error('Invalid credentials');
                }
                setAuthorized(true);
                sessionStorage.setItem('cb_admin_session', 'true');
                setGateName('');
                setGatePassword('');
            } catch (err: any) {
                setGateError('Access denied. Check name and password.');
            } finally {
                setGateLoading(false);
            }
        };

        return (
            <div className="min-h-screen flex">
                {/* Hero Side */}
                <div className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800" />
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #ffffff22 0 20%, transparent 20%), radial-gradient(circle at 80% 30%, #ffffff11 0 18%, transparent 18%), radial-gradient(circle at 40% 70%, #ffffff11 0 22%, transparent 22%)' }} />
                    <div className="relative z-10 text-white text-center px-10 animate-in fade-in duration-700">
                        <div className="mb-8 flex justify-center">
                            <img src={logoFull} alt="Coupon Busters" className="h-64 w-auto drop-shadow-2xl" />
                        </div>
                        <h2 className="text-4xl font-black tracking-tight mb-3">Admin Console</h2>
                        <p className="text-emerald-50/90 font-medium">Restricted area. Authorized personnel only.</p>
                    </div>
                </div>

                {/* Gate Card */}
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="w-full max-w-md bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-10 relative">
                        <div className="mb-8 text-center sm:text-left">
                            <div className="flex justify-center sm:justify-start mb-2">
                                <img src={logoNav} alt="Coupon Busters" className="h-10 w-auto" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin Command Center</p>
                        </div>

                        {gateError && (
                            <div className="mb-4 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-bold animate-in fade-in duration-300">
                                {gateError}
                            </div>
                        )}

                        <form onSubmit={handleGateSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Admin Identity</label>
                                <input
                                    type="text"
                                    value={gateName}
                                    onChange={(e) => setGateName(e.target.value)}
                                    className="w-full p-4 sm:p-3 rounded-2xl border border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 font-bold"
                                    placeholder="Executive Name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Access Passcode</label>
                                <input
                                    type="password"
                                    value={gatePassword}
                                    onChange={(e) => setGatePassword(e.target.value)}
                                    className="w-full p-4 sm:p-3 rounded-2xl border border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 font-bold"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={gateLoading}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-4 sm:py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
                            >
                                {gateLoading ? (
                                    <span className="h-4 w-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Unlock className="h-4 w-4" />
                                        <span>Unlock Console</span>
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-300">
                            C.Busters Executive v2.5
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Handlers
    const handleCreateLeague = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            setCreateError(null);
            setIsLaunching(true);
            // 1. Create League Doc
            const leagueRef = await addDoc(collection(db, 'leagues'), {
                name: newLeague.name,
                owner_id: user.uid,
                privacy: 'private',
                weekly_fee_pence: newLeague.weeklyFee * 100,
                pot_deduction_pence: newLeague.potDeduction * 100,
                current_pot_pence: 0,
                max_players: newLeague.maxPlayers,
                start_date: new Date().toISOString().split('T')[0],
                pick_deadline_day: 5,
                pick_deadline_hour: 23,
                enable_automatic_deadlines: true,
                market_manual_open: true
            });

            // 2. Initialize Week 1
            await addDoc(collection(db, 'weeks'), {
                league_id: leagueRef.id,
                week_number: 1,
                status: 'open',
                deadline_at: new Date(Date.now() + 86400000 * 5).toISOString(),
                pick_order: [],
                current_turn_user_id: null,
                draft_round: 1,
                draft_status: 'upcoming'
            });

            setIsCreating(false);
            setNewLeague({ name: '', maxPlayers: 20, weeklyFee: 20, potDeduction: 2 });
        } catch (e: any) {
            console.error(e);
            setCreateError(e?.message || 'Failed to create league');
        } finally {
            setIsLaunching(false);
        }
    };

    const handleDeleteLeague = async () => {
        if (!activeLeagueId || !activeLeague) return;
        if (deleteConfirm !== activeLeague.name) return;
        setIsDeleting(true);
        try {
            const weeksSnap = await getDocs(query(collection(db, 'weeks'), where('league_id', '==', activeLeagueId)));
            const weekIds = weeksSnap.docs.map(d => d.id);
            const picksDocs = [] as any[];
            for (const wid of weekIds) {
                const pSnap = await getDocs(query(collection(db, 'picks'), where('week_id', '==', wid)));
                picksDocs.push(...pSnap.docs);
            }
            const membersSnap = await getDocs(query(collection(db, 'members'), where('league_id', '==', activeLeagueId)));

            const toDelete = [
                ...picksDocs.map(dref => ({ path: `picks/${dref.id}` })),
                ...weeksSnap.docs.map(dref => ({ path: `weeks/${dref.id}` })),
                ...membersSnap.docs.map(dref => ({ path: `members/${dref.id}` })),
            ];

            const chunkSize = 450;
            for (let i = 0; i < toDelete.length; i += chunkSize) {
                const batch = writeBatch(db);
                const chunk = toDelete.slice(i, i + chunkSize);
                chunk.forEach(item => {
                    const [col, id] = item.path.split('/');
                    batch.delete(doc(db, col, id));
                });
                await batch.commit();
            }

            await deleteDoc(doc(db, 'leagues', activeLeagueId));
            setShowDeleteModal(false);
            setDeleteConfirm('');
            setActiveLeagueId(null);
            alert('League deleted');
        } catch (e: any) {
            console.error(e);
            alert('Failed to delete league');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeadlineUpdate = async (newDay: number, newHour: number) => {
        if (!activeLeagueId) return;
        await updateDoc(doc(db, 'leagues', activeLeagueId), {
            pick_deadline_day: newDay,
            pick_deadline_hour: newHour
        });
    };

    const handleGlobalReset = async () => {
        if (globalResetConfirm !== 'CONFIRM WIPE') return;
        setIsGlobalResetting(true);
        try {
            // 1. Fetch ALL relevant collections (EXCEPT users)
            const leaguesSnap = await getDocs(collection(db, 'leagues'));
            const weeksSnap = await getDocs(collection(db, 'weeks'));
            const picksSnap = await getDocs(collection(db, 'picks'));
            const membersSnap = await getDocs(collection(db, 'members'));

            const toDelete = [
                ...picksSnap.docs.map(d => ({ path: `picks/${d.id}` })),
                ...weeksSnap.docs.map(d => ({ path: `weeks/${d.id}` })),
                ...membersSnap.docs.map(d => ({ path: `members/${d.id}` })),
                ...leaguesSnap.docs.map(d => ({ path: `leagues/${d.id}` }))
            ];

            console.log(`Wiping ${toDelete.length} documents...`);

            const chunkSize = 450;
            for (let i = 0; i < toDelete.length; i += chunkSize) {
                const batch = writeBatch(db);
                const chunk = toDelete.slice(i, i + chunkSize);
                chunk.forEach(item => {
                    const [col, id] = item.path.split('/');
                    batch.delete(doc(db, col, id));
                });
                await batch.commit();
            }

            setShowGlobalResetModal(false);
            setGlobalResetConfirm('');
            alert('SYSTEM WIPE COMPLETE. All leagues destroyed.');
            window.location.reload();
        } catch (e: any) {
            console.error(e);
            alert('Wipe failed: ' + e.message);
        } finally {
            setIsGlobalResetting(false);
        }
    };

    const handleManualOverride = async (enabled: boolean) => {
        if (!activeLeagueId) return;
        try {
            await updateDoc(doc(db, 'leagues', activeLeagueId), {
                enable_automatic_deadlines: enabled,
                // If switching to Automated, clear the manual flag
                ...(enabled ? { market_manual_open: null } : {})
            });
        } catch (e: any) {
            alert("Failed to update setting. You must be the league owner.");
            console.error(e);
        }
    };

    const handleManualMarketOpen = async (open: boolean) => {
        if (!activeLeagueId) return;
        try {
            await runTransaction(db, async (transaction) => {
                const leagueRef = doc(db, 'leagues', activeLeagueId);
                transaction.update(leagueRef, {
                    market_manual_open: open,
                    enable_automatic_deadlines: false
                });

                // If OPENING manually, also ensure the current week is unlocked/active
                if (open && currentOpenWeek) {
                    const weekRef = doc(db, 'weeks', currentOpenWeek.id);
                    transaction.update(weekRef, {
                        status: 'open',
                        draft_status: 'active'
                    });
                }
            });
            alert(open ? "Market Opened (Manual Override Active)" : "Market Closed");
        } catch (e: any) {
            console.error(e);
            alert("Failed to update market state.");
        }
    };

    const handleApprove = async (memberId: string) => {
        const member = members.find(m => m.id === memberId);
        if (!member) return;

        try {
            await updateDoc(doc(db, 'members', memberId), { status: 'approved' });

            // Update Week 1 Order logic
            if (member.league_id) {
                // Find Week 1
                const q = query(collection(db, 'weeks'), where('league_id', '==', member.league_id), where('week_number', '==', 1));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const weekDoc = snap.docs[0];
                    const weekData = weekDoc.data();

                    if (weekData.draft_status === 'upcoming' || weekData.draft_status === 'active') {
                        // Re-fetch all members of this league (including the one just approved)
                        // Note: 'members' hook might not update instantly in this closure, so best to query or use optimistic logic.
                        // But easier to just use the hook's data + current member as approved.
                        const leagueMembers = members.filter(m => m.league_id === member.league_id);
                        // Add/Update current member in this list virtually
                        const updatedMembers = leagueMembers.map(m => m.id === memberId ? { ...m, status: 'approved' } : m) as LeagueMember[];

                        const newOrder = getInitialDraftOrder(updatedMembers);

                        // CRITICAL CHANGE: Do NOT auto-start the draft anymore.
                        // Just update the pick order. The admin must manually click "Start League Draft".
                        const updatePayload: any = { pick_order: newOrder };
                        // Removed: auto-setting current_turn_user_id and draft_status

                        await updateDoc(weekDoc.ref, updatePayload);
                    }
                }
            }
        } catch (e) {
            console.error(e);
            alert("Error handling approval");
        }
    };

    const handleReject = async (memberId: string) => {
        if (confirm("Are you sure you want to reject/remove this member?")) {
            await deleteDoc(doc(db, 'members', memberId));
        }
    };

    const handlePointChange = async (memberId: string, delta: number) => {
        const member = members.find(m => m.id === memberId);
        if (member) {
            const newPoints = Math.max(0, member.points + delta);
            await updateDoc(doc(db, 'members', memberId), { points: newPoints });
        }
    };

    const handleAdjustmentPointChange = async (memberId: string, delta: number) => {
        const member = members.find(m => m.id === memberId);
        if (member) {
            const currentA = member.adjustment_points || 0;
            await updateDoc(doc(db, 'members', memberId), { adjustment_points: currentA + delta });
        }
    };

    const handlePotUpdate = async (newPotPence: number) => {
        if (!activeLeagueId) return;
        await updateDoc(doc(db, 'leagues', activeLeagueId), { current_pot_pence: newPotPence });
    };

    const handleGenerateNextWeek = async () => {
        if (!activeLeagueId) return;

        try {
            await runTransaction(db, async (transaction) => {
                if (currentOpenWeek) {
                    const weekRef = doc(db, 'weeks', currentOpenWeek.id);
                    // Close current
                    transaction.update(weekRef, { status: 'closed', draft_status: 'completed' });

                    // Create next
                    const nextWeekNum = currentOpenWeek.week_number + 1;
                    const newOrder = rotateWeeklyOrder(currentOpenWeek.pick_order);

                    const newWeekRef = doc(collection(db, 'weeks')); // Auto ID
                    transaction.set(newWeekRef, {
                        league_id: activeLeagueId,
                        week_number: nextWeekNum,
                        status: 'open',
                        deadline_at: new Date(Date.now() + 86400000 * 7).toISOString(),
                        pick_order: newOrder,
                        current_turn_user_id: newOrder.length > 0 ? newOrder[0] : null,
                        draft_round: 1,
                        draft_status: 'active'
                    });
                } else {
                    // Create Week 1 from scratch
                    const newWeekRef = doc(collection(db, 'weeks'));
                    transaction.set(newWeekRef, {
                        league_id: activeLeagueId,
                        week_number: 1,
                        status: 'open',
                        deadline_at: new Date(Date.now() + 86400000 * 5).toISOString(),
                        pick_order: [],
                        current_turn_user_id: null,
                        draft_round: 1,
                        draft_status: 'upcoming'
                    });
                }
            });
            alert(currentOpenWeek ? "Next week generated!" : "Week 1 initialized!");
        } catch (e: any) {
            console.error(e);
            alert("Failed to generate week: " + e.message);
        }
    };

    const handleStartRound2 = async () => {
        if (!activeLeagueId || !currentOpenWeek) return;
        try {
            await updateDoc(doc(db, 'weeks', currentOpenWeek.id), {
                draft_round: 2,
                draft_status: 'active',
                current_turn_user_id: currentOpenWeek.pick_order[0]
            });
            alert("Round 2 Started! First player is now on the clock.");
        } catch (e: any) {
            console.error(e);
            alert("Failed to start Round 2: " + e.message);
        }
    };

    // Draft Order Handlers
    const handleSetCustomDraftOrder = async (order: string[]) => {
        if (!activeLeagueId) return;

        const week1 = activeLeagueWeeks.find(w => w.week_number === 1);
        if (!week1) {
            alert('Week 1 not found!');
            return;
        }

        if (week1.draft_status !== 'upcoming') {
            alert('Cannot change draft order after draft has started!');
            return;
        }

        // Validate: all approved members included
        const approvedUsers = approvedMembers.map(m => m.user_id);

        if (order.length !== approvedUsers.length) {
            alert('Draft order must include all approved members!');
            return;
        }

        const allIncluded = order.every(uid => approvedUsers.includes(uid));
        if (!allIncluded) {
            alert('Draft order contains invalid user IDs!');
            return;
        }

        try {
            await updateDoc(doc(db, 'weeks', week1.id), {
                custom_draft_order: order,
                pick_order: order // Sync pick_order too so the UI ticker updates immediately
            });
            alert('✅ Custom draft order saved for Week 1!');
            setIsEditingDraftOrder(false);
        } catch (e: any) {
            console.error(e);
            alert('Failed to save draft order: ' + e.message);
        }
    };

    const handleRandomizeDraftOrder = () => {
        const approvedUsers = approvedMembers.map(m => m.user_id);

        // Fisher-Yates shuffle
        const shuffled = [...approvedUsers];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        setCustomDraftOrder(shuffled);
    };

    const handleStartLeagueDraft = async () => {
        if (!activeLeagueId || !currentOpenWeek) return;

        // Safety check
        if (currentOpenWeek.week_number !== 1) {
            alert('Manual start is only for Week 1.');
            return;
        }

        const weekRef = doc(db, 'weeks', currentOpenWeek.id);
        const order = currentOpenWeek.custom_draft_order && currentOpenWeek.custom_draft_order.length > 0
            ? currentOpenWeek.custom_draft_order
            : currentOpenWeek.pick_order;

        if (!order || order.length === 0) {
            alert('Cannot start draft: No players in pick order!');
            return;
        }

        try {
            await updateDoc(weekRef, {
                draft_status: 'active',
                current_turn_user_id: order[0], // First player on the clock
                draft_round: 1
            });
            alert('🚀 League Draft Started! The first player is now on the clock.');
        } catch (e: any) {
            console.error(e);
            alert('Failed to start draft: ' + e.message);
        }
    };

    const moveUserUp = (index: number) => {
        if (index === 0) return;
        const newOrder = [...customDraftOrder];
        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        setCustomDraftOrder(newOrder);
    };

    const moveUserDown = (index: number) => {
        if (index === customDraftOrder.length - 1) return;
        const newOrder = [...customDraftOrder];
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        setCustomDraftOrder(newOrder);
    };

    const resetToAutoOrder = () => {
        const week1 = activeLeagueWeeks.find(w => w.week_number === 1);
        const autoOrder = getInitialDraftOrder(approvedMembers, week1);
        setCustomDraftOrder(autoOrder);
    };

    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const hoursOfDay = Array.from({ length: 24 }, (_, i) => i);

    // Filtering
    const leagueMembers = members.filter(m => m.league_id === activeLeagueId);
    const approvedMembers = leagueMembers.filter(m => m.status === 'approved');
    const pendingRequests = leagueMembers.filter(m => m.status === 'pending');

    // View Switching
    if (activeLeagueId && activeLeague) {
        return (
            <ErrorBoundary>
                <div className="space-y-6 animate-in fade-in duration-300 pb-6">
                    <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-slate-50/90 backdrop-blur md:static md:z-auto md:mx-0 md:px-0 md:py-0 md:bg-transparent">
                        <button
                            onClick={() => setActiveLeagueId(null)}
                            className="flex items-center text-slate-500 hover:text-emerald-600 font-bold transition-colors group py-2"
                        >
                            <ChevronLeft className="h-5 w-5 mr-1 transition-transform group-hover:-translate-x-1" />
                            Back to Leagues
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-8">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight break-words">{activeLeague.name}</h1>
                                <p className="text-slate-500 text-sm mt-1">League Management Interface</p>
                            </div>
                            <div className="flex items-center justify-between md:justify-start space-x-2 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                                <Trophy className="h-5 w-5 text-emerald-600" />
                                <span className="text-emerald-700 font-black">{formatCurrency(activeLeague.current_pot_pence)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Weekly Fee</label>
                                <p className="text-xl font-black text-slate-900">{formatCurrency(activeLeague.weekly_fee_pence)}</p>
                            </div>
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Pot Deduction</label>
                                <p className="text-xl font-black text-emerald-600">{formatCurrency(activeLeague.pot_deduction_pence)}</p>
                            </div>
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Stake per Player</label>
                                <p className="text-xl font-black text-indigo-600">{formatCurrency(activeLeague.weekly_fee_pence - activeLeague.pot_deduction_pence)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                        {/* Join Requests */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                <UserCheck className="h-5 w-5 text-blue-600 mr-2" />
                                Pending Requests ({(pendingRequests || []).length})
                            </h2>
                            {(!pendingRequests || pendingRequests.length === 0) ? (
                                <div className="text-center py-12 text-slate-400 italic text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    No pending requests.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {(pendingRequests || []).map(req => {
                                        const u = users.find(u => u.id === req.user_id);
                                        return (
                                            <div key={req.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-3 md:flex-row md:justify-between md:items-center transition-all hover:bg-white hover:shadow-md">
                                                <div>
                                                    <p className="font-bold text-slate-900 break-words">{u?.display_name || 'Unknown User'}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-tight">Joined: {new Date(req.joined_at).toLocaleDateString()}</p>
                                                </div>
                                                <div className="flex flex-col gap-2 w-full md:w-auto md:flex-row">
                                                    <button onClick={() => handleApprove(req.id)} className="w-full md:w-auto bg-emerald-600 text-white px-4 py-3 md:py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm transition-colors">Approve</button>
                                                    <button onClick={() => handleReject(req.id)} className="w-full md:w-auto text-red-500 px-4 py-3 md:px-3 md:py-2 text-xs font-bold hover:bg-red-50 rounded-xl transition-colors">Reject</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Points Overrides */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                <Settings className="h-5 w-5 text-amber-500 mr-2" />
                                Points Control
                            </h2>
                            <div className="overflow-y-auto max-h-80 space-y-2">
                                {approvedMembers.length === 0 ? (
                                    <p className="text-sm text-slate-400 italic">No approved members.</p>
                                ) : (
                                    (approvedMembers || []).map(member => {
                                        const u = users.find(u => u.id === member.user_id);
                                        const userPick = picks.find(p => p.user_id === member.user_id);
                                        const bankerTeam = TEAMS.find(t => t.id === userPick?.pick1_team_id);
                                        const coverTeam = TEAMS.find(t => t.id === userPick?.pick2_team_id);

                                        return (
                                            <div key={member.id} className="flex flex-col p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded-xl space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex flex-col min-w-0 pr-3">
                                                        <span className="text-sm font-black text-slate-700 break-words">{u?.display_name || 'Unknown'}</span>
                                                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                            {bankerTeam ? (
                                                                <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-yellow-50 text-yellow-700 border border-yellow-100 text-[9px] font-black uppercase tracking-tight">
                                                                    <Star className="h-2.5 w-2.5 mr-1 fill-current" />
                                                                    {bankerTeam.name}
                                                                </div>
                                                            ) : (
                                                                <div className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-300 border border-slate-100 text-[9px] font-bold uppercase tracking-tight italic">No Banker</div>
                                                            )}
                                                            {coverTeam ? (
                                                                <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] font-black uppercase tracking-tight">
                                                                    <ShieldCheck className="h-2.5 w-2.5 mr-1" />
                                                                    {coverTeam.name}
                                                                </div>
                                                            ) : (
                                                                <div className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-300 border border-slate-100 text-[9px] font-bold uppercase tracking-tight italic">No Cover</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-4 flex-shrink-0">
                                                        <button onClick={() => handlePointChange(member.id, -1)} className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"><MinusCircle className="h-5 w-5" /></button>
                                                        <div className="flex flex-col items-center min-w-[40px]">
                                                            <span className="text-lg font-black text-slate-900">{member.points}</span>
                                                            <span className="text-[8px] font-black text-slate-400 tracking-widest uppercase">Points</span>
                                                        </div>
                                                        <button onClick={() => handlePointChange(member.id, 1)} className="text-slate-300 hover:text-emerald-500 transition-colors p-1 rounded-lg hover:bg-emerald-50"><PlusCircle className="h-5 w-5" /></button>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end items-center border-t border-slate-50 pt-2">
                                                    <div className="flex items-center space-x-3 bg-slate-100 px-3 py-1.5 rounded-xl">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">( A )</span>
                                                        <button onClick={() => handleAdjustmentPointChange(member.id, -1)} className="text-slate-400 hover:text-red-500 transition-colors"><MinusCircle className="h-4 w-4" /></button>
                                                        <span className="text-sm font-black text-slate-700 min-w-[20px] text-center">{member.adjustment_points || 0}</span>
                                                        <button onClick={() => handleAdjustmentPointChange(member.id, 1)} className="text-slate-400 hover:text-emerald-500 transition-colors"><PlusCircle className="h-4 w-4" /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* League Schedule Settings */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6 lg:col-span-2">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <h2 className="text-xl font-black text-slate-900 flex items-center">
                                    <Clock className="h-5 w-5 text-indigo-600 mr-2" />
                                    League Schedule Settings
                                    {activeLeague && (
                                        <span className={`ml-3 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${calculateLeagueWindow(activeLeague).isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            Currently: {calculateLeagueWindow(activeLeague).isOpen ? 'Open' : 'Closed'}
                                        </span>
                                    )}
                                </h2>
                                {isAdmin && (
                                    <div className="flex flex-col gap-2 w-full md:w-auto md:flex-row md:items-center">
                                        <button
                                            onClick={handleGenerateNextWeek}
                                            className="w-full md:w-auto flex items-center justify-center bg-indigo-50 text-indigo-700 px-4 py-3 md:py-2 rounded-xl text-xs font-black hover:bg-indigo-100 transition-colors border border-indigo-200"
                                        >
                                            <CalendarPlus className="h-4 w-4 mr-2" />
                                            {currentOpenWeek ? `Generate Week ${currentOpenWeek.week_number + 1}` : 'Initialize Week 1'}
                                        </button>
                                        {currentOpenWeek && currentOpenWeek.draft_status === 'paused' && currentOpenWeek.draft_round === 1 && (
                                            <button
                                                onClick={handleStartRound2}
                                                className="w-full md:w-auto flex items-center justify-center bg-emerald-600 text-white px-4 py-3 md:py-2 rounded-xl text-xs font-black hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/20 animate-pulse md:ml-2"
                                            >
                                                <ArrowRight className="h-4 w-4 mr-2" />
                                                Start Round 2
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>


                        {/* Draft Order Manager - Visible for context, but only editable Week 1 */}
                        {currentOpenWeek && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-8 lg:col-span-2">
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 flex items-center">
                                            <LayoutDashboard className="h-5 w-5 text-purple-600 mr-2" />
                                            {currentOpenWeek.week_number === 1 ? 'Week 1 Draft Order Control' : `Week ${currentOpenWeek.week_number} Draft Order (Automated)`}
                                        </h2>
                                        <p className="text-sm text-slate-500 mt-2">
                                            {currentOpenWeek.week_number === 1
                                                ? 'Set the picking order for Week 1. After Week 1, the system auto-rotates to keep it fair.'
                                                : 'Manual draft controls are only available for Week 1. The system now rotates automatically each week.'}
                                        </p>
                                    </div>
                                </div>

                                {currentOpenWeek.week_number > 1 && (
                                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center mb-6">
                                        <div className="mx-auto w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-3">
                                            <RefreshCcw className="h-6 w-6 text-slate-500" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-700">Automation Active</h3>
                                        <p className="text-slate-500 text-sm mt-1">
                                            Manual draft setup is only for the first week. Picking order currently follows the automated rotation schedule.
                                        </p>
                                    </div>
                                )}

                                {currentOpenWeek.week_number === 1 && currentOpenWeek.current_turn_user_id && (
                                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center mb-6">
                                        <div className="mx-auto w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-3">
                                            <Lock className="h-6 w-6 text-slate-500" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-700">Draft Has Started</h3>
                                        <p className="text-slate-500 text-sm mt-1">The draft order is locked because the first pick has already been assigned.</p>
                                    </div>
                                )}

                                {currentOpenWeek.week_number === 1 && !currentOpenWeek.current_turn_user_id && approvedMembers.length === 0 && (
                                    <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-center mb-6">
                                        <div className="mx-auto w-12 h-12 bg-amber-200 rounded-full flex items-center justify-center mb-3">
                                            <Users className="h-6 w-6 text-amber-700" />
                                        </div>
                                        <h3 className="text-lg font-bold text-amber-800">Waiting for Members</h3>
                                        <p className="text-amber-700 text-sm mt-1">Approve at least one member to unlock draft order controls.</p>
                                    </div>
                                )}

                                {/* Order List - Always visible for context */}
                                {((currentOpenWeek.week_number === 1 && approvedMembers.length > 0) || currentOpenWeek.week_number > 1) && (
                                    <>
                                        {/* Order List */}
                                        <div className="space-y-2 mb-6">
                                            {(customDraftOrder || []).map((userId, index) => {
                                                if (!userId) return null;
                                                const member = members.find(m => m.user_id === userId);
                                                const u = users.find(u => u.id === userId);
                                                const displayName = u?.display_name || member?.user_id || 'Unknown';

                                                return (
                                                    <div
                                                        key={userId}
                                                        className="flex items-center gap-3 p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl border border-slate-200 hover:border-purple-200 transition-colors"
                                                    >
                                                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-600 text-white font-black text-lg shadow-md">
                                                            {index + 1}
                                                        </div>
                                                        <span className="flex-1 font-bold text-slate-800">{displayName}</span>
                                                        {currentOpenWeek.week_number === 1 && (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => moveUserUp(index)}
                                                                    disabled={index === 0 || !isEditingDraftOrder}
                                                                    className="p-2 hover:bg-purple-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                                                    title="Move up"
                                                                >
                                                                    <ChevronLeft className="h-5 w-5 rotate-90 text-purple-600" />
                                                                </button>
                                                                <button
                                                                    onClick={() => moveUserDown(index)}
                                                                    disabled={index === customDraftOrder.length - 1 || !isEditingDraftOrder}
                                                                    className="p-2 hover:bg-purple-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                                                    title="Move down"
                                                                >
                                                                    <ChevronLeft className="h-5 w-5 -rotate-90 text-purple-600" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Actions & Warnings - Week 1 Only */}
                                        {currentOpenWeek.week_number === 1 && (
                                            <>
                                                {/* Actions */}
                                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-4 bg-purple-50 rounded-xl border border-purple-100">
                                                    <div className="flex flex-wrap gap-2">
                                                        {!isEditingDraftOrder ? (
                                                            <button
                                                                onClick={() => setIsEditingDraftOrder(true)}
                                                                className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-bold text-sm transition-colors shadow-md"
                                                            >
                                                                🎯 Edit Order
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={handleRandomizeDraftOrder}
                                                                    className="px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 font-bold text-sm transition-colors"
                                                                >
                                                                    🎲 Randomize
                                                                </button>
                                                                <button
                                                                    onClick={() => handleSetCustomDraftOrder(customDraftOrder)}
                                                                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold text-sm transition-colors shadow-md"
                                                                >
                                                                    💾 Save Order
                                                                </button>
                                                                <button
                                                                    onClick={resetToAutoOrder}
                                                                    className="px-4 py-2 bg-slate-500 text-white rounded-xl hover:bg-slate-600 font-bold text-sm transition-colors"
                                                                >
                                                                    🔄 Reset
                                                                </button>
                                                                <button
                                                                    onClick={() => setIsEditingDraftOrder(false)}
                                                                    className="px-4 py-2 text-slate-600 hover:text-slate-800 font-bold text-sm"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-4 text-sm text-amber-700 bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-start gap-2">
                                                    <span className="text-xl">⚠️</span>
                                                    <div>
                                                        <p className="font-bold">Important:</p>
                                                        <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                                                            <li>Once Week 1 drafting starts, you cannot change the order!</li>
                                                            <li>Week 2+ will automatically rotate (1st becomes last)</li>
                                                            <li>Use Randomize for fairness or Edit for strategic balancing</li>
                                                        </ul>
                                                    </div>
                                                </div>

                                                {/* Manual Start Button for Week 1 */}
                                                {!currentOpenWeek.current_turn_user_id && !isEditingDraftOrder && approvedMembers.length >= 2 && (
                                                    <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end">
                                                        <button
                                                            onClick={handleStartLeagueDraft}
                                                            className="px-6 py-4 bg-emerald-600 text-white rounded-xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 flex items-center gap-3 animate-pulse"
                                                        >
                                                            <ArrowRight className="h-6 w-6" />
                                                            START LEAGUE DRAFT
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* Automation Override Toggle */}
                        <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-start md:items-center space-x-4">
                                <div className={`p-3 rounded-xl ${activeLeague.enable_automatic_deadlines ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                    {activeLeague.enable_automatic_deadlines ? <Lock className="h-6 w-6" /> : <Unlock className="h-6 w-6" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">
                                        {activeLeague.enable_automatic_deadlines ? 'Automated Mode' : 'Manual Mode'}
                                    </h3>
                                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                                        {activeLeague.enable_automatic_deadlines
                                            ? 'System automatically closes Friday 11pm and re-opens Sunday 11pm (UK time).'
                                            : 'Admins can manually Open/Close the market below. Automated schedule is disabled.'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex bg-white rounded-xl border border-slate-200 p-1 w-full md:w-auto">
                                <button
                                    onClick={() => handleManualOverride(true)}
                                    disabled={!isAdmin}
                                    className={`flex-1 md:flex-none px-4 py-3 md:py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeLeague.enable_automatic_deadlines ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-emerald-600'} ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Automated
                                </button>
                                <button
                                    onClick={() => handleManualOverride(false)}
                                    disabled={!isAdmin}
                                    className={`flex-1 md:flex-none px-4 py-3 md:py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${!activeLeague.enable_automatic_deadlines ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-amber-600'} ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Manual
                                </button>
                            </div>
                        </div>

                        {/* Manual Open/Close controls */}
                        {
                            !activeLeague.enable_automatic_deadlines && (
                                <div className="mb-8 p-4 bg-white border border-slate-200 rounded-2xl flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <h3 className="font-bold text-slate-900">Manual Market Control</h3>
                                        <p className="text-xs text-slate-500 mt-1">Toggle to immediately open or close this league's market.</p>
                                    </div>
                                    <div className="flex bg-slate-50 rounded-xl border border-slate-200 p-1 w-full md:w-auto">
                                        <button
                                            onClick={() => handleManualMarketOpen(true)}
                                            disabled={!isAdmin}
                                            className={`flex-1 md:flex-none px-4 py-3 md:py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeLeague.market_manual_open ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-emerald-600'} ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            Open Market
                                        </button>
                                        <button
                                            onClick={() => handleManualMarketOpen(false)}
                                            disabled={!isAdmin}
                                            className={`flex-1 md:flex-none px-4 py-3 md:py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${!activeLeague.market_manual_open ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-red-600'} ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            Close Market
                                        </button>
                                    </div>
                                </div>
                            )
                        }

                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col md:flex-row gap-8 opacity-90">
                            <div className="flex-1">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Weekly Pick Deadline Day</label>
                                <select
                                    value={activeLeague.pick_deadline_day}
                                    onChange={(e) => handleDeadlineUpdate(parseInt(e.target.value), activeLeague.pick_deadline_hour)}
                                    disabled={!activeLeague.enable_automatic_deadlines || !isAdmin}
                                    className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-bold text-slate-700 p-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {daysOfWeek.map((day, index) => (
                                        <option key={index} value={index}>{day}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Deadline Time</label>
                                <select
                                    value={activeLeague.pick_deadline_hour}
                                    onChange={(e) => handleDeadlineUpdate(activeLeague.pick_deadline_day, parseInt(e.target.value))}
                                    disabled={!activeLeague.enable_automatic_deadlines || !isAdmin}
                                    className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-bold text-slate-700 p-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {hoursOfDay.map((hour) => (
                                        <option key={hour} value={hour}>
                                            {hour === 0 ? '12:00 AM (Midnight)' : hour === 12 ? '12:00 PM (Noon)' : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-4 flex items-start space-x-2 text-xs text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <span className="font-bold text-emerald-600">Note:</span>
                            <span className="italic">Generating a new week will automatically rotate the draft order (1st player becomes last). This ensures fair play over the season.</span>
                        </div>
                    </div >

                    {/* Financial Overrides */}
                    < div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-8 lg:col-span-2" >
                        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                            <PiggyBank className="h-5 w-5 text-emerald-600 mr-2" />
                            Pot Management (Saved Fund)
                        </h2>
                        <div className="flex flex-col md:flex-row items-end gap-6 bg-emerald-50/30 p-8 rounded-3xl border border-emerald-100/50">
                            <div className="flex-grow w-full">
                                <label className="block text-xs font-black text-emerald-800/60 mb-3 uppercase tracking-widest">Manual Pot Adjustment (£)</label>
                                <div className="relative rounded-2xl shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                        <span className="text-emerald-600 font-black">£</span>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        defaultValue={(activeLeague.current_pot_pence / 100).toFixed(2)}
                                        onBlur={(e) => handlePotUpdate(Math.round(parseFloat(e.target.value) * 100))}
                                        disabled={!isAdmin}
                                        className="focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-10 pr-4 py-4 sm:text-lg border-emerald-100 rounded-2xl border font-black text-slate-900 shadow-inner bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>
                            <div className="w-full md:w-64">
                                <div className="p-6 bg-emerald-600 rounded-2xl text-white shadow-xl">
                                    <div className="text-[10px] uppercase font-black tracking-widest opacity-60 mb-1">Current Display</div>
                                    <div className="text-3xl font-black">{formatCurrency(activeLeague.current_pot_pence)}</div>
                                </div>
                            </div>
                        </div>
                    </div >

                    {isOwner && (
                        <div className="bg-red-50 rounded-2xl border border-red-100 p-6 lg:col-span-2">
                            <h3 className="text-lg font-black text-red-700 mb-2">Danger Zone</h3>
                            <p className="text-xs text-red-600/80 mb-4">Deleting this league will remove all weeks, picks, and memberships. This action cannot be undone.</p>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="w-full md:w-auto px-5 py-3 bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-700 shadow-sm"
                            >
                                Delete League
                            </button>
                        </div>
                    )}

                    {
                        showDeleteModal && activeLeague && (
                            <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
                                <div className="absolute inset-0 bg-black/30" onClick={() => setShowDeleteModal(false)}></div>
                                <div className="relative bg-white rounded-t-3xl md:rounded-3xl border border-slate-200 p-6 w-full max-w-md shadow-2xl mx-0 md:mx-4 max-h-[85vh] overflow-auto">
                                    <h4 className="text-xl font-black text-slate-900 mb-2">Delete League Permanently</h4>
                                    <p className="text-xs text-slate-500 mb-4">Type <span className="font-bold text-slate-800">{activeLeague.name}</span> to confirm deletion.</p>
                                    <input
                                        type="text"
                                        value={deleteConfirm}
                                        onChange={(e) => setDeleteConfirm(e.target.value)}
                                        className="w-full p-3 border border-slate-200 rounded-2xl focus:ring-emerald-500 focus:border-emerald-500 font-bold text-slate-700 mb-4"
                                        placeholder={activeLeague.name}
                                    />
                                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                                        <button
                                            onClick={() => setShowDeleteModal(false)}
                                            className="w-full sm:w-auto px-4 py-3 sm:py-2 text-xs font-black text-slate-500 hover:text-slate-700"
                                            disabled={isDeleting}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleDeleteLeague}
                                            disabled={deleteConfirm !== activeLeague.name || isDeleting}
                                            className={`w-full sm:w-auto px-4 py-3 sm:py-2 rounded-2xl text-xs font-black uppercase tracking-widest ${deleteConfirm === activeLeague.name && !isDeleting ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-100 text-red-400 cursor-not-allowed'}`}
                                        >
                                            {isDeleting ? 'Deleting…' : 'Delete Permanently'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </div >
            </ErrorBoundary >
        );
    }

    // GLOBAL VIEW: League List and Creation (unchanged)
    return (
        <ErrorBoundary>
            <div className="space-y-10 animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Admin Console</h1>
                        <p className="text-slate-500 mt-2">Oversee your football syndicates and member activity.</p>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <button
                            onClick={() => setIsCreating(true)}
                            className="w-full md:w-auto flex items-center justify-center bg-emerald-600 text-white px-6 py-4 md:py-3 rounded-2xl hover:bg-emerald-700 transition-all shadow-xl font-black"
                        >
                            <PlusCircle className="h-5 w-5 mr-2" />
                            New Syndicate
                        </button>
                    </div>
                </div>

                {isCreating && (
                    <div className="relative bg-white rounded-3xl shadow-2xl border border-emerald-100 p-5 md:p-10 animate-in slide-in-from-top-8 duration-500">
                        <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center">
                            <PlusCircle className="h-8 w-8 text-emerald-600 mr-3" />
                            Setup New Syndicate League
                        </h2>
                        {createError && (
                            <div className="mb-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl px-4 py-3 text-sm font-bold">{createError}</div>
                        )}
                        <form onSubmit={handleCreateLeague} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">League Brand Name</label>
                                <input
                                    required
                                    type="text"
                                    value={newLeague.name}
                                    onChange={(e) => setNewLeague({ ...newLeague, name: e.target.value })}
                                    disabled={isLaunching}
                                    className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-emerald-500 focus:border-emerald-500 font-bold text-lg disabled:opacity-50"
                                    placeholder="e.g. South Wales Elite"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">Max Capacity</label>
                                <input
                                    required
                                    type="number"
                                    value={newLeague.maxPlayers}
                                    onChange={(e) => setNewLeague({ ...newLeague, maxPlayers: parseInt(e.target.value) })}
                                    disabled={isLaunching}
                                    className="w-full p-4 border border-slate-200 rounded-2xl disabled:opacity-50"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">Fee (£)</label>
                                    <input
                                        required
                                        type="number"
                                        value={newLeague.weeklyFee}
                                        onChange={(e) => setNewLeague({ ...newLeague, weeklyFee: parseInt(e.target.value) })}
                                        disabled={isLaunching}
                                        className="w-full p-4 border border-slate-200 rounded-2xl disabled:opacity-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">Pot (£)</label>
                                    <input
                                        required
                                        type="number"
                                        value={newLeague.potDeduction}
                                        onChange={(e) => setNewLeague({ ...newLeague, potDeduction: parseInt(e.target.value) })}
                                        disabled={isLaunching}
                                        className="w-full p-4 border border-slate-200 rounded-2xl disabled:opacity-50"
                                    />
                                </div>
                            </div>
                            <div className="bg-emerald-900 p-6 md:p-8 rounded-3xl border border-emerald-800 md:col-span-2 flex flex-col gap-6 md:flex-row md:items-center md:justify-between text-white shadow-2xl">
                                <div>
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Calculated Weekly Bet Stake</span>
                                    <p className="text-4xl font-black">£{newLeague.weeklyFee - newLeague.potDeduction}.00</p>
                                </div>
                                <div className="flex flex-col gap-3 w-full md:w-auto md:flex-row md:gap-4">
                                    <button type="button" onClick={() => setIsCreating(false)} disabled={isLaunching} className="w-full md:w-auto px-6 py-3 rounded-xl font-bold text-emerald-300 hover:text-white transition-colors disabled:opacity-50">Cancel</button>
                                    <button type="submit" disabled={isLaunching} className="w-full md:w-auto bg-emerald-500 text-white px-10 py-3 rounded-xl font-black hover:bg-emerald-400 shadow-lg shadow-emerald-950/20 transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                                        {isLaunching && <span className="h-4 w-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin"></span>}
                                        {isLaunching ? 'Launching…' : 'Launch Syndicate'}
                                    </button>
                                </div>
                            </div>
                        </form>
                        {isLaunching && (
                            <div className="absolute inset-0 bg-white/60 rounded-3xl flex items-center justify-center">
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-xl px-4 py-3 text-sm font-black text-slate-700 flex items-center gap-3">
                                    <span className="h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
                                    Launching Syndicate…
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {leagues.map((league) => {
                        const approvedCount = members.filter(m => m.league_id === league.id && m.status === 'approved').length;
                        const pendingCount = members.filter(m => m.league_id === league.id && m.status === 'pending').length;

                        return (
                            <div key={league.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 flex flex-col justify-between hover:shadow-xl transition-all group hover:-translate-y-1">
                                <div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-emerald-50 transition-colors">
                                            <LayoutDashboard className="h-7 w-7 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                                        </div>
                                        {pendingCount > 0 && (
                                            <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full animate-pulse shadow-lg shadow-blue-200">
                                                {pendingCount} NEW
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 mb-1">{league.name}</h3>
                                    <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest mb-6 break-all">SYNDICATE ID: {league.id}</p>

                                    <div className="space-y-4 mb-8">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-400">Total Players</span>
                                            <span className="font-black text-slate-900 text-sm">{approvedCount} / {league.max_players}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-400">Bet Amount</span>
                                            <span className="font-black text-indigo-600 text-sm">{formatCurrency(league.weekly_fee_pence - league.pot_deduction_pence)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-400">Pot Builder</span>
                                            <span className="font-black text-emerald-600 text-sm">{formatCurrency(league.pot_deduction_pence)}</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setActiveLeagueId(league.id)}
                                    className="w-full flex items-center justify-center bg-slate-900 text-white font-black py-4 px-6 rounded-2xl hover:bg-emerald-600 transition-all shadow-lg"
                                >
                                    Manage League
                                    <ArrowRight className="h-5 w-5 ml-2" />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* System Danger Zone */}
                <div className="mt-20 border-t-2 border-red-100 pt-10">
                    <h3 className="text-xl font-black text-red-900 mb-4 flex items-center">
                        <span className="bg-red-100 p-2 rounded-lg mr-3">⚠️</span>
                        System Danger Zone
                    </h3>
                    <div className="bg-red-50 border-2 border-red-100 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h4 className="font-black text-red-800 text-lg">Global League Wipe</h4>
                            <p className="text-red-600/80 text-sm font-bold mt-1">
                                Delete EVERY league, pick, and week in the database.
                                <br />
                                <span className="underline">Users will NOT be deleted.</span>
                            </p>
                        </div>
                        <button
                            onClick={() => setShowGlobalResetModal(true)}
                            className="bg-white border-2 border-red-200 text-red-600 px-6 py-3 rounded-xl font-black hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-lg"
                        >
                            INITIATE WIPE
                        </button>
                    </div>
                </div>

                {/* Global Wipe Modal */}
                {showGlobalResetModal && (
                    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="bg-red-600 p-6 text-white text-center">
                                <h3 className="text-2xl font-black uppercase tracking-widest">Nuclear Option</h3>
                                <p className="font-bold opacity-90 mt-2">Global System Wipe</p>
                            </div>
                            <div className="p-8">
                                <p className="text-slate-600 font-bold mb-6 text-center">
                                    This will delete <span className="text-red-600 font-black">ALL LEAGUES</span> and associated data for ALL USERS.
                                    <br /><br />
                                    This action is <span className="underline">irreversible</span>.
                                </p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 mb-2 uppercase">Type "CONFIRM WIPE"</label>
                                        <input
                                            type="text"
                                            value={globalResetConfirm}
                                            onChange={(e) => setGlobalResetConfirm(e.target.value)}
                                            className="w-full p-4 border-2 border-red-100 rounded-2xl font-black text-red-600 focus:outline-none focus:border-red-500 text-center uppercase"
                                            placeholder="CONFIRM WIPE"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-4">
                                        <button
                                            onClick={() => setShowGlobalResetModal(false)}
                                            className="py-4 rounded-xl font-black text-slate-500 hover:bg-slate-50 transition-colors"
                                        >
                                            CANCEL
                                        </button>
                                        <button
                                            onClick={handleGlobalReset}
                                            disabled={globalResetConfirm !== 'CONFIRM WIPE' || isGlobalResetting}
                                            className="bg-red-600 text-white py-4 rounded-xl font-black hover:bg-red-700 transition-colors shadow-xl shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {isGlobalResetting ? (
                                                <>
                                                    <span className="h-4 w-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin"></span>
                                                    WIPING...
                                                </>
                                            ) : (
                                                'NUKE IT ALL'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
};