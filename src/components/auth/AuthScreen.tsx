import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, KeyRound, ShieldCheck, ArrowRight, Mail } from 'lucide-react';
import { motion } from 'motion/react';

export const AuthScreen: React.FC = () => {
  const { loginWithEmail, loginWithPin, demoLogin } = useAuth();
  const [authMode, setAuthMode] = useState<'email' | 'pin'>('email');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Please enter both Email and Password');
      return;
    }

    setIsSubmitting(true);
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      setError(err?.message || 'Invalid Email or Password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const success = loginWithPin(pin);
      if (!success) {
        setError('Incorrect PIN! Admin PIN is "6472".');
        setIsSubmitting(false);
      } else {
        demoLogin();
        setIsSubmitting(false);
      }
    }, 200);
  };

  const handleQuickUnlockAdmin = () => {
    setEmail('sahil@sanzari.com');
    setPassword('admin123');
    loginWithPin('6472');
    demoLogin();
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm bg-white rounded-[32px] p-7 shadow-2xl border border-zinc-200/80 text-center"
      >
        {/* Sanzari Store Logo */}
        <div className="w-16 h-16 rounded-3xl bg-zinc-950 text-white flex items-center justify-center mx-auto mb-4 shadow-xl shadow-zinc-950/15">
          <span className="text-2xl font-black tracking-tighter">S</span>
        </div>

        <h1 className="text-xl font-black tracking-tight text-zinc-950">
          SANZARI STORE LOG IN
        </h1>
        <p className="text-xs text-zinc-500 mt-1 font-medium">
          Multi-User &amp; Staff Internal Access Portal
        </p>

        {/* Auth Mode Toggle */}
        <div className="flex bg-zinc-100 p-1 rounded-2xl border border-zinc-200/80 my-4">
          <button
            type="button"
            onClick={() => {
              setAuthMode('email');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              authMode === 'email'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Email &amp; Password
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('pin');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              authMode === 'pin'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Admin PIN (6472)
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-bold"
          >
            {error}
          </motion.div>
        )}

        {/* EMAIL & PASSWORD LOGIN FORM */}
        {authMode === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1 text-left">
                User / Staff Email *
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3 text-zinc-400" />
                <input
                  type="email"
                  placeholder="e.g. sahil@sanzari.com or staff@sanzari.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9.5 pr-4 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 text-xs font-bold text-zinc-900 focus:bg-white focus:border-zinc-900 outline-hidden transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1 text-left">
                Password *
              </label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3.5 top-3 text-zinc-400" />
                <input
                  type="password"
                  placeholder="Enter Password (admin123 or staff pass)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9.5 pr-4 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 text-xs font-bold text-zinc-900 focus:bg-white focus:border-zinc-900 outline-hidden transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email.trim() || !password.trim()}
              className="w-full py-3.5 px-4 rounded-2xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <span>{isSubmitting ? 'Authenticating...' : 'LOG IN TO STORE'}</span>
              <ArrowRight size={15} />
            </button>
          </form>
        )}

        {/* PIN LOGIN FORM */}
        {authMode === 'pin' && (
          <form onSubmit={handlePinSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5 text-left">
                Main Admin Passcode *
              </label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3.5 top-3 text-zinc-400" />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="Enter passcode (6472)"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setError(null);
                  }}
                  className="w-full pl-9.5 pr-4 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 text-sm font-black tracking-widest text-zinc-900 focus:bg-white focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-hidden transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !pin.trim()}
              className="w-full py-3.5 px-4 rounded-2xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <span>{isSubmitting ? 'Verifying PIN...' : 'UNLOCK STORE ADMIN'}</span>
              <ArrowRight size={15} />
            </button>
          </form>
        )}

        {/* Quick One-Tap Login as Main Admin Sahil */}
        <div className="mt-4 pt-3 border-t border-zinc-100">
          <button
            type="button"
            onClick={handleQuickUnlockAdmin}
            className="w-full py-2.5 px-3 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-900 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ShieldCheck size={14} className="text-violet-600" />
            <span>Login as Sahil Admin (PIN: 6472)</span>
          </button>
        </div>

        <div className="mt-5 flex items-center justify-center gap-1 text-[11px] text-zinc-400 font-medium">
          <Lock size={12} />
          <span>Secured for Sanzari Accounts</span>
        </div>
      </motion.div>
    </div>
  );
};
