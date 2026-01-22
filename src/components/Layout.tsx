import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Trophy, User, Menu, X, ChevronDown, LogOut, Mail, Shield, LayoutDashboard, Globe } from 'lucide-react';
import { UserRole } from '../types';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useUsers } from '../hooks/useSyndicateData';
import logoNav from '../assets/logo_nav.png';
import headerLogo from './logo.png';
import logoIcon from '../assets/logo_icon.png';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const [authUser] = useAuthState(auth);
  const { users } = useUsers();
  const currentUser = users.find(u => u.id === authUser?.uid);

  const isActive = (path: string) => location.pathname === path ? 'bg-emerald-700 text-white' : 'text-emerald-100 hover:bg-emerald-600 hover:text-white';

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsProfileOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleLogout = async () => {
    try {
      setIsProfileOpen(false);
      setIsSigningOut(true);
      await signOut(auth);
      navigate('/');
    } catch (e) {
      console.error('Failed to sign out', e);
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      {isSigningOut && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative bg-white rounded-2xl border border-slate-100 shadow-2xl px-6 py-5 flex items-center gap-3">
            <span className="h-5 w-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-black text-slate-700 uppercase tracking-widest">Signing out…</span>
          </div>
        </div>
      )}
      {/* Top Navigation */}
      <nav className="bg-emerald-900 text-white shadow-xl sticky top-0 z-50 border-b border-emerald-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">

            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center group">
                <img
                  src={headerLogo}
                  alt="Coupon Busters"
                  className="h-10 w-auto transform group-hover:scale-105 transition-transform duration-300"
                />
              </Link>
            </div>

            {/* Right Side: Profile Trigger */}
            <div className="hidden md:flex items-center space-x-4 relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={`flex items-center space-x-3 pl-2 pr-4 py-2 rounded-2xl transition-all duration-300 border ${isProfileOpen ? 'bg-emerald-800 border-emerald-700 shadow-inner' : 'bg-emerald-800/50 border-transparent hover:bg-emerald-800'}`}
              >
                <div className={`h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg transition-all duration-300 ${isProfileOpen ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-emerald-900 scale-90' : ''}`}>
                  <User className="h-6 w-6 text-emerald-100" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-white leading-tight">{currentUser?.display_name}</p>
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">Syndicate Member</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-emerald-500 transition-transform duration-500 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Billion-Dollar Dropdown Card */}
              {isProfileOpen && (
                <div className="absolute right-0 top-full mt-4 w-72 bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300 origin-top-right">
                  {/* Header: Identity */}
                  <div className="px-8 pt-10 pb-6 text-center">
                    <div className="relative inline-block mb-4">
                      <div className="h-20 w-20 rounded-3xl bg-emerald-50 flex items-center justify-center mx-auto border-2 border-emerald-100 shadow-inner">
                        <User className="h-10 w-10 text-emerald-600" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-yellow-400 rounded-lg flex items-center justify-center border-2 border-white shadow-sm">
                        <Shield className="h-3 w-3 text-emerald-900" fill="currentColor" />
                      </div>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{currentUser?.display_name}</h3>
                    <div className="flex items-center justify-center mt-1 space-x-1.5">
                      <Mail className="h-3 w-3 text-slate-300" />
                      <span className="text-xs font-bold text-slate-400 truncate max-w-[180px]">{currentUser?.email}</span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="px-8">
                    <div className="h-px bg-slate-50 w-full"></div>
                  </div>

                  {/* Navigation Actions */}
                  <div className="p-3 space-y-1">
                    <Link
                      to="/leagues"
                      onClick={() => setIsProfileOpen(false)}
                      className="group flex items-center justify-between px-5 py-3 rounded-2xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-all duration-200"
                    >
                      <span className="text-sm font-bold">My Syndicates</span>
                      <Globe className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                    </Link>

                    {currentUser?.role === UserRole.LEAGUE_ADMIN && (
                      <Link
                        to="/admin"
                        onClick={() => setIsProfileOpen(false)}
                        className="group flex items-center justify-between px-5 py-3 rounded-2xl text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition-all duration-200"
                      >
                        <span className="text-sm font-bold">Admin Console</span>
                        <LayoutDashboard className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="px-8">
                    <div className="h-px bg-slate-50 w-full"></div>
                  </div>

                  {/* Actions Area */}
                  <div className="p-3">
                    <button
                      onClick={handleLogout}
                      className="group w-full flex items-center justify-between px-5 py-3 rounded-[1.5rem] text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-300"
                    >
                      <span className="text-sm font-black uppercase tracking-widest">Sign Out Vault</span>
                      <LogOut className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>

                  {/* Subtle Brand Footer */}
                  <div className="bg-slate-50 px-8 py-4 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">C.Busters Executive v2.5</p>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="-mr-2 flex md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-3 rounded-2xl text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-emerald-950 pb-6 animate-in slide-in-from-top-4 duration-300">
            {/* Top links removed to clean up UI, moved functionality to profile section below */}

            <div className="pt-6 border-t border-emerald-900 px-6">
              <div className="flex items-center space-x-4 mb-8">
                <div className="h-14 w-14 rounded-2xl bg-emerald-800 flex items-center justify-center border border-emerald-700">
                  <User className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                  <div className="text-xl font-black text-white">{currentUser?.display_name}</div>
                  <div className="text-sm font-medium text-emerald-500">{currentUser?.email}</div>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <Link
                  to="/leagues"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between w-full bg-emerald-900/50 text-emerald-100 px-6 py-4 rounded-2xl font-bold hover:bg-emerald-800 transition-colors"
                >
                  <span>My Syndicates</span>
                  <Globe className="h-5 w-5 opacity-70" />
                </Link>

                {currentUser?.role === UserRole.LEAGUE_ADMIN && (
                  <Link
                    to="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between w-full bg-indigo-900/30 text-indigo-100 px-6 py-4 rounded-2xl font-bold hover:bg-indigo-900/50 transition-colors border border-indigo-500/20"
                  >
                    <span>Admin Console</span>
                    <LayoutDashboard className="h-5 w-5 opacity-70" />
                  </Link>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-3 bg-red-500/10 text-red-500 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-500/20 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3 grayscale opacity-70 hover:grayscale-0 transition-all duration-300">
              <img src={logoIcon} alt="" className="h-6 w-auto" />
              <span className="font-black text-sm text-slate-900 tracking-tighter uppercase italic">Coupon Busters</span>
            </div>
            <p className="text-center text-xs font-bold text-slate-300 uppercase tracking-widest">
              &copy; 2024 Syndicate Vault UK • Play Responsibly 18+
            </p>
            <div className="flex space-x-6 text-[10px] font-black text-slate-300 uppercase tracking-widest">
              <a href="#" className="hover:text-emerald-600 transition-colors">Terms</a>
              <a href="#" className="hover:text-emerald-600 transition-colors">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};