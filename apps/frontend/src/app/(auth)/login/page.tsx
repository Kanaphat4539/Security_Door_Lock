'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = (role: 'admin' | 'employee') => {
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
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 px-4">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-zinc-800">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Security Door Lock</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-2">Sign in to your account</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => handleLogin('admin')}
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex justify-center items-center gap-2"
          >
            {loading ? 'Signing in...' : 'Login as Admin'}
          </button>
          
          <button
            onClick={() => handleLogin('employee')}
            disabled={loading}
            className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg border border-slate-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-colors flex justify-center items-center gap-2"
          >
            {loading ? 'Signing in...' : 'Login as Employee'}
          </button>
        </div>

        <div className="mt-8 text-center text-sm text-slate-500 dark:text-zinc-500">
          <p>For demonstration purposes only.</p>
        </div>
      </div>
    </div>
  );
}
