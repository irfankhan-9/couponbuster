import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  data: LeaderboardEntry[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ data }) => {
  const sortedData = [...data].sort((a, b) => b.points - a.points);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-bold text-gray-900">Leaderboard</h3>
        <p className="text-sm text-gray-500">Season Standings</p>
      </div>
      
      {/* Chart Section */}
      <div className="h-64 w-full bg-gray-50 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sortedData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="user_name" type="category" width={80} tick={{fontSize: 12}} />
            <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            />
            <Bar dataKey="points" radius={[0, 4, 4, 0]} barSize={20}>
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#64748b'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* List Section */}
      <div className="divide-y divide-gray-100">
        {sortedData.map((entry, index) => (
          <div key={entry.user_id} className="p-4 flex items-center justify-between hover:bg-gray-50">
            <div className="flex items-center space-x-3">
              <span className={`flex-shrink-0 w-6 text-center font-bold ${index < 3 ? 'text-emerald-600' : 'text-gray-400'}`}>
                {index + 1}
              </span>
              <span className="font-medium text-gray-900">{entry.user_name}</span>
            </div>
            <div className="flex items-center space-x-6">
               <div className="text-center">
                    <span className="block text-xs text-gray-400 uppercase">Wins</span>
                    <span className="font-semibold text-gray-700">{entry.wins}</span>
               </div>
               <div className="text-center w-12">
                    <span className="block text-xs text-gray-400 uppercase">Pts</span>
                    <span className="font-bold text-emerald-600 text-lg">{entry.points}</span>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
