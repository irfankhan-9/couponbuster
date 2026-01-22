import React from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface JoinLeagueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  leagueName: string;
  loading?: boolean;
}

export const JoinLeagueModal: React.FC<JoinLeagueModalProps> = ({ isOpen, onClose, onSubmit, leagueName, loading = false }) => {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-6" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Background overlay with a sophisticated blur */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity animate-in fade-in duration-500" 
        aria-hidden="true" 
        onClick={!loading ? onClose : undefined}
      ></div>

      {/* Modal Card - Compact & Premium */}
      <div className="relative bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1),0_10px_30px_rgba(16,185,129,0.05)] overflow-hidden max-w-md w-full transform transition-all animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-500 border border-slate-100">
        
        {/* Subtle Decorative Top Gradient */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-600 to-emerald-400 opacity-80"></div>
        
        {/* Close Button - Minimalist */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-6 p-2 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-full transition-all duration-300"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-10 pt-10 pb-8 text-center">
          {/* Header Icon with Breathing Animation */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-emerald-50 mb-6 relative">
            <div className="absolute inset-0 rounded-2xl bg-emerald-100/50 animate-pulse"></div>
            <ShieldCheck className="h-8 w-8 text-emerald-600 relative z-10" strokeWidth={2} />
          </div>

          {/* Content - Refined Typography */}
          <div className="space-y-3">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight" id="modal-title">
              Join the Syndicate
            </h3>
            <div className="space-y-3">
              <p className="text-base text-slate-500 leading-relaxed px-2">
                Request access to participate in
                <span className="block mt-2">
                  <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-full text-sm border border-emerald-100/50 shadow-sm">
                    {leagueName}
                  </span>
                </span>
              </p>
              <p className="text-xs text-slate-400 leading-relaxed max-w-[240px] mx-auto">
                Coordination for your weekly picks and pot growth begins upon approval.
              </p>
            </div>
          </div>

          {/* Actions - Refined Interaction Set */}
          <div className="mt-8 flex flex-col gap-2.5">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`group relative w-full inline-flex justify-center items-center rounded-2xl px-6 py-3.5 text-base font-bold text-white shadow-[0_8px_15px_-3px_rgba(16,185,129,0.3)] transition-all duration-300 overflow-hidden ${loading ? 'bg-emerald-400 cursor-not-allowed' : 'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:shadow-[0_12px_20px_-3px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 active:scale-[0.98]'}`}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin"></span>
                  Requesting…
                </span>
              ) : (
                'Send Join Request'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={`w-full inline-flex justify-center items-center rounded-2xl px-6 py-3 text-sm font-bold transition-all duration-300 ${loading ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            >
              Cancel
            </button>
          </div>

          {/* Footer Status Badge - Compact & Elegant */}
          <div className="mt-8 pt-6 border-t border-slate-50 flex justify-center">
            <div className="inline-flex items-center space-x-2 bg-slate-50/80 px-4 py-1.5 rounded-full border border-slate-100 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                Awaiting Admin Approval
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};