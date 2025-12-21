import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_LEAGUES, MOCK_MEMBERS, CURRENT_USER_ID } from '../constants';
import { JoinLeagueModal } from '../components/JoinLeagueModal';
import { Users, Lock, Globe, ShieldCheck, ChevronRight, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils/scoring';

export const Leagues: React.FC = () => {
  const [selectedLeague, setSelectedLeague] = useState<{id: string, name: string} | null>(null);

  const handleJoinClick = (league: {id: string, name: string}) => {
    setSelectedLeague(league);
  };

  const handleJoinSubmit = () => {
    MOCK_MEMBERS.push({
        id: `m${Date.now()}`,
        league_id: selectedLeague!.id,
        user_id: CURRENT_USER_ID,
        status: 'pending',
        is_admin: false,
        joined_at: new Date().toISOString(),
        represented_team_id: undefined,
        points: 0,
        wins: 0
    });
    alert("Request sent! Waiting for admin approval.");
    setSelectedLeague(null);
  };

  const isMember = (leagueId: string) => {
    return MOCK_MEMBERS.find(m => m.league_id === leagueId && m.user_id === CURRENT_USER_ID);
  };

  const getApprovedMemberCount = (leagueId: string) => {
    return MOCK_MEMBERS.filter(m => m.league_id === leagueId && m.status === 'approved').length;
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Syndicates</h1>
              <p className="text-slate-500 mt-2 text-lg font-medium">Browse active competitions and request access to join.</p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
             <ShieldCheck className="h-4 w-4 text-emerald-500" />
             <span>Strict Membership Active</span>
          </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {MOCK_LEAGUES.map((league) => {
          const membership = isMember(league.id);
          const approvedCount = getApprovedMemberCount(league.id);
          const isFull = approvedCount >= league.max_players;
          
          return (
            <div key={league.id} className="group bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 flex flex-col justify-between hover:shadow-xl hover:border-emerald-100 transition-all duration-300 relative overflow-hidden">
              {/* Subtle background branding */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-emerald-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                   <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:border-emerald-100 transition-colors">
                     {league.privacy === 'public' ? <Globe className="h-6 w-6 text-slate-400 group-hover:text-emerald-600 transition-colors" /> : <Lock className="h-6 w-6 text-slate-400 group-hover:text-emerald-600 transition-colors" />}
                   </div>
                   <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border shadow-sm ${isFull ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                    {isFull ? 'League Full' : league.privacy}
                   </span>
                </div>
                
                <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">{league.name}</h3>
                
                <div className="space-y-4 mb-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center text-slate-400">
                           <Users className="h-4 w-4 mr-2" />
                           <span className="text-xs font-bold uppercase tracking-wide">Capacity</span>
                        </div>
                        <span className={`text-sm font-black ${isFull ? 'text-red-600' : 'text-slate-900'}`}>{approvedCount} / {league.max_players}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center text-slate-400">
                           <div className="w-4 h-4 mr-2 flex items-center justify-center font-bold text-[10px]">£</div>
                           <span className="text-xs font-bold uppercase tracking-wide">Entry Fee</span>
                        </div>
                        <span className="text-sm font-black text-emerald-600">{formatCurrency(league.weekly_fee_pence)}<span className="text-[10px] text-slate-400 ml-1">/WK</span></span>
                    </div>
                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Saved Pot</span>
                        <span className="text-xs font-black text-slate-400">{formatCurrency(league.current_pot_pence)}</span>
                    </div>
                </div>
              </div>

              <div className="mt-auto relative z-10">
                {membership ? (
                    membership.status === 'approved' ? (
                        <Link to={`/league/${league.id}`} className="w-full inline-flex items-center justify-center px-6 py-4 border-2 border-emerald-600 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white font-black text-sm transition-all duration-300 transform active:scale-95 group/btn">
                            Go to Dashboard
                            <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover/btn:translate-x-1" />
                        </Link>
                    ) : membership.status === 'pending' ? (
                        <div className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-amber-50 border-2 border-amber-100 text-amber-700 rounded-2xl font-black text-sm cursor-not-allowed">
                            <Lock className="h-4 w-4" />
                            <span>Approval Pending</span>
                        </div>
                    ) : (
                         <div className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-red-50 border-2 border-red-100 text-red-700 rounded-2xl font-black text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span>Request Rejected</span>
                        </div>
                    )
                ) : (
                    <button 
                        onClick={() => handleJoinClick(league)}
                        disabled={isFull}
                        className={`w-full text-center px-6 py-4 rounded-2xl font-black text-sm transition-all duration-300 transform active:scale-95 shadow-lg ${isFull ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' : 'bg-slate-900 text-white hover:bg-emerald-600 shadow-slate-200 hover:shadow-emerald-200'}`}
                    >
                        {isFull ? 'Syndicate Full' : 'Join Syndicate'}
                    </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <JoinLeagueModal 
        isOpen={!!selectedLeague} 
        leagueName={selectedLeague?.name || ''} 
        onClose={() => setSelectedLeague(null)} 
        onSubmit={handleJoinSubmit}
      />
    </div>
  );
};