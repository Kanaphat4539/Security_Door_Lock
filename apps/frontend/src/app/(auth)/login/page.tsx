'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Users, Lock, KeyRound, ArrowRight, Fingerprint } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'admin' | 'employee'>('employee');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate setting a cookie (In a real app, the server sets this via NextAuth or similar)
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
    <div className="min-h-screen relative flex items-center justify-center bg-slate-950 overflow-hidden px-4 py-8">
      {/* Background decorations */}
      <div className="absolute top-0 -left-1/4 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 -right-1/4 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 relative">
        
        {/* Left side: Branding / Info */}
        <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-blue-600 to-indigo-900 text-white relative overflow-hidden">
          {/* subtle pattern overlay */}
          <div className="absolute inset-0 bg-white/5 opacity-20 mix-blend-overlay bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-16">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner shadow-white/20">
                <Fingerprint className="w-8 h-8 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight">SecureLock</span>
            </div>
            
            <h1 className="text-5xl font-extrabold leading-tight mb-6 tracking-tight">
              Next-Gen <br/> <span className="text-blue-300">Access Control.</span>
            </h1>
            <p className="text-blue-100/90 text-lg leading-relaxed max-w-sm">
              Manage your facility's security doors seamlessly. 
              Advanced authentication and real-time monitoring at your fingertips.
            </p>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-4 text-sm font-medium text-blue-200">
              <div className="w-12 h-[2px] bg-blue-400/40 rounded-full"></div>
              <span>System Version 2.0.4</span>
            </div>
          </div>
        </div>

        {/* Right side: Login Form */}
        <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-slate-950/80">
          <div className="w-full max-w-md mx-auto">
            <div className="text-center md:text-left mb-10">
              <h2 className="text-3xl font-bold text-white mb-3">Welcome Back</h2>
              <p className="text-slate-400">Please select your role to continue securely.</p>
            </div>

            {/* Role Selection */}
            <div className="flex p-1 bg-slate-900 rounded-xl mb-8 border border-slate-800 shadow-inner">
              <button
                type="button"
                onClick={() => setRole('employee')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-300 ease-out",
                  role === 'employee' 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/50" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                )}
              >
                <Users className="w-4 h-4" />
                Employee
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-300 ease-out",
                  role === 'admin' 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/50" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                )}
              >
                <Shield className="w-4 h-4" />
                Administrator
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Dummy Input for visual completeness */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">Authentication ID</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={role === 'admin' ? "admin-demo-access" : "emp-demo-access"}
                    readOnly
                    className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-slate-500 ml-1 mt-2">Read-only token for demonstration purposes.</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full relative group overflow-hidden bg-white text-slate-900 font-semibold py-4 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In as {role === 'admin' ? 'Admin' : 'Employee'}</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </>
                  )}
                </div>
              </button>
            </form>

            <div className="mt-10 pt-6 border-t border-slate-800/50 text-center">
              <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
                <KeyRound className="w-4 h-4" />
                Secure, end-to-end encrypted connection
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
