import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const result = await register(name.trim(), email.trim().toLowerCase(), password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.message || 'Failed to create account.');
      return;
    }
    navigate('/dashboard', { replace: true });
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
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Get Started</p>
              <h2 className="text-2xl font-bold text-text-primary mt-2">Create an account</h2>
              <p className="text-sm text-text-secondary mt-2">Enter your information to set up your profile.</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label htmlFor="reg-name" className="block text-xs font-semibold text-text-primary mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                  <input id="reg-name" type="text" autoComplete="name" value={name}
                    onChange={(e) => setName(e.target.value)} placeholder="Jane Doe"
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-border rounded-button focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
              </div>

              <div>
                <label htmlFor="reg-email" className="block text-xs font-semibold text-text-primary mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                  <input id="reg-email" type="email" autoComplete="email" value={email}
                    onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-border rounded-button focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
              </div>

              <div>
                <label htmlFor="reg-password" className="block text-xs font-semibold text-text-primary mb-1.5">Password</label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                  <input id="reg-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-border rounded-button focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="reg-confirm-password" className="block text-xs font-semibold text-text-primary mb-1.5">Confirm Password</label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                  <input id="reg-confirm-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your password"
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-border rounded-button focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
              </div>

              {error && (
                <div role="alert" className="rounded-button border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                  {error}
                </div>
              )}

              <button type="submit" disabled={isSubmitting}
                className="w-full py-2.5 rounded-button bg-primary text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity">
                {isSubmitting ? 'Creating account…' : 'Create account'}
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-text-secondary">Already have an account? </span>
                <Link to="/login" className="text-xs font-semibold text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
};
