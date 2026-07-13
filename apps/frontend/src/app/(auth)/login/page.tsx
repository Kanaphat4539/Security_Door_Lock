'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Lock, ArrowRight, Mail, Eye, EyeOff, Monitor } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import SecurityPhysicsBackground from '@/components/shared/SecurityPhysicsBackground';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Handle Theme
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark') ||
        localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) document.documentElement.classList.add('dark');
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate setting a cookie (In a real app, the server sets this via NextAuth or similar)
    let role = 'employee';
    if (email === 'admin' && password === 'admin') {
      role = 'admin';
    } else if (email.includes('admin')) {
      role = 'admin';
    }

    document.cookie = `user_role=${role}; path=/; max-age=86400`; // 1 day

    // Redirect based on role
    setTimeout(() => {
      if (role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/employee/profile');
      }
    }, 800);
  };

  return (
    <div className="min-h-screen transition-colors duration-500 font-sans relative overflow-hidden flex items-center justify-center p-4">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat bg-[url('https://media.istockphoto.com/id/1388013584/photo/cloud-computing-technology-concept-transfer-database-to-cloud-there-is-a-large-cloud-icon.webp?a=1&b=1&s=612x612&w=0&k=20&c=jSk6ApGKwFuS2yuWBEUAQXhMSmSIshHPujdM5lcX48s=')]"
      />
      {/* Overlay for better readability */}
      <div className="absolute inset-0 z-0 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-[2px]"></div>

      {/* Background ambient lighting */}
      <div className="absolute top-0 left-0 w-full h-96 bg-blue-500/20 dark:bg-blue-900/30 blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-500/20 dark:bg-indigo-600/20 blur-[120px] pointer-events-none z-0"></div>

      {/* Physics Network Background */}
      <SecurityPhysicsBackground />

      <div className="w-full max-w-lg bg-white/10 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/40 dark:border-slate-700/60 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_0_50px_-10px_rgba(59,130,246,0.4)] overflow-hidden z-10 relative transition-all duration-500 ring-1 ring-white/50 dark:ring-white/20">

        {/* Premium Top Glow Bar */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-100"></div>
        <div className="absolute -top-10 inset-x-0 h-[20px] bg-blue-500/40 blur-xl"></div>

        {/* Login Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto">

            <div className="flex justify-center mb-6">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl shadow-inner border border-blue-100 dark:border-blue-800/50">
                <Monitor className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">SECURITY LOGIN</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sign in to access your secure dashboard.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1 uppercase tracking-wider">Username or Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter username or email"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm font-medium"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Password</label>
                  <a href="#" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">Forgot password?</a>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Auto Fill Buttons */}
              <div className="flex gap-3 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => { setEmail('admin'); setPassword('admin'); }}
                  className="text-[11px] font-bold uppercase tracking-wider py-1.5 px-4 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-800/60 transition-colors border border-blue-200 dark:border-blue-800/50"
                >
                  Admin Role
                </button>
                <button
                  type="button"
                  onClick={() => { setEmail('employee'); setPassword('password'); }}
                  className="text-[11px] font-bold uppercase tracking-wider py-1.5 px-4 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                >
                  Employee Role
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full relative group overflow-hidden bg-blue-600 dark:bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Don't have an account?{' '}
                <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold transition-colors">
                  Create one now
                </Link>
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/50 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Secure, end-to-end encrypted connection
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
