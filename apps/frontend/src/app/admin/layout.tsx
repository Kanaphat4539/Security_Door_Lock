'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, FileText, LogOut, Shield } from 'lucide-react';
import { WebSocketProvider } from '@/providers/WebSocketProvider';
import ParticleBackground from '@/components/shared/ParticleBackground';
import MouseTrail from '@/components/shared/MouseTrail';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    router.push('/login');
  };

  const navItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Access Logs', href: '/admin/logs', icon: FileText },
  ];

  return (
    <WebSocketProvider>
      <div 
        className="min-h-screen flex relative bg-[url('https://images.unsplash.com/photo-1548092372-0d1bd40894a3?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c2VjdXJpdHl8ZW58MHx8MHx8fDA%3D')] bg-cover bg-center bg-fixed"
      >
        <MouseTrail />
        <div className="absolute inset-0 bg-slate-50/70 dark:bg-black/70 pointer-events-none z-0 transition-colors duration-500"></div>
        <ParticleBackground />
        {/* Sidebar */}
        <aside className="w-64 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border-r border-slate-200/50 dark:border-zinc-800/50 flex flex-col relative z-10">
          <div className="h-16 flex items-center px-6 border-b border-slate-200/50 dark:border-zinc-800/50">
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2" />
            <span className="font-bold text-lg text-slate-900 dark:text-white">Admin Panel</span>
          </div>
          
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                    isActive 
                      ? 'bg-blue-600/10 text-blue-700 dark:bg-blue-500/30 dark:text-white' 
                      : 'text-slate-600 hover:bg-white/50 dark:text-slate-300 dark:hover:bg-white/10'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden relative z-10">
          <header className="h-16 flex items-center justify-between px-8 bg-white/30 dark:bg-zinc-900/30 backdrop-blur-md border-b border-slate-200/50 dark:border-zinc-800/50">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
              {navItems.find(item => item.href === pathname)?.name || 'Admin'}
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold">
                  A
                </div>
                <div className="h-6 w-px bg-slate-300 dark:bg-zinc-700"></div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            </div>
          </header>
          
          <div className="flex-1 overflow-auto p-8">
            {children}
          </div>
        </main>
      </div>
    </WebSocketProvider>
  );
}
