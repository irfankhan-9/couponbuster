import React, { useState, useEffect } from 'react';
import { TEAMS, LEAGUES } from '../constants';
import { Week, Pick, LeagueMember, User } from '../types';
import { getAvailableTeams } from '../utils/draftLogic';
import { Star, ShieldCheck, Clock, User as UserIcon, Lock, CheckCircle, RefreshCcw, Trophy, ArrowUpCircle } from 'lucide-react';
import { UserNameWithTitle } from './UserNameWithTitle';

interface DraftRoomProps {
    week: Week;
    leagueMembers: LeagueMember[];
    users: User[];
    currentPicks: Pick[];
    currentUser: User;
    onPickSubmit: (teamId: string) => Promise<void>;
}

export const DraftRoom: React.FC<DraftRoomProps> = ({
    week,
    leagueMembers,
    users,
    currentPicks,
    currentUser,
    onPickSubmit
}) => {
    const [selectedTeam, setSelectedTeam] = useState<string>('');
    const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Derive State
    const isMyTurn = week.current_turn_user_id === currentUser.id;
    const currentRound = week.draft_round;

    // 1. Filter Leagues based on round
    const excludedRoundTwoLeagueIds = new Set([
        'greek',
        'swiss',
        'austrian',
        'danish',
        'norwegian',
        'swedish',
        'czech',
        'croatian',
        'polish'
    ]);
    const allowedLeagues = LEAGUES.filter(l => {
        if (currentRound === 1) return l.type === 'banker';
        if (currentRound === 2 && excludedRoundTwoLeagueIds.has(l.id)) return false;
        return true; // All 13 for Cover
    });

    // 2. Default selected league if none set or not allowed in current round
    useEffect(() => {
        if (!selectedLeagueId || !allowedLeagues.find(l => l.id === selectedLeagueId)) {
            setSelectedLeagueId(allowedLeagues[0]?.id || '');
        }
    }, [currentRound, allowedLeagues, selectedLeagueId]);

    // 3. Filter Teams based on availability AND selected league
    const allAvailableTeams = getAvailableTeams(TEAMS, currentPicks, week.id);
    const availableTeams = allAvailableTeams.filter(t => t.league_id === selectedLeagueId);

    // Find current picker details
    const currentPicker = users.find(u => u.id === week.current_turn_user_id);

    // Auto-refresh simulation (in a real app, this would be WebSocket driven)
    useEffect(() => {
        // This is just to simulate "Live" feeling in the demo UI
        if (!isMyTurn) {
            const interval = setInterval(() => {
                // console.log("Polling for turn change..."); 
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [isMyTurn]);

    const handleSubmit = async () => {
        if (!selectedTeam) return;

        setIsSubmitting(true);
        try {
            await onPickSubmit(selectedTeam);
            setSelectedTeam('');
        } catch (error) {
            console.error("Submission error caught in UI", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper to get member status for the ticker
    const getMemberStatus = (userId: string) => {
        const userPick = currentPicks.find(p => p.week_id === week.id && p.user_id === userId);
        const hasPickedRound1 = !!userPick?.pick1_team_id;
        const hasPickedRound2 = !!userPick?.pick2_team_id;

        if (currentRound === 1) return hasPickedRound1 ? 'done' : 'waiting';
        if (currentRound === 2) return hasPickedRound2 ? 'done' : 'waiting';
        return 'waiting';
    };

    if (week.draft_status === 'completed') {
        return (
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-10 text-center animate-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-10 w-10 text-emerald-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Draft Completed</h2>
                <p className="text-slate-500 mb-8">All picks for Week {week.week_number} are locked in.</p>

                <div className="grid gap-4 max-w-2xl mx-auto">
                    {week.pick_order.map(userId => {
                        const user = users.find(u => u.id === userId);
                        const pick = currentPicks.find(p => p.week_id === week.id && p.user_id === userId);
                        const team1 = TEAMS.find(t => t.id === pick?.pick1_team_id);
                        const team2 = TEAMS.find(t => t.id === pick?.pick2_team_id);

                        return (
                            <div key={userId} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <UserNameWithTitle
                                    userId={userId}
                                    name={user?.display_name}
                                    nameClassName="font-bold text-slate-700"
                                />
                                <div className="flex space-x-3">
                                    {team1 && <span className="px-3 py-1 bg-white border border-yellow-200 text-yellow-700 rounded-lg text-xs font-black shadow-sm flex items-center"><Star className="h-3 w-3 mr-1" fill="currentColor" /> {team1.name}</span>}
                                    {team2 && <span className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-black shadow-sm flex items-center"><ShieldCheck className="h-3 w-3 mr-1" /> {team2.name}</span>}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* 1. The Draft Header & Round Indicator */}
            <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden transition-all duration-500">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Trophy className="h-32 w-32" /></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center">
                    <div>
                        <div className="inline-flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2 border border-white/20">
                            <div className={`w-2 h-2 rounded-full ${currentRound === 1 ? 'bg-yellow-400' : 'bg-emerald-400'} animate-pulse`}></div>
                            <span>Live Draft Room</span>
                        </div>
                        <h2 className="text-3xl font-black italic tracking-tight">
                            {currentRound === 1 ? "Round 1: The Banker" : "Round 2: The Cover"}
                        </h2>
                        <p className="text-slate-400 text-sm mt-1 max-w-md">
                            {currentRound === 1 ? "Select your primary team. Counts for points & real money." : "Select your insurance team. Counts for league points only."}
                        </p>
                    </div>

                    {/* Progress Counter */}
                    <div className="mt-6 md:mt-0 text-right">
                        <div className="text-4xl font-black text-white/90">
                            {week.pick_order.indexOf(week.current_turn_user_id || '') + 1} <span className="text-2xl text-slate-500">/ {week.pick_order.length}</span>
                        </div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Current Pick</div>
                    </div>
                </div>
            </div>

            {/* 2. The Ticker (Turn Order) */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 overflow-x-auto no-scrollbar">
                <div className="flex space-x-6 min-w-max px-2">
                    {week.pick_order.map((userId, index) => {
                        const userProfile = users.find(u => u.id === userId);
                        const isCurrent = userId === week.current_turn_user_id;
                        const pick = currentPicks.find(p => p.week_id === week.id && p.user_id === userId);

                        let pickedTeam = null;
                        if (currentRound === 1 && pick?.pick1_team_id) pickedTeam = TEAMS.find(t => t.id === pick.pick1_team_id);
                        if (currentRound === 2 && pick?.pick2_team_id) pickedTeam = TEAMS.find(t => t.id === pick.pick2_team_id);

                        return (
                            <div
                                key={userId}
                                className={`
                            relative flex flex-col items-center justify-center transition-all duration-500
                            ${isCurrent ? 'scale-110' : 'scale-90 opacity-40'}
                        `}
                            >
                                {isCurrent && (
                                    <div className="absolute -top-1 -right-1 z-20">
                                        <span className="flex h-4 w-4">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
                                        </span>
                                    </div>
                                )}

                                <div className={`
                            w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 relative overflow-hidden
                            ${isCurrent ? 'border-emerald-500 bg-emerald-50 shadow-lg' : 'border-slate-100 bg-slate-50'}
                          `}>
                                    {pickedTeam ? (
                                        <div className="text-center animate-in zoom-in-50 duration-500">
                                            <div className="text-2xl">✅</div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <UserIcon className={`h-6 w-6 ${isCurrent ? 'text-emerald-600' : 'text-slate-300'}`} />
                                        </div>
                                    )}
                                </div>

                                <div className="mt-2 text-center overflow-hidden">
                                    <p className={`text-[10px] font-black uppercase tracking-tight truncate w-20 ${isCurrent ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {userProfile?.display_name.split(' ')[0]}
                                    </p>
                                    {pickedTeam && (
                                        <p className="text-[8px] font-bold text-slate-400 truncate w-20 leading-none">{pickedTeam.name}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 3. The Action Zone */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 relative overflow-hidden">
                {isMyTurn ? (
                    <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
                        <div className="flex items-center space-x-4 mb-8">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center animate-pulse">
                                <UserIcon className="h-8 w-8 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900">It's Your Turn!</h3>
                                <p className="text-slate-500">Please select a unique team from the list below.</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            {/* Visual League Selection Toggle */}
                            <div className="space-y-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Select Competition</span>

                                {/* Mobile: Horizontal Scroll Pills */}
                                <div className="md:hidden flex space-x-2 overflow-x-auto no-scrollbar pb-2 px-1">
                                    {allowedLeagues.map(league => (
                                        <button
                                            key={league.id}
                                            onClick={() => { setSelectedLeagueId(league.id); setSelectedTeam(''); }}
                                            className={`
                                                flex-shrink-0 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all duration-300
                                                ${selectedLeagueId === league.id
                                                    ? 'bg-emerald-900 border-emerald-900 text-white shadow-lg shadow-emerald-900/20'
                                                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}
                                            `}
                                        >
                                            {league.name}
                                        </button>
                                    ))}
                                </div>

                                {/* Desktop: Card Grid */}
                                <div className="hidden md:grid grid-cols-3 lg:grid-cols-5 gap-3">
                                    {allowedLeagues.map(league => (
                                        <button
                                            key={league.id}
                                            onClick={() => { setSelectedLeagueId(league.id); setSelectedTeam(''); }}
                                            className={`
                                                p-4 rounded-2xl border-2 transition-all duration-300 text-left relative overflow-hidden group
                                                ${selectedLeagueId === league.id
                                                    ? 'border-emerald-600 bg-emerald-50 shadow-md'
                                                    : 'border-slate-100 bg-white hover:border-slate-200'}
                                            `}
                                        >
                                            <div className="relative z-10">
                                                <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${selectedLeagueId === league.id ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    {league.country}
                                                </p>
                                                <p className={`text-xs font-black leading-tight ${selectedLeagueId === league.id ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}`}>
                                                    {league.name}
                                                </p>
                                            </div>
                                            {selectedLeagueId === league.id && (
                                                <div className="absolute top-0 right-0 p-2">
                                                    <div className="h-2 w-2 bg-emerald-600 rounded-full animate-pulse"></div>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Select Team</span>
                                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{availableTeams.length} Available</span>
                                </div>

                                {/* Mobile Team Grid */}
                                <div className="md:hidden grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                                    {availableTeams.length > 0 ? (
                                        availableTeams.map(team => (
                                            <button
                                                key={team.id}
                                                onClick={() => setSelectedTeam(team.id)}
                                                className={`
                                                    flex flex-col items-center justify-center p-4 rounded-[2rem] border-2 transition-all duration-300
                                                    ${selectedTeam === team.id ? 'border-emerald-600 bg-emerald-50 shadow-md scale-[0.98]' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}
                                                `}
                                            >
                                                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center mb-2 shadow-sm border border-slate-100">
                                                    <ShieldCheck className={`h-5 w-5 ${selectedTeam === team.id ? 'text-emerald-600' : 'text-slate-300'}`} />
                                                </div>
                                                <span className="text-[11px] font-black text-slate-900 leading-tight text-center">{team.name}</span>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="col-span-2 py-8 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Teams Left in this League</p>
                                        </div>
                                    )}
                                </div>

                                {/* Desktop View for Teams */}
                                <div className="hidden md:grid grid-cols-4 lg:grid-cols-6 gap-3">
                                    {availableTeams.length > 0 ? (
                                        availableTeams.map(team => (
                                            <button
                                                key={team.id}
                                                onClick={() => setSelectedTeam(team.id)}
                                                className={`
                                                    flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all duration-300
                                                    ${selectedTeam === team.id ? 'border-emerald-600 bg-emerald-50 shadow-md scale-[0.95]' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}
                                                `}
                                            >
                                                <ShieldCheck className={`h-6 w-6 mb-2 ${selectedTeam === team.id ? 'text-emerald-600' : 'text-slate-300'}`} />
                                                <span className="text-[10px] font-black text-slate-900 text-center leading-none">{team.name}</span>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="col-span-4 lg:col-span-6 py-10 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">League Fully Drafted</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 max-w-xl">
                                <button
                                    onClick={handleSubmit}
                                    disabled={!selectedTeam || isSubmitting}
                                    className={`
                                w-full py-5 rounded-2xl text-white font-black text-sm uppercase tracking-widest transition-all transform active:scale-95 flex items-center justify-center gap-3
                                ${isSubmitting || !selectedTeam ? 'bg-slate-200 cursor-not-allowed text-slate-400' : 'bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20'}
                            `}
                                >
                                    {isSubmitting ? (
                                        <RefreshCcw className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            <span>Lock In {currentRound === 1 ? 'Banker' : 'Cover'} Pick</span>
                                            <ArrowUpCircle className="h-5 w-5" />
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest mt-4">Picks cannot be reversed once locked</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 animate-in fade-in duration-700">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                            <div className="absolute inset-0 border-4 border-slate-100 rounded-full border-t-emerald-500 animate-spin"></div>
                            <Clock className="h-10 w-10 text-slate-300" />
                        </div>
                        {currentPicker ? (
                            <>
                                <h3 className="text-2xl font-black text-slate-900 mb-2 inline-flex items-center gap-1.5 justify-center">
                                    Waiting for <UserNameWithTitle
                                        userId={currentPicker.id}
                                        name={currentPicker.display_name}
                                        nameClassName="font-black text-slate-900"
                                    />
                                </h3>
                                <p className="text-slate-400 max-w-md mx-auto mb-6">
                                    The draft is currently in progress.
                                    {week.draft_round === 2 && " We are in Round 2 (Cover Picks)."}
                                </p>
                            </>
                        ) : week.draft_status === 'upcoming' ? (
                            <>
                                <div className="text-3xl mb-4">⏳</div>
                                <h3 className="text-2xl font-black text-slate-900 mb-2">Draft Pending</h3>
                                <p className="text-slate-400 max-w-md mx-auto mb-6">
                                    The draft order is being finalized. <br />
                                    <span className="font-bold text-indigo-600">Waiting for Admin to start the draft...</span>
                                </p>
                            </>
                        ) : week.draft_status === 'paused' ? (
                            <>
                                <h3 className="text-2xl font-black text-slate-900 mb-2">Round {currentRound} Complete</h3>
                                <p className="text-slate-400 max-w-md mx-auto mb-6">
                                    All picks for this round are saved. <br />
                                    <span className="font-bold text-emerald-600">Waiting for Admin to start Round {currentRound + 1}...</span>
                                </p>
                            </>
                        ) : (
                            // Fallback: draft_status is 'active' but no picker is currently
                            // resolvable. This usually means the pick_order has a user id
                            // that doesn't exist in the loaded users list, or the week
                            // is mid-transition. Show a neutral waiting message rather
                            // than falsely announcing that the round is complete.
                            <>
                                <h3 className="text-2xl font-black text-slate-900 mb-2">Draft In Progress</h3>
                                <p className="text-slate-400 max-w-md mx-auto mb-6">
                                    Waiting for the next player to make their pick. <br />
                                    <span className="font-bold text-indigo-600">If this persists, ask the admin to advance the turn.</span>
                                </p>
                            </>
                        )}

                        {/* Round Status Indicator for Waiting Users */}
                        <div className="inline-flex items-center space-x-2 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
                            <div className={`w-3 h-3 rounded-full ${week.draft_round === 1 ? 'bg-yellow-400' : 'bg-emerald-400'} animate-pulse`}></div>
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                                Currently: {week.draft_round === 1 ? 'Round 1 (Banker)' : 'Round 2 (Cover)'}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};