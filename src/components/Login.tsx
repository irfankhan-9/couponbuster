import React from 'react';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { LogIn, Trophy, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import logoFull from '../assets/logo_full.png';
import logoNav from '../assets/logo_nav.png';

const Login: React.FC = () => {
  const [mode, setMode] = React.useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  const [loadingGoogle, setLoadingGoogle] = React.useState(false);
  const [loadingEmail, setLoadingEmail] = React.useState(false);
  const [errorBanner, setErrorBanner] = React.useState<string>('');

  const resetErrors = () => setErrorBanner('');

  const ensureUserDoc = async (user: any) => {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        display_name: user.displayName || displayName || email.split('@')[0],
        photo_url: user.photoURL || null,
        role: 'user',
        created_at: new Date().toISOString()
      });
    }
  };

  const googleSignIn = async () => {
    resetErrors();
    try {
      setLoadingGoogle(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await ensureUserDoc(result.user);
    } catch (err: any) {
      console.error(err);
      setErrorBanner(mapFirebaseError(err?.code) || 'Failed to sign in with Google');
    } finally {
      setLoadingGoogle(false);
    }
  };

  const emailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();
    try {
      setLoadingEmail(true);
      if (mode === 'signin') {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        await ensureUserDoc(cred.user);
      } else {
        if (password.length < 6) throw { code: 'auth/weak-password' };
        if (password !== confirmPassword) throw { code: 'auth/password-mismatch' };
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        // set display name in user doc
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          email: cred.user.email,
          display_name: displayName || email.split('@')[0],
          photo_url: cred.user.photoURL || null,
          role: 'user',
          created_at: new Date().toISOString()
        }, { merge: true });
      }
    } catch (err: any) {
      console.error(err);
      setErrorBanner(mapFirebaseError(err?.code) || 'Authentication failed');
    } finally {
      setLoadingEmail(false);
    }
  };

  const forgotPassword = async () => {
    resetErrors();
    try {
      if (!email) {
        setErrorBanner('Enter your email to reset password');
        return;
      }
      setLoadingEmail(true);
      const actionCodeSettings = {
        url: `${window.location.origin}/#/reset`,
        handleCodeInApp: true
      } as any;
      await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
      setErrorBanner('Password reset link sent to your email');
    } catch (err: any) {
      console.error(err);
      setErrorBanner(mapFirebaseError(err?.code) || 'Failed to send reset link');
    } finally {
      setLoadingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Hero Side */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #ffffff22 0 20%, transparent 20%), radial-gradient(circle at 80% 30%, #ffffff11 0 18%, transparent 18%), radial-gradient(circle at 40% 70%, #ffffff11 0 22%, transparent 22%)' }} />
        <div className="relative z-10 text-white text-center px-10 animate-in fade-in duration-700">
          <div className="mb-8 flex justify-center">
            <img src={logoFull} alt="Coupon Busters" className="h-64 w-auto drop-shadow-2xl" />
          </div>
          <h2 className="text-4xl font-black tracking-tight mb-3">Syndicate Vault</h2>
          <p className="text-emerald-50/90 font-medium">Play responsibly. Build winning streaks with discipline and style.</p>
        </div>
      </div>

      {/* Auth Card */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-10 relative">
          {/* Header */}
          <div className="mb-8 text-center sm:text-left">
            <div className="flex justify-center sm:justify-start mb-2">
              <img src={logoNav} alt="Coupon Busters" className="h-10 w-auto" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Secure Access Portal</p>
          </div>

          {/* Error Banner */}
          {errorBanner && (
            <div className={`mb-4 rounded-2xl px-4 py-3 text-sm font-bold border ${errorBanner.includes('sent') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`} role="alert" aria-live="polite">
              {errorBanner}
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6 grid grid-cols-2 bg-slate-50 rounded-2xl p-1 border border-slate-100">
            <button onClick={() => { setMode('signin'); resetErrors(); }} className={`px-4 py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${mode === 'signin' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>Sign In</button>
            <button onClick={() => { setMode('signup'); resetErrors(); }} className={`px-4 py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${mode === 'signup' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>Sign Up</button>
          </div>

          {/* Google Button */}
          <button onClick={googleSignIn} disabled={loadingGoogle || loadingEmail} className={`w-full inline-flex items-center justify-center gap-3 rounded-2xl border border-slate-200 px-4 py-4 sm:py-3.5 text-sm font-bold transition-colors ${loadingGoogle ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white hover:bg-slate-50 active:scale-[0.98]'}`}>
            {loadingGoogle ? (
              <span className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="h-5 w-5" />
            )}
            {loadingGoogle ? 'Signing in…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px bg-slate-100 flex-1" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">or continue with email</span>
            <div className="h-px bg-slate-100 flex-1" />
          </div>

          {/* Email Form */}
          <form onSubmit={emailSubmit} className="space-y-3" aria-busy={loadingEmail}>
            {mode === 'signup' && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Display Name</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={loadingEmail || loadingGoogle} className="w-full p-3.5 sm:p-3 rounded-2xl border border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 font-bold disabled:opacity-50" placeholder="e.g. Josh" />
              </div>
            )}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Email</label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loadingEmail || loadingGoogle} className="w-full pl-10 p-3.5 sm:p-3 rounded-2xl border border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 font-bold disabled:opacity-50" placeholder="you@example.com" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Password</label>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} disabled={loadingEmail || loadingGoogle} className="w-full pl-10 pr-12 p-3.5 sm:p-3 rounded-2xl border border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 font-bold disabled:opacity-50" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {mode === 'signup' && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loadingEmail || loadingGoogle} className="w-full p-3.5 sm:p-3 rounded-2xl border border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 font-bold disabled:opacity-50" placeholder="••••••••" />
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button type="button" onClick={forgotPassword} disabled={loadingEmail || loadingGoogle} className="text-xs font-bold text-slate-400 hover:text-emerald-600">Forgot password?</button>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">{mode === 'signin' ? 'Secure Login' : 'Create Account'}</div>
            </div>

            <button type="submit" disabled={loadingEmail || loadingGoogle} className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 sm:py-3.5 text-sm font-black uppercase tracking-widest text-white transition-all ${loadingEmail ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]'} shadow-lg shadow-emerald-500/20`}>
              {loadingEmail && <span className="h-4 w-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />}
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-300">C.Busters Executive v2.5</div>
        </div>
      </div>
    </div>
  );
};

function mapFirebaseError(code?: string): string | undefined {
  switch (code) {
    case 'auth/invalid-email': return 'Enter a valid email.';
    case 'auth/user-not-found':
    case 'auth/wrong-password': return 'Wrong email or password.';
    case 'auth/email-already-in-use': return 'This email is already registered.';
    case 'auth/weak-password': return 'Password should be at least 6 characters.';
    case 'auth/too-many-requests': return 'Too many attempts. Try again later.';
    case 'auth/password-mismatch': return 'Passwords do not match.';
    default: return undefined;
  }
}

export default Login;
