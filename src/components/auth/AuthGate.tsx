import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import App from '../../App';

export default function AuthGate() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSigningIn(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setSession(data.session);
    }

    setSigningIn(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-slate-600">Loading Together Events...</div>
      </div>
    );
  }

  if (session) return <App />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-4">
      <form onSubmit={handleLogin} className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Together Events</h1>
          <p className="text-slate-500 mt-2">Sign in to your account</p>
        </div>

        <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border border-slate-300 rounded-lg px-4 py-3 mb-5 outline-none focus:ring-2 focus:ring-slate-400"
          placeholder="Enter your email"
        />

        <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border border-slate-300 rounded-lg px-4 py-3 mb-5 outline-none focus:ring-2 focus:ring-slate-400"
          placeholder="Enter your password"
        />

        {error && (
          <div className="mb-5 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={signingIn}
          className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white rounded-lg py-3 font-medium"
        >
          {signingIn ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
