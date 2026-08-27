import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Settings, RefreshCw, ToggleLeft, ToggleRight, AlertTriangle, DollarSign, Users, Clock, Check, X, UserPlus, UserMinus, Trash2 } from 'lucide-react';
import { useGlobalLeague, useGlobalLeagueEntries, useGlobalLeagueRequests } from '../hooks/useSyndicateData';
import { db } from '../lib/firebase';
import { doc, updateDoc, deleteDoc, collection, addDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';

export const GlobalLeagueAdmin: React.FC = () => {
  const { globalLeague, loading } = useGlobalLeague();
  const { entries } = useGlobalLeagueEntries();
  const { requests } = useGlobalLeagueRequests();
  const [newStake, setNewStake] = useState(5);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showConfirmRecalc, setShowConfirmRecalc] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<{ id: string; display_name: string } | null>(null);

  const pendingRequests = requests.filter(r => r.status === 'pending');

  const formatPence = (pence: number) => `£${(pence / 100).toFixed(2)}`;
  const currentStake = globalLeague?.entry_stake_pence || 500;

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleApproveRequest = async (request: any) => {
    setIsUpdating(true);
    try {
      // Get user's points from all leagues
      const membersSnap = await getDocs(query(
        collection(db, 'members'),
        where('user_id', '==', request.user_id),
        where('status', '==', 'approved')
      ));

      let totalPoints = 0;
      let totalWins = 0;

      membersSnap.docs.forEach(doc => {
        const data = doc.data();
        totalPoints += (data.points || 0) + (data.adjustment_points || 0);
        totalWins += data.wins || 0;
      });

      // Create entry
      await addDoc(collection(db, 'global_league_entries'), {
        global_league_id: globalLeague?.id || 'default',
        user_id: request.user_id,
        display_name: request.display_name,
        total_points: totalPoints,
        wins: totalWins,
        is_global_crown_champion: false,
        joined_at: new Date().toISOString()
      });

      // Update request status
      await updateDoc(doc(db, 'global_league_requests', request.id), {
        status: 'approved',
        processed_at: new Date().toISOString()
      });

      showMessage('success', `${request.display_name} approved and added to Global League!`);
    } catch (error) {
      console.error('Error approving request:', error);
      showMessage('error', 'Failed to approve request');
    }
    setIsUpdating(false);
  };

  const handleRejectRequest = async (request: any) => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'global_league_requests', request.id), {
        status: 'rejected',
        processed_at: new Date().toISOString()
      });
      showMessage('success', `${request.display_name}'s request rejected`);
    } catch (error) {
      console.error('Error rejecting request:', error);
      showMessage('error', 'Failed to reject request');
    }
    setIsUpdating(false);
  };

  const handleRemoveParticipant = async (entry: { id: string; display_name: string }) => {
    setIsUpdating(true);
    try {
      await deleteDoc(doc(db, 'global_league_entries', entry.id));
      showMessage('success', `${entry.display_name} removed from the Global League`);
    } catch (error) {
      console.error('Error removing participant:', error);
      showMessage('error', 'Failed to remove participant');
    } finally {
      setPendingRemove(null);
      setIsUpdating(false);
    }
  };

  const handleRemoveAllParticipants = async () => {
    setIsUpdating(true);
    try {
      const existingEntriesSnap = await getDocs(collection(db, 'global_league_entries'));
      const batch = writeBatch(db);
      existingEntriesSnap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      showMessage('success', `Removed all ${existingEntriesSnap.size} participants from the Global League`);
    } catch (error) {
      console.error('Error removing all participants:', error);
      showMessage('error', 'Failed to remove all participants');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStake = async () => {
    setIsUpdating(true);
    try {
      let leagueId = globalLeague?.id;
      
      // Auto-create global league if doesn't exist
      if (!leagueId) {
        const newLeague = await addDoc(collection(db, 'global_league'), {
          entry_stake_pence: 500,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        leagueId = newLeague.id;
      }
      
      await updateDoc(doc(db, 'global_league', leagueId), {
        entry_stake_pence: Math.round(newStake * 100),
        updated_at: new Date().toISOString()
      });
      showMessage('success', `Entry stake updated to ${formatPence(Math.round(newStake * 100))}`);
    } catch (error) {
      console.error('Error updating stake:', error);
      showMessage('error', 'Failed to update stake');
    }
    setIsUpdating(false);
  };

  const handleToggleActive = async () => {
    setIsUpdating(true);
    try {
      let leagueId = globalLeague?.id;
      
      // Auto-create global league if doesn't exist
      if (!leagueId) {
        const newLeague = await addDoc(collection(db, 'global_league'), {
          entry_stake_pence: 500,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        leagueId = newLeague.id;
      }
      
      const newStatus = !globalLeague?.is_active;
      await updateDoc(doc(db, 'global_league', leagueId), {
        is_active: newStatus,
        updated_at: new Date().toISOString()
      });
      showMessage('success', `Global league ${newStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling status:', error);
      showMessage('error', 'Failed to toggle status');
    }
    setIsUpdating(false);
  };

  const handleRecalculatePoints = async () => {
    setShowConfirmRecalc(false);
    setIsUpdating(true);
    showMessage('success', 'Recalculating points across all leagues...');

    try {
      // 1. Fetch all members from all leagues
      const membersSnap = await getDocs(collection(db, 'members'));
      const usersSnap = await getDocs(collection(db, 'users'));

      // Build user map
      const userMap = new Map<string, string>();
      usersSnap.docs.forEach(doc => {
        userMap.set(doc.id, doc.data().display_name || 'Unknown');
      });

      // 2. Aggregate points by user
      const userPoints: Map<string, { points: number; wins: number }> = new Map();

      membersSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.status !== 'approved') return;

        const userId = data.user_id;
        const points = (data.points || 0) + (data.adjustment_points || 0);
        const wins = data.wins || 0;

        const existing = userPoints.get(userId) || { points: 0, wins: 0 };
        userPoints.set(userId, {
          points: existing.points + points,
          wins: existing.wins + wins
        });
      });

      // 3. Get or create global league entry
      let globalLeagueId = globalLeague?.id;
      if (!globalLeagueId) {
        const newLeague = await addDoc(collection(db, 'global_league'), {
          entry_stake_pence: 500,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        globalLeagueId = newLeague.id;
      }

      // 4. Clear existing entries and create new ones
      const existingEntriesSnap = await getDocs(collection(db, 'global_league_entries'));
      const batch = writeBatch(db);

      // Delete existing
      existingEntriesSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Create new entries sorted by points
      const sortedUsers = Array.from(userPoints.entries())
        .sort((a, b) => b[1].points - a[1].points);

      sortedUsers.forEach(([userId, stats], index) => {
        const entryRef = doc(collection(db, 'global_league_entries'));
        batch.set(entryRef, {
          global_league_id: globalLeagueId,
          user_id: userId,
          display_name: userMap.get(userId) || 'Unknown',
          total_points: stats.points,
          wins: stats.wins,
          rank: index + 1,
          is_global_crown_champion: index === 0,
          joined_at: new Date().toISOString()
        });
      });

      await batch.commit();
      showMessage('success', `Recalculated! ${sortedUsers.length} participants updated.`);
    } catch (error) {
      console.error('Error recalculating:', error);
      showMessage('error', 'Failed to recalculate points');
    }
    setIsUpdating(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message Toast */}
      {message && (
        <div className={`
          fixed top-24 right-6 z-50 px-6 py-4 rounded-2xl shadow-xl animate-in slide-in-from-right duration-300
          ${message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}
        `}>
          <p className="font-black">{message.text}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-yellow-900 to-amber-900 rounded-[2rem] p-8 text-white">
        <div className="flex items-center gap-4 mb-6">
          <Crown className="h-10 w-10 text-yellow-400 fill-current" />
          <div>
            <h2 className="text-2xl font-black">Global League Control</h2>
            <p className="text-yellow-200/80 text-sm">Manage the global championship settings</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-yellow-200/80 text-xs font-black uppercase">Participants</p>
              <p className="text-2xl font-black">{entries.length}</p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-yellow-200/80 text-xs font-black uppercase">Entry Fee</p>
              <p className="text-2xl font-black">{formatPence(currentStake)}</p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 flex items-center gap-3">
            <Settings className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-yellow-200/80 text-xs font-black uppercase">Status</p>
              <p className={`text-2xl font-black ${globalLeague?.is_active ? 'text-emerald-400' : 'text-red-400'}`}>
                {globalLeague?.is_active ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Entry Stake Control */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-black text-slate-900">Entry Stake</h3>
              <p className="text-slate-500 text-sm">Set the cost to join the global league</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-emerald-600 font-black text-lg">£</span>
              </div>
              <input
                type="number"
                value={newStake}
                onChange={(e) => setNewStake(parseFloat(e.target.value) || 0)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 font-black text-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                step="0.01"
                min="0"
              />
            </div>
            <button
              onClick={handleUpdateStake}
              disabled={isUpdating}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-xl transition-colors"
            >
              {isUpdating ? '...' : 'Update'}
            </button>
          </div>
        </div>

        {/* Active Toggle */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-xl ${globalLeague?.is_active ? 'bg-emerald-100' : 'bg-slate-100'}`}>
              {globalLeague?.is_active ? (
                <ToggleRight className="h-6 w-6 text-emerald-600" />
              ) : (
                <ToggleLeft className="h-6 w-6 text-slate-400" />
              )}
            </div>
            <div>
              <h3 className="font-black text-slate-900">Betting Status</h3>
              <p className="text-slate-500 text-sm">Enable or disable new entries</p>
            </div>
          </div>

          <button
            onClick={handleToggleActive}
            disabled={isUpdating}
            className={`w-full py-4 rounded-xl font-black text-white transition-colors ${
              globalLeague?.is_active
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {globalLeague?.is_active ? 'Deactivate Betting' : 'Activate Betting'}
          </button>
        </div>
      </div>

      {/* Pending Requests Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-100 rounded-xl">
            <UserPlus className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h3 className="font-black text-slate-900">Pending Join Requests</h3>
            <p className="text-slate-500 text-sm">Approve or reject users wanting to join the global league</p>
          </div>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="py-8 text-center text-slate-400 font-medium">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No pending requests
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((request: any) => (
              <div key={request.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <Link
                      to={`/profile/${request.user_id}`}
                      className="font-black text-slate-900 hover:underline decoration-emerald-500/60 underline-offset-2"
                    >
                      {request.display_name}
                    </Link>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(request.requested_at).toLocaleDateString()} at {new Date(request.requested_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveRequest(request)}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Check className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectRequest(request)}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 disabled:opacity-50 text-red-600 font-bold rounded-lg transition-colors flex items-center gap-1"
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current Participants */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-100 rounded-xl">
              <UserMinus className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <h3 className="font-black text-slate-900">Manage Participants</h3>
              <p className="text-slate-500 text-sm">Remove individual users or wipe the entire global leaderboard</p>
            </div>
          </div>
          {entries.length > 0 && (
            <button
              onClick={() => {
                if (confirm(`Remove ALL ${entries.length} participants from the Global League? This cannot be undone.`)) {
                  handleRemoveAllParticipants();
                }
              }}
              disabled={isUpdating}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 disabled:opacity-50 text-red-700 font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="py-8 text-center text-slate-400 font-medium">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No participants in the global league yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Player</th>
                  <th className="px-4 py-3 text-right text-xs font-black text-slate-500 uppercase tracking-widest">Points</th>
                  <th className="px-4 py-3 text-right text-xs font-black text-slate-500 uppercase tracking-widest">Wins</th>
                  <th className="px-4 py-3 text-right text-xs font-black text-slate-500 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry, index) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`
                          w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm
                          ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white' : ''}
                          ${index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' : ''}
                          ${index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' : ''}
                          ${index > 2 ? 'bg-slate-100 text-slate-600' : ''}
                        `}>
                          {index + 1}
                        </div>
                        {entry.is_global_crown_champion && (
                          <Crown className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center font-black text-emerald-700">
                          {(entry.display_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <Link
                          to={`/profile/${entry.user_id}`}
                          className="font-bold text-slate-800 hover:underline decoration-emerald-500/60 underline-offset-2"
                        >
                          {entry.display_name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-black text-slate-900">{entry.total_points}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-slate-600">{entry.wins}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setPendingRemove({ id: entry.id, display_name: entry.display_name })}
                        disabled={isUpdating}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 font-bold rounded-lg transition-colors flex items-center gap-1 ml-auto"
                        title={`Remove ${entry.display_name} from the Global League`}
                      >
                        <UserMinus className="h-4 w-4" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Remove Participant Modal */}
      {pendingRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isUpdating && setPendingRemove(null)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md mx-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Remove Participant</h3>
            </div>

            <p className="text-slate-600 mb-6">
              Are you sure you want to remove <span className="font-black text-slate-900">{pendingRemove.display_name}</span> from the Global League?
              Their entry will be deleted and they will be removed from the global leaderboard.
              Any pending request from this user will also be deleted.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setPendingRemove(null)}
                disabled={isUpdating}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-black rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveParticipant(pendingRemove)}
                disabled={isUpdating}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isUpdating && <span className="h-4 w-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin"></span>}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recalculate Points */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-100 rounded-xl">
            <RefreshCw className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h3 className="font-black text-slate-900">Force Recalculate Points</h3>
            <p className="text-slate-500 text-sm">Aggregate points from all leagues and update rankings</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowConfirmRecalc(true)}
            disabled={isUpdating}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-black rounded-xl transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-5 w-5" />
            Recalculate All Points
          </button>
          <span className="text-slate-500 text-sm">
            This will update all {entries.length} participant entries
          </span>
        </div>
      </div>

      {/* Confirm Recalculate Modal */}
      {showConfirmRecalc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirmRecalc(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md mx-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Confirm Recalculation</h3>
            </div>

            <p className="text-slate-600 mb-6">
              This will recalculate all user points by aggregating their points across ALL leagues.
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmRecalc(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRecalculatePoints}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
