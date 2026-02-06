
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLogin: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (mode === 'login') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        if (data.user) onLogin(data.user);
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          }
        });
        if (signUpError) throw signUpError;
        
        if (data.user) {
          setSuccess('একাউন্ট তৈরি সফল হয়েছে! আপনার ইমেইল চেক করুন অথবা সরাসরি লগইন করার চেষ্টা করুন।');
          setMode('login');
          setPassword('');
        }
      }
    } catch (err: any) {
      let errorMessage = 'একটি সমস্যা হয়েছে';
      if (err.message.includes('Invalid login credentials')) {
        errorMessage = 'ভুল ইমেইল অথবা পাসওয়ার্ড';
      } else if (err.message.includes('User already registered')) {
        errorMessage = 'এই ইমেইল দিয়ে ইতিমধ্যে একাউন্ট তৈরি করা আছে';
      } else if (err.message.includes('Password should be at least 6 characters')) {
        errorMessage = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে';
      } else {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 w-full max-w-md animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center text-5xl mx-auto mb-6 shadow-xl shadow-blue-100">🪙</div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">হিসাব রক্ষক</h1>
          <p className="text-slate-500 mt-3 font-medium">আপনার ফিন্যান্সিয়াল লাইফ সহজ করুন</p>
        </div>

        <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-8">
          <button 
            type="button" 
            onClick={() => { setMode('login'); setError(null); setSuccess(null); }} 
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${mode === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
          >
            লগইন
          </button>
          <button 
            type="button" 
            onClick={() => { setMode('signup'); setError(null); setSuccess(null); }} 
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${mode === 'signup' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
          >
            নতুন একাউন্ট
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-sm mb-6 border border-rose-100 font-medium flex items-center gap-2">
            <span className="text-lg">⚠️</span> {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-sm mb-6 border border-emerald-100 font-medium flex items-center gap-2">
            <span className="text-lg">✅</span> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">ইমেইল ঠিকানা</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-2xl p-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition font-medium"
              placeholder="example@mail.com"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">পাসওয়ার্ড</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-2xl p-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition font-medium tracking-widest"
              placeholder="••••••••"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full bg-blue-600 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-100 mt-6 active:scale-[0.98] ${loading ? 'opacity-50' : 'hover:bg-blue-700'}`}
          >
            {loading ? 'প্রসেসিং হচ্ছে...' : (mode === 'login' ? 'প্রবেশ করুন' : 'একাউন্ট তৈরি করুন')}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-50 text-center">
          <p className="text-slate-500 text-sm font-medium">
            {mode === 'login' ? 'নতুন ইউজার?' : 'ইতিমধ্যে একাউন্ট আছে?'} 
            <button 
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setSuccess(null); }}
              className="text-blue-600 font-black ml-1.5 hover:underline decoration-2"
            >
              {mode === 'login' ? 'একাউন্ট তৈরি করুন' : 'লগইন করুন'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
