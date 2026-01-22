import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Trophy, Eye, EyeOff, CheckCircle, AlertTriangle, Lock } from 'lucide-react';
import logoFull from '../assets/logo_full.png';
import logoNav from '../assets/logo_nav.png';

type ResetCoreProps = { oobCode: string | null; mode: string | null };

const ResetCore: React.FC<ResetCoreProps> = ({ oobCode, mode }) => {

  const [verifying, setVerifying] = React.useState(true);
  const [valid, setValid] = React.useState(false);
  const [email, setEmail] = React.useState<string | null>(null);

  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  const [submitting, setSubmitting] = React.useState(false);
  const [banner, setBanner] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        // Basic param checks
        if (mode !== 'resetPassword' || !oobCode) {
          throw new Error('invalid-params');
        }
        const mail = await verifyPasswordResetCode(auth, oobCode);
        if (!mounted) return;
        setEmail(mail || null);
        setValid(true);
      } catch (e: any) {
        if (!mounted) return;
        setBanner(mapError(e?.code) || 'This reset link is invalid or expired.');
        setValid(false);
      } finally {
        if (mounted) setVerifying(false);
      }
    };
    // Small delay to ensure skeleton shows briefly
    const t = setTimeout(run, 250);
    return () => { mounted = false; clearTimeout(t); };
  }, [mode, oobCode]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    if (password.length < 6) {
      setBanner('Password should be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setBanner('Passwords do not match.');
      return;
    }
    try {
      setSubmitting(true);
      if (!oobCode) throw new Error('invalid-params');
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
    } catch (e: any) {
      setBanner(mapError(e?.code) || 'Failed to reset password. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Skeleton loader
  if (verifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Hero />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-8">
            <Header />
            <div className="animate-pulse space-y-3 mt-4">
              <div className="h-4 bg-slate-100 rounded" />
              <div className="h-10 bg-slate-100 rounded" />
              <div className="h-10 bg-slate-100 rounded" />
              <div className="h-10 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Hero />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-8">
          <Header />

          {banner && (
            <div className={`mb-4 rounded-2xl px-4 py-3 text-sm font-bold border ${success ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`} role="alert" aria-live="polite">
              {banner}
            </div>
          )}

          {!valid ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-red-50 text-red-600 mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <p className="text-slate-500 font-bold mb-4">This reset link is invalid or expired.</p>
              <a href="/#/" className="text-emerald-600 font-black text-sm">Go to Auth</a>
            </div>
          ) : success ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 mb-4">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Password Updated</h3>
              <p className="text-slate-500 font-bold mb-4">You can now sign in with your new password.</p>
              <a href="/#/" className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-700">Go to Sign In</a>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" aria-busy={submitting}>
              {email && (
                <div className="text-xs font-bold text-slate-400 mb-1">Resetting password for</div>
              )}
              {email && (
                <div className="text-sm font-black text-slate-700 mb-2">{email}</div>
              )}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">New Password</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} disabled={submitting} className="w-full pl-10 pr-12 p-3.5 sm:p-3 rounded-2xl border border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 font-bold disabled:opacity-50" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={submitting} className="w-full p-3.5 sm:p-3 rounded-2xl border border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 font-bold disabled:opacity-50" placeholder="••••••••" />
              </div>
              <button type="submit" disabled={submitting} className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 sm:py-3 text-sm font-black uppercase tracking-widest text-white transition-all ${submitting ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]'} shadow-lg shadow-emerald-500/20`}>
                {submitting && <span className="h-4 w-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />}
                Update Password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

function Hero() {
  return (
    <div className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800" />
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #ffffff22 0 20%, transparent 20%), radial-gradient(circle at 80% 30%, #ffffff11 0 18%, transparent 18%), radial-gradient(circle at 40% 70%, #ffffff11 0 22%, transparent 22%)' }} />
      <div className="relative z-10 text-white text-center px-10 animate-in fade-in duration-700">
        <div className="mb-8 flex justify-center">
          <img src={logoFull} alt="Coupon Busters" className="h-64 w-auto drop-shadow-2xl" />
        </div>
        <h2 className="text-4xl font-black tracking-tight mb-3">Reset Password</h2>
        <p className="text-emerald-50/90 font-medium">Secure account recovery.</p>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="mb-8 text-center sm:text-left">
      <div className="flex justify-center sm:justify-start mb-2">
        <img src={logoNav} alt="Coupon Busters" className="h-10 w-auto" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Secure Account Recovery</p>
    </div>
  );
}

function mapError(code?: string): string | undefined {
  switch (code) {
    case 'auth/expired-action-code':
      return 'This link has expired. Request a new reset email.';
    case 'auth/invalid-action-code':
      return 'This link is invalid. Request a new reset email.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    default:
      return undefined;
  }
}

export const ResetPassword: React.FC = () => {
  const [params] = useSearchParams();
  const oobCode = params.get('oobCode');
  const mode = params.get('mode');
  return <ResetCore oobCode={oobCode} mode={mode} />;
};

// Standalone version for Firebase default handler /__/auth/action?...
export const ResetStandalone: React.FC = () => {
  const sp = new URLSearchParams(window.location.search);
  const oobCode = sp.get('oobCode');
  const mode = sp.get('mode');
  return <ResetCore oobCode={oobCode} mode={mode} />;
};
