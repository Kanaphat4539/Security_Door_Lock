'use client';

import { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark' ||
      (savedTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleTheme = () => {
    const nextIsDark = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', nextIsDark);
    localStorage.setItem('theme', nextIsDark ? 'dark' : 'light');
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle color mode"
      className="flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 shadow-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all group active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
    >
      <Sun className="hidden dark:block w-5 h-5 text-amber-500 group-hover:rotate-90 transition-transform duration-500" />
      <Moon className="block dark:hidden w-5 h-5 text-indigo-600 group-hover:-rotate-12 transition-transform duration-500" />
      <span className="hidden sm:inline font-semibold text-sm">
        <span className="dark:hidden">Dark Mode</span>
        <span className="hidden dark:inline">Light Mode</span>
      </span>
    </button>
  );
}
