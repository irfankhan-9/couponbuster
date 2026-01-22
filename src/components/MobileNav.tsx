import React from 'react';
import { Trophy, List, PiggyBank, BookOpen } from 'lucide-react';

interface MobileNavProps {
    activeTab: 'draft' | 'table' | 'pot' | 'rules';
    setActiveTab: (tab: 'draft' | 'table' | 'pot' | 'rules') => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
    const tabs = [
        { id: 'draft', label: 'Draft', icon: Trophy },
        { id: 'table', label: 'Table', icon: List },
        { id: 'pot', label: 'Vault', icon: PiggyBank },
        { id: 'rules', label: 'Rules', icon: BookOpen },
    ] as const;

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pointer-events-none">
            <div className="max-w-md mx-auto bg-white/80 backdrop-blur-xl border border-white/20 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] rounded-[2rem] p-2 flex items-center justify-around pointer-events-auto ring-1 ring-black/5">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                flex flex-col items-center justify-center py-2 px-4 rounded-2xl transition-all duration-300 relative
                ${isActive ? 'text-emerald-600 scale-110' : 'text-slate-400 hover:text-slate-600'}
              `}
                        >
                            <div className={`
                p-2 rounded-xl transition-all duration-300 mb-1
                ${isActive ? 'bg-emerald-50' : 'bg-transparent'}
              `}>
                                <Icon className={`h-5 w-5 transition-transform duration-500 ${isActive ? 'scale-110' : 'scale-100'}`} />
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                                {tab.label}
                            </span>
                            {isActive && (
                                <div className="absolute -bottom-1 w-1 h-1 bg-emerald-600 rounded-full animate-in fade-in zoom-in duration-300"></div>
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    );
};
