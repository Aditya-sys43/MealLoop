import React, { useState } from 'react';
import { X, Mail, Lock, User, Phone, Building2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { translateAuthError, useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { BOOTSTRAPPED_ADMIN_EMAIL } from '../types/mealloop';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthSuccess?: (role: string) => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

export function AuthModal({ open, onClose, onAuthSuccess }: AuthModalProps) {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, requestPasswordReset } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<AuthMode>('login');
  const [role, setRole] = useState<'student' | 'provider'>('student');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [hostelOrPg, setHostelOrPg] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  if (!open) return null;

  const handleGoogle = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const prof = await loginWithGoogle(role);
      showToast(`Welcome, ${prof.displayName}`, 'success');
      onAuthSuccess?.(prof.role);
      onClose();
    } catch (err) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      try {
        await requestPasswordReset(email);
        setResetSent(true);
        showToast('Password reset link sent to your email.', 'success');
      } catch (err) {
        setErrorMsg(translateAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'register') {
      if (displayName.trim().length < 2) {
        setErrorMsg('Please enter your full name.');
        return;
      }
      setLoading(true);
      try {
        const prof = await registerWithEmail({
          displayName,
          email,
          password,
          phone,
          hostelOrPg: hostelOrPg || (role === 'provider' ? 'Dehradun Kitchen' : 'DBS Global University Hostel'),
          role,
        });
        showToast('Account created. Verification email sent!', 'success');
        onAuthSuccess?.(prof.role);
        onClose();
      } catch (err) {
        setErrorMsg(translateAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const prof = await loginWithEmail(email, password);
      showToast(`Signed in as ${prof.displayName}`, 'success');
      onAuthSuccess?.(prof.role);
      onClose();
    } catch (err) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl my-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign in dialog"
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <p className="text-xs font-medium text-emerald-700 mb-1">
            DBS Global University · Dehradun
          </p>
          <h2 id="auth-modal-title" className="font-display text-2xl font-bold text-slate-900">
            {mode === 'login'
              ? 'Sign in to MealLoop'
              : mode === 'register'
                ? 'Create your MealLoop account'
                : 'Reset your password'}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            {mode === 'login'
              ? 'Access your meal subscriptions, orders, or kitchen portal.'
              : mode === 'register'
                ? 'Join as a hostel/PG student or local food partner.'
                : 'Enter your registered email to receive a reset link.'}
          </p>
        </div>

        {/* Role Selector for Registration / Google Sign-Up */}
        {mode !== 'forgot' && (
          <div className="mb-5">
            <span className="block text-xs font-medium text-slate-600 mb-2">
              {mode === 'register' ? 'Register as' : 'Account Role (for first-time Google sign-in)'}
            </span>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                  role === 'student'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Student / Customer
              </button>
              <button
                type="button"
                onClick={() => setRole('provider')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                  role === 'provider'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Food Provider
              </button>
            </div>
          </div>
        )}

        {/* Continue with Google */}
        {mode !== 'forgot' && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
              <div className="h-px flex-1 bg-slate-200" />
              <span>or continue with email</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
          </>
        )}

        {errorMsg && (
          <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {resetSent && mode === 'forgot' && (
          <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
            <span>Password reset email sent. Check your inbox and spam folder.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Aditya Bhatt"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                maxLength={200}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@dgu.ac.in"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMsg(null);
                      setResetSent(false);
                    }}
                    className="text-xs font-medium text-emerald-700 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    maxLength={20}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98XXXXXXXX"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {role === 'provider' ? 'Kitchen Area' : 'Hostel / PG'}
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    maxLength={160}
                    value={hostelOrPg}
                    onChange={(e) => setHostelOrPg(e.target.value)}
                    placeholder={role === 'provider' ? 'Selaqui, Dehradun' : 'DBS Boys Hostel B'}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
                ? 'Sign In'
                : mode === 'register'
                  ? 'Create Account'
                  : 'Send Reset Link'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100 text-center text-xs text-slate-600 space-y-2">
          {mode === 'login' ? (
            <p>
              New to MealLoop?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                }}
                className="font-semibold text-orange-600 hover:underline"
              >
                Create a free account
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className="font-semibold text-emerald-700 hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
          <p className="text-[11px] text-slate-400">
            Platform Admin access: sign in with {BOOTSTRAPPED_ADMIN_EMAIL}
          </p>
        </div>
      </div>
    </div>
  );
}
