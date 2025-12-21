import React, { useState, useEffect } from 'react';
import { TEAMS } from '../constants';
import { Week, Pick, LeagueMember, User } from '../types';
import { getAvailableTeams } from '../utils/draftLogic';
import { Star, ShieldCheck, Clock, User as UserIcon, Lock, CheckCircle, RefreshCcw, Trophy, ArrowUpCircle } from 'lucide-react';

interface DraftRoomProps {
  week: Week;
  leagueMembers: LeagueMember[];
  users: User[];
  currentPicks: Pick[];
  currentUser: User;
  onPickSubmit: (teamId: string) => void;
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive State
  const isMyTurn = week.current_turn_user_id === currentUser.id;
  const currentRound = week.draft_round;
  const availableTeams = getAvailableTeams(TEAMS, currentPicks, week.id);
  
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

  const handleSubmit = () => {
    if (!selectedTeam) return;
    setIsSubmitting(true);
    // Simulate API
    setTimeout(() => {
        onPickSubmit(selectedTeam);
        setSelectedTeam('');
        setIsSubmitting(false);
    }, 800);
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
                              <span className="font-bold text-slate-700">{user?.display_name}</span>
                              <div className="flex space-x-3">
                                  {team1 && <span className="px-3 py-1 bg-white border border-yellow-200 text-yellow-700 rounded-lg text-xs font-black shadow-sm flex items-center"><Star className="h-3 w-3 mr-1" fill="currentColor"/> {team1.name}</span>}
                                  {team2 && <span className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-black shadow-sm flex items-center"><ShieldCheck className="h-3 w-3 mr-1"/> {team2.name}</span>}
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
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 overflow-x-auto">
          <div className="flex space-x-4 min-w-max">
              {week.pick_order.map((userId, index) => {
                  const user = users.find(u => u.id === userId);
                  const isCurrent = userId === week.current_turn_user_id;
                  const status = getMemberStatus(userId); // 'done', 'waiting'
                  const pick = currentPicks.find(p => p.week_id === week.id && p.user_id === userId);
                  
                  // Determine which team to show based on round completion
                  let pickedTeam = null;
                  if (currentRound === 1 && pick?.pick1_team_id) pickedTeam = TEAMS.find(t => t.id === pick.pick1_team_id);
                  if (currentRound === 2 && pick?.pick2_team_id) pickedTeam = TEAMS.find(t => t.id === pick.pick2_team_id);

                  return (
                      <div 
                        key={userId} 
                        className={`
                            relative flex flex-col items-center justify-center w-28 h-28 rounded-xl border-2 transition-all duration-300
                            ${isCurrent ? 'border-emerald-500 bg-emerald-50 shadow-lg scale-105 z-10' : 'border-slate-100 bg-slate-50 opacity-60 grayscale'}
                        `}
                      >
                          {isCurrent && <div className="absolute -top-3 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full">Picking</div>}
                          
                          {pickedTeam ? (
                              <div className="text-center animate-in zoom-in-50 duration-300">
                                  <div className="text-2xl mb-1">✅</div>
                                  <div className="text-[10px] font-bold text-slate-900 leading-tight px-1">{pickedTeam.name}</div>
                              </div>
                          ) : (
                              <div className="flex flex-col items-center">
                                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center mb-2 font-black text-slate-400 text-xs">
                                      {index + 1}
                                  </div>
                                  <div className="text-xs font-bold text-slate-700 truncate w-full text-center px-2">{user?.display_name.split(' ')[0]}</div>
                              </div>
                          )}
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

                  <div className="space-y-6 max-w-xl">
                      <div className="relative">
                          <select 
                            value={selectedTeam}
                            onChange={(e) => setSelectedTeam(e.target.value)}
                            className="block w-full rounded-2xl border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-lg py-4 px-4 font-bold text-slate-900 bg-slate-50"
                            size={10} // Make it a list box for easier viewing of available teams
                          >
                            <option value="" disabled className="text-slate-400 py-2">-- Available Teams --</option>
                            {availableTeams.map(team => (
                                <option key={team.id} value={team.id} className="py-2 px-2 hover:bg-emerald-100 cursor-pointer border-b border-slate-100 last:border-0">
                                    {team.name} ({team.country})
                                </option>
                            ))}
                          </select>
                          <div className="absolute top-0 right-0 mt-4 mr-4 pointer-events-none">
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                                  {availableTeams.length} Left
                              </span>
                          </div>
                      </div>

                      <button
                        onClick={handleSubmit}
                        disabled={!selectedTeam || isSubmitting}
                        className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-xl shadow-emerald-200 hover:shadow-2xl transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                          {isSubmitting ? (
                              <RefreshCcw className="h-5 w-5 animate-spin" />
                          ) : (
                              <>
                                  Lock In {currentRound === 1 ? 'Banker' : 'Cover'} Pick
                                  <CheckCircle className="ml-2 h-5 w-5" />
                              </>
                          )}
                      </button>
                  </div>
              </div>
          ) : (
              <div className="text-center py-12 animate-in fade-in duration-700">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                      <div className="absolute inset-0 border-4 border-slate-100 rounded-full border-t-emerald-500 animate-spin"></div>
                      <Clock className="h-10 w-10 text-slate-300" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">Waiting for {currentPicker?.display_name}</h3>
                  <p className="text-slate-400 max-w-md mx-auto mb-6">
                      The draft is currently in progress. 
                      {week.draft_round === 2 && " We are in Round 2 (Cover Picks)."}
                  </p>
                  
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