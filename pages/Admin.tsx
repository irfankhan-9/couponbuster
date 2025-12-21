import React, { useState } from 'react';
import { MOCK_LEAGUES, MOCK_MEMBERS, MOCK_USERS, MOCK_WEEKS, CURRENT_USER_ID } from '../constants';
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
  Lock
} from 'lucide-react';
import { formatCurrency } from '../utils/scoring';
import { League, Week } from '../types';
import { getInitialDraftOrder, rotateWeeklyOrder } from '../utils/draftLogic';

export const AdminPanel: React.FC = () => {
  const [leagues, setLeagues] = useState<League[]>(MOCK_LEAGUES);
  const [members, setMembers] = useState(MOCK_MEMBERS);
  const [weeks, setWeeks] = useState<Week[]>(MOCK_WEEKS);
  const [activeLeagueId, setActiveLeagueId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Creation State
  const [newLeague, setNewLeague] = useState({
    name: '',
    maxPlayers: 20,
    weeklyFee: 20,
    potDeduction: 2
  });

  const activeLeague = leagues.find(l => l.id === activeLeagueId);
  const activeLeagueWeeks = weeks.filter(w => w.league_id === activeLeagueId);
  const currentOpenWeek = activeLeagueWeeks.find(w => w.status === 'open') || activeLeagueWeeks[activeLeagueWeeks.length - 1];
  
  // Handlers for Global List
  const handleCreateLeague = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `l${MOCK_LEAGUES.length + 1}`;
    const createdLeague: League = {
      id,
      name: newLeague.name,
      owner_id: CURRENT_USER_ID,
      privacy: 'private',
      weekly_fee_pence: newLeague.weeklyFee * 100,
      pot_deduction_pence: newLeague.potDeduction * 100,
      current_pot_pence: 0,
      max_players: newLeague.maxPlayers,
      start_date: new Date().toISOString().split('T')[0],
      pick_deadline_day: 5, // Default to Friday
      pick_deadline_hour: 23, // Default to 11 PM
      enable_automatic_deadlines: true // Default to true
    };
    
    // 1. Create the League
    MOCK_LEAGUES.push(createdLeague);

    // 2. Initialize Week 1 for the new league
    const weekOne: Week = {
      id: `w-new-${id}-1`,
      league_id: id,
      week_number: 1,
      status: 'open',
      deadline_at: new Date(Date.now() + 86400000 * 5).toISOString(),
      pick_order: [], // Empty initially
      current_turn_user_id: null,
      draft_round: 1,
      draft_status: 'upcoming'
    };
    MOCK_WEEKS.push(weekOne);

    setLeagues([...MOCK_LEAGUES]);
    setWeeks([...MOCK_WEEKS]);
    setMembers([...MOCK_MEMBERS]);
    setIsCreating(false);
    setNewLeague({ name: '', maxPlayers: 20, weeklyFee: 20, potDeduction: 2 });
    alert(`${createdLeague.name} created! Remember to go to the Leagues page to join it yourself as a player.`);
  };

  const handleDeadlineUpdate = (newDay: number, newHour: number) => {
    if (!activeLeagueId) return;
    const lIdx = MOCK_LEAGUES.findIndex(l => l.id === activeLeagueId);
    if (lIdx !== -1) {
        MOCK_LEAGUES[lIdx].pick_deadline_day = newDay;
        MOCK_LEAGUES[lIdx].pick_deadline_hour = newHour;
        setLeagues([...MOCK_LEAGUES]);
    }
  };

  const handleManualOverride = (enabled: boolean) => {
    if (!activeLeagueId) return;
    const lIdx = MOCK_LEAGUES.findIndex(l => l.id === activeLeagueId);
    if (lIdx !== -1) {
        MOCK_LEAGUES[lIdx].enable_automatic_deadlines = enabled;
        setLeagues([...MOCK_LEAGUES]);
    }
  };

  const handleApprove = (memberId: string) => {
    const mIdx = MOCK_MEMBERS.findIndex(m => m.id === memberId);
    if (mIdx !== -1) {
        MOCK_MEMBERS[mIdx].status = 'approved';
        
        // --- WEEK 1 FIRST-IN-FIRST-PICK LOGIC ---
        // If this is the first week, we must update the pick_order to include this new user.
        // We sort by 'joined_at' to maintain the "First In" rule.
        const leagueId = MOCK_MEMBERS[mIdx].league_id;
        const week1 = MOCK_WEEKS.find(w => w.league_id === leagueId && w.week_number === 1);
        
        if (week1 && (week1.draft_status === 'upcoming' || week1.draft_status === 'active')) {
             const leagueMembers = MOCK_MEMBERS.filter(m => m.league_id === leagueId);
             const newOrder = getInitialDraftOrder(leagueMembers);
             week1.pick_order = newOrder;
             
             // If the draft hasn't started or no one is picking, set the first person
             if (!week1.current_turn_user_id && newOrder.length > 0) {
                 week1.current_turn_user_id = newOrder[0];
                 week1.draft_status = 'active'; // Activate draft if we have people
             }
        }
        // ----------------------------------------

        setMembers([...MOCK_MEMBERS]);
        setWeeks([...MOCK_WEEKS]);
    }
  };

  const handleReject = (memberId: string) => {
    const mIdx = MOCK_MEMBERS.findIndex(m => m.id === memberId);
    if (mIdx !== -1) {
        MOCK_MEMBERS.splice(mIdx, 1);
        setMembers([...MOCK_MEMBERS]);
    }
  };

  const handlePointChange = (memberId: string, delta: number) => {
    const mIdx = MOCK_MEMBERS.findIndex(m => m.id === memberId);
    if (mIdx !== -1) {
        MOCK_MEMBERS[mIdx].points = Math.max(0, MOCK_MEMBERS[mIdx].points + delta);
        setMembers([...MOCK_MEMBERS]);
    }
  };

  const handlePotUpdate = (newPotPence: number) => {
    if (!activeLeagueId) return;
    const lIdx = MOCK_LEAGUES.findIndex(l => l.id === activeLeagueId);
    if (lIdx !== -1) {
        MOCK_LEAGUES[lIdx].current_pot_pence = newPotPence;
        setLeagues([...MOCK_LEAGUES]);
    }
  };

  const handleGenerateNextWeek = () => {
    if (!activeLeagueId || !currentOpenWeek) return;
    
    // Close current week
    currentOpenWeek.status = 'closed';
    currentOpenWeek.draft_status = 'completed';

    // Create next week
    const nextWeekNum = currentOpenWeek.week_number + 1;
    
    // --- ROTATION LOGIC ---
    // User 1 becomes Last. User 2 becomes 1st.
    const newOrder = rotateWeeklyOrder(currentOpenWeek.pick_order);
    // ----------------------

    const nextWeek: Week = {
        id: `w-${activeLeagueId}-${nextWeekNum}`,
        league_id: activeLeagueId,
        week_number: nextWeekNum,
        status: 'open',
        deadline_at: new Date(Date.now() + 86400000 * 7).toISOString(),
        pick_order: newOrder,
        current_turn_user_id: newOrder.length > 0 ? newOrder[0] : null,
        draft_round: 1,
        draft_status: 'active'
    };

    MOCK_WEEKS.push(nextWeek);
    setWeeks([...MOCK_WEEKS]);
    alert(`Week ${nextWeekNum} generated! Pick order has been rotated.`);
  };

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hoursOfDay = Array.from({length: 24}, (_, i) => i);

  // Handlers for Specific League Management
  const leagueMembers = members.filter(m => m.league_id === activeLeagueId);
  const approvedMembers = leagueMembers.filter(m => m.status === 'approved');
  const pendingRequests = leagueMembers.filter(m => m.status === 'pending');

  // View Switching
  if (activeLeagueId && activeLeague) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
            <button 
                onClick={() => setActiveLeagueId(null)}
                className="flex items-center text-slate-500 hover:text-emerald-600 font-bold transition-colors group"
            >
                <ChevronLeft className="h-5 w-5 mr-1 transition-transform group-hover:-translate-x-1" />
                Back to Leagues
            </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">{activeLeague.name}</h1>
                    <p className="text-slate-500 text-sm mt-1">League Management Interface</p>
                </div>
                <div className="flex items-center space-x-2 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Join Requests */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <UserCheck className="h-5 w-5 text-blue-600 mr-2" />
                    Pending Requests ({pendingRequests.length})
                </h2>
                {pendingRequests.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 italic text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        No pending requests.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pendingRequests.map(req => {
                            const user = MOCK_USERS.find(u => u.id === req.user_id);
                            return (
                                <div key={req.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center transition-all hover:bg-white hover:shadow-md">
                                    <div>
                                        <p className="font-bold text-slate-900">{user?.display_name}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-tight">Joined: {new Date(req.joined_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleApprove(req.id)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm transition-colors">Approve</button>
                                        <button onClick={() => handleReject(req.id)} className="text-red-500 px-3 py-2 text-xs font-bold hover:bg-red-50 rounded-lg transition-colors">Reject</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Points Overrides */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <Settings className="h-5 w-5 text-amber-500 mr-2" />
                    Points Control
                </h2>
                <div className="overflow-y-auto max-h-80 space-y-2">
                    {approvedMembers.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">No approved members.</p>
                    ) : (
                        approvedMembers.map(member => {
                            const user = MOCK_USERS.find(u => u.id === member.user_id);
                            return (
                                <div key={member.id} className="flex justify-between items-center p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded-lg">
                                    <span className="text-sm font-bold text-slate-700">{user?.display_name}</span>
                                    <div className="flex items-center space-x-4">
                                        <button onClick={() => handlePointChange(member.id, -1)} className="text-slate-300 hover:text-red-500 transition-colors"><MinusCircle className="h-5 w-5"/></button>
                                        <span className="text-lg font-black w-8 text-center text-slate-900">{member.points}</span>
                                        <button onClick={() => handlePointChange(member.id, 1)} className="text-slate-300 hover:text-emerald-500 transition-colors"><PlusCircle className="h-5 w-5"/></button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

             {/* League Schedule Settings */}
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center">
                        <Clock className="h-5 w-5 text-indigo-600 mr-2" />
                        League Schedule Settings
                    </h2>
                    {currentOpenWeek && (
                        <button 
                            onClick={handleGenerateNextWeek}
                            className="flex items-center bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-100 transition-colors border border-indigo-200"
                        >
                            <CalendarPlus className="h-4 w-4 mr-2" />
                            Generate Week {currentOpenWeek.week_number + 1}
                        </button>
                    )}
                </div>

                {/* Automation Override Toggle */}
                <div className="mb-8 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-xl ${activeLeague.enable_automatic_deadlines ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                            {activeLeague.enable_automatic_deadlines ? <Lock className="h-6 w-6" /> : <Unlock className="h-6 w-6" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">
                                {activeLeague.enable_automatic_deadlines ? 'Automated Deadlines Active' : 'Manual Override Active'}
                            </h3>
                            <p className="text-xs text-slate-500 max-w-sm mt-1">
                                {activeLeague.enable_automatic_deadlines 
                                    ? 'System automatically closes the market on deadline.' 
                                    : 'Market is forcibly OPEN indefinitely. Deadlines are ignored.'}
                            </p>
                        </div>
                    </div>
                    <div className="flex bg-white rounded-xl border border-slate-200 p-1">
                        <button 
                            onClick={() => handleManualOverride(true)}
                            className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeLeague.enable_automatic_deadlines ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-emerald-600'}`}
                        >
                            Automated
                        </button>
                        <button 
                            onClick={() => handleManualOverride(false)}
                            className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${!activeLeague.enable_automatic_deadlines ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-amber-600'}`}
                        >
                            Manual Open
                        </button>
                    </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col md:flex-row gap-8 opacity-90">
                    <div className="flex-1">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Weekly Pick Deadline Day</label>
                        <select 
                            value={activeLeague.pick_deadline_day}
                            onChange={(e) => handleDeadlineUpdate(parseInt(e.target.value), activeLeague.pick_deadline_hour)}
                            disabled={!activeLeague.enable_automatic_deadlines}
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
                            disabled={!activeLeague.enable_automatic_deadlines}
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
            </div>

            {/* Financial Overrides */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 lg:col-span-2">
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
                              className="focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-10 pr-4 py-4 sm:text-lg border-emerald-100 rounded-2xl border font-black text-slate-900 shadow-inner bg-white/80"
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
            </div>
        </div>
      </div>
    );
  }

  // GLOBAL VIEW: League List and Creation (unchanged)
  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Admin Console</h1>
          <p className="text-slate-500 mt-2">Oversee your football syndicates and member activity.</p>
        </div>
        <div className="flex gap-4">
            <button 
                onClick={() => setIsCreating(true)}
                className="flex items-center bg-emerald-600 text-white px-6 py-3 rounded-2xl hover:bg-emerald-700 transition-all shadow-xl font-black"
            >
                <PlusCircle className="h-5 w-5 mr-2" />
                New Syndicate
            </button>
        </div>
      </div>

      {isCreating && (
        <div className="bg-white rounded-3xl shadow-2xl border border-emerald-100 p-10 animate-in slide-in-from-top-8 duration-500">
            <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center">
                <PlusCircle className="h-8 w-8 text-emerald-600 mr-3" />
                Setup New Syndicate League
            </h2>
            <form onSubmit={handleCreateLeague} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">League Brand Name</label>
                    <input 
                        required
                        type="text"
                        value={newLeague.name}
                        onChange={(e) => setNewLeague({...newLeague, name: e.target.value})}
                        className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-emerald-500 focus:border-emerald-500 font-bold text-lg"
                        placeholder="e.g. South Wales Elite"
                    />
                </div>
                <div>
                    <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">Max Capacity</label>
                    <input 
                        required
                        type="number"
                        value={newLeague.maxPlayers}
                        onChange={(e) => setNewLeague({...newLeague, maxPlayers: parseInt(e.target.value)})}
                        className="w-full p-4 border border-slate-200 rounded-2xl"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">Fee (£)</label>
                        <input 
                            required
                            type="number"
                            value={newLeague.weeklyFee}
                            onChange={(e) => setNewLeague({...newLeague, weeklyFee: parseInt(e.target.value)})}
                            className="w-full p-4 border border-slate-200 rounded-2xl"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">Pot (£)</label>
                        <input 
                            required
                            type="number"
                            value={newLeague.potDeduction}
                            onChange={(e) => setNewLeague({...newLeague, potDeduction: parseInt(e.target.value)})}
                            className="w-full p-4 border border-slate-200 rounded-2xl"
                        />
                    </div>
                </div>
                <div className="bg-emerald-900 p-8 rounded-3xl border border-emerald-800 md:col-span-2 flex items-center justify-between text-white shadow-2xl">
                    <div>
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Calculated Weekly Bet Stake</span>
                        <p className="text-4xl font-black">£{newLeague.weeklyFee - newLeague.potDeduction}.00</p>
                    </div>
                    <div className="flex gap-4">
                        <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-3 rounded-xl font-bold text-emerald-300 hover:text-white transition-colors">Cancel</button>
                        <button type="submit" className="bg-emerald-500 text-white px-10 py-3 rounded-xl font-black hover:bg-emerald-400 shadow-lg shadow-emerald-950/20 transition-all transform active:scale-95">Launch Syndicate</button>
                    </div>
                </div>
            </form>
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
                <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest mb-6">SYNDICATE ID: {league.id}</p>
                
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
    </div>
  );
};