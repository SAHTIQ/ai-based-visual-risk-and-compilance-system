import React, { FormEvent, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const destination = (location.state as { from?: string } | null)?.from || '/dashboard';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.message || 'Invalid email or password.');
      return;
    }
    navigate(destination, { replace: true });
  };

  const useDemoAccount = () => {
    setEmail('alex.morgan@example.com');
    setPassword('password123');
    setError('');
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 bg-surface border border-border rounded-2xl shadow-xl overflow-hidden">
        <section className="hidden lg:flex bg-primary text-white p-10 flex-col justify-between min-h-[620px]">
          <div>
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-white/70">Analytics & ML</p>
            <h1 className="text-4xl font-bold mt-3 leading-tight">
              Understand your habits. Measure your progress.
            </h1>
            <p className="text-sm text-white/75 mt-5 max-w-md leading-6">
              Track work sessions, study, habits and financial activity in one private personal analytics workspace.
            </p>
          </div>
          <div className="space-y-3 text-sm text-white/80">
            <div className="flex items-center gap-3"><Sparkles className="w-4 h-4" /> Simple, explainable analytics</div>
            <div className="flex items-center gap-3"><ShieldCheck className="w-4 h-4" /> User-specific data protection</div>
          </div>
        </section>

        <section className="p-7 sm:p-10 lg:p-12 flex items-center">
          <div className="w-full max-w-md mx-auto">
            <div className="mb-8">
              <div className="lg:hidden w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center mb-5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">User Profile</p>
              <h2 className="text-2xl font-bold text-text-primary mt-2">Sign in to your account</h2>
              <p className="text-sm text-text-secondary mt-2">Continue to your personal analytics dashboard.</p>
            </div>

            <form onSubmit={submit} className="space-y-5">
              <div>
                <label htmlFor="login-email" className="block text-xs font-semibold text-text-primary mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                  <input id="login-email" type="email" autoComplete="email" value={email}
                    onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-border rounded-button focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-semibold text-text-primary mb-1.5">Password</label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                  <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-border rounded-button focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="rounded-button border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                  {error}
                </div>
              )}

              <button type="submit" disabled={isSubmitting}
                className="w-full py-2.5 rounded-button bg-primary text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity">
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </button>

              <button type="button" onClick={useDemoAccount}
                className="w-full py-2.5 rounded-button border border-border text-sm font-semibold text-text-primary hover:bg-background transition-colors">
                Use demo account
              </button>
            </form>

            <p className="text-[11px] text-text-secondary mt-7 text-center">
              Your session is maintained using a secure HTTP-only cookie.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};
