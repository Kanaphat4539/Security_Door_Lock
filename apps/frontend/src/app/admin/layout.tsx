'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, FileText, LogOut, Shield } from 'lucide-react';
import { WebSocketProvider } from '@/providers/WebSocketProvider';

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
      <div className="min-h-screen flex bg-slate-50 dark:bg-zinc-950">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-zinc-800">
            <Shield className="w-6 h-6 text-blue-600 mr-2" />
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
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' 
                      : 'text-slate-700 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-700 dark:text-blue-400' : 'text-slate-400 dark:text-zinc-500'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200 dark:border-zinc-800">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3 text-red-500 dark:text-red-400" />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 flex items-center justify-between px-8 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
              {navItems.find(item => item.href === pathname)?.name || 'Admin'}
            </h1>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold">
                A
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
