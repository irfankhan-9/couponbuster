import React, { useState } from 'react';
import { TEAMS } from '../constants';
import { Week, Team } from '../types';
import { AlertCircle, CheckCircle, Clock, Star, ShieldCheck } from 'lucide-react';

interface PickFormProps {
  week: Week;
  onSubmit: (picks: { team1: string, team2: string }) => void;
  existingPicks?: { team1: string, team2: string };
}

export const PickForm: React.FC<PickFormProps> = ({ week, onSubmit, existingPicks }) => {
  const [pick1, setPick1] = useState<string>(existingPicks?.team1 || '');
  const [pick2, setPick2] = useState<string>(existingPicks?.team2 || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!pick1 || !pick2) {
      setError("Please select two teams.");
      return;
    }
    if (pick1 === pick2) {
      setError("You cannot pick the same team twice.");
      return;
    }

    setIsSubmitting(true);
    // Simulate API delay
    setTimeout(() => {
      onSubmit({ team1: pick1, team2: pick2 });
      setIsSubmitting(false);
    }, 800);
  };

  // Calculate time remaining
  const deadline = new Date(week.deadline_at);
  const now = new Date();
  const timeLeft = deadline.getTime() - now.getTime();
  const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  const isLocked = week.status !== 'open' || timeLeft < 0;

  if (isLocked) {
    return (
      <div className="bg-gray-100 p-6 rounded-lg border border-gray-200 text-center">
        <Clock className="h-8 w-8 mx-auto text-gray-400 mb-2" />
        <h3 className="text-lg font-medium text-gray-900">Picks Locked</h3>
        <p className="text-sm text-gray-500">The deadline for Week {week.week_number} has passed.</p>
        {existingPicks && (
           <div className="mt-4 flex justify-center space-x-4">
             <span className="px-3 py-1 bg-white border rounded shadow-sm">{TEAMS.find(t => t.id === existingPicks.team1)?.name}</span>
             <span className="px-3 py-1 bg-white border rounded shadow-sm">{TEAMS.find(t => t.id === existingPicks.team2)?.name}</span>
           </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h3 className="text-lg font-bold text-gray-900">Make Your Picks</h3>
            <p className="text-sm text-gray-500">Week {week.week_number}</p>
        </div>
        <div className="text-right">
            <span className="text-xs font-semibold uppercase text-emerald-600 tracking-wider">Deadline In</span>
            <div className="text-sm font-mono font-bold text-gray-900">
                {daysLeft}d {hoursLeft}h
            </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* PICK 1: THE BANKER */}
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center mb-2">
            <Star className="h-5 w-5 text-yellow-600 mr-2" fill="currentColor" />
            <label className="block text-sm font-bold text-gray-900 uppercase tracking-wide">
                Pick 1: The Banker
            </label>
          </div>
          <p className="text-xs text-yellow-800 mb-3">
            This pick goes on the <strong>Real Money Coupon</strong> AND counts for points.
          </p>
          <select
            value={pick1}
            onChange={(e) => setPick1(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-3 border"
          >
            <option value="">Select your Banker...</option>
            {TEAMS.map((team) => (
              <option key={team.id} value={team.id} disabled={team.id === pick2}>
                {team.name} ({team.country})
              </option>
            ))}
          </select>
        </div>

        {/* PICK 2: THE COVER */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center mb-2">
             <ShieldCheck className="h-5 w-5 text-gray-600 mr-2" />
             <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                Pick 2: The Cover
             </label>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            This pick only counts for <strong>League Points</strong>.
          </p>
          <select
            value={pick2}
            onChange={(e) => setPick2(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-3 border"
          >
            <option value="">Select your Cover team...</option>
            {TEAMS.map((team) => (
              <option key={team.id} value={team.id} disabled={team.id === pick1}>
                {team.name} ({team.country})
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Lock In Picks'}
        </button>
      </form>
    </div>
  );
};
