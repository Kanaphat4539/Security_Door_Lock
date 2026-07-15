'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, FileText, LogOut, Shield, Menu, X } from 'lucide-react';
import { WebSocketProvider } from '@/providers/WebSocketProvider';
import ParticleBackground from '@/components/shared/ParticleBackground';
import MouseTrail from '@/components/shared/MouseTrail';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        {/* Sidebar */}
        <aside className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 bg-white/95 dark:bg-zinc-900/95 md:bg-white/40 md:dark:bg-zinc-900/40 backdrop-blur-xl border-r border-slate-200/50 dark:border-zinc-800/50 flex flex-col
          transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="h-16 shrink-0 flex items-center justify-between px-6 border-b border-slate-200/50 dark:border-zinc-800/50">
            <div className="flex items-center">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2" />
              <span className="font-bold text-lg text-slate-900 dark:text-white">Admin Panel</span>
            </div>
            <button 
              className="md:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
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
        <main className="flex-1 flex flex-col overflow-hidden relative z-10 w-full">
          <header className="h-16 shrink-0 flex items-center justify-between px-4 md:px-8 bg-white/30 dark:bg-zinc-900/30 backdrop-blur-md border-b border-slate-200/50 dark:border-zinc-800/50">
            <div className="flex items-center gap-3 min-w-0">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 -ml-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/10 transition-colors shrink-0"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white truncate">
                {navItems.find(item => item.href === pathname)?.name || 'Admin'}
              </h1>
            </div>
            <div className="flex items-center gap-4 shrink-0">
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
          
          <div className="flex-1 overflow-auto p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </WebSocketProvider>
  );
}
