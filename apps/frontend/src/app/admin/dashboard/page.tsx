'use client';

import React, { useEffect, useState } from 'react';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { useLogStore } from '@/store/useLogStore';
import { Lock, Users, Activity, Battery, Wifi, Unlock, Monitor, AlertTriangle, UserPlus, Settings, FileText, Info, Sun, Moon, Shield, ShieldCheck, Power, RefreshCw, ShieldAlert, DoorClosed, Server, Key } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { isConnected } = useWebSocket();
  const { logs } = useLogStore();
  const [stats, setStats] = useState({ totalScans: 0, granted: 0, denied: 0 });
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark') ||
        localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDarkMode(isDark);
      if (isDark) document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    const granted = logs.filter(l => l.status === 'GRANTED').length;
    const denied = logs.filter(l => l.status === 'DENIED' || l.status === 'ERROR').length;
    setStats({ totalScans: logs.length, granted, denied });
  }, [logs]);

  const handleLockdown = () => {
    alert("SYSTEM LOCKDOWN INITIATED. All access revoked. Doors locked.");
  };

  const handlePing = () => {
    alert("Pinging devices... All sensors responding.");
  };

  // Determine current door state mock (in real app, this comes from WebSocket)
  const latestLog = logs[0];
  const isRecentlyUnlocked = latestLog && latestLog.status === 'GRANTED' && (Date.now() - new Date(latestLog.timestamp).getTime() < 8000);
  const doorState = isRecentlyUnlocked ? 'UNLOCKED' : 'LOCKED';

  return (
    <div className="min-h-screen bg-transparent transition-colors duration-500 p-4 md:p-8 font-sans relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-0 w-full h-96 bg-blue-500/10 dark:bg-blue-900/20 blur-[120px] pointer-events-none -z-10"></div>

      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Monitor className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Security Door Lock
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 font-medium">Real-time facility monitoring and physical access control.</p>
        </div>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 shadow-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all self-start md:self-auto group active:scale-95"
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-amber-500 group-hover:rotate-90 transition-transform duration-500" /> : <Moon className="w-5 h-5 text-indigo-600 group-hover:-rotate-12 transition-transform duration-500" />}
          <span className="font-semibold text-sm">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </header>

      <div className="grid grid-cols-12 gap-6 relative z-10">

        {/* MAIN CONTENT AREA */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">

          {/* Security & System Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* 1. Control Panel (Door State & Quick Actions) */}
            <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-blue-100/80 dark:border-blue-800/50 relative overflow-hidden flex flex-col justify-between transition-all duration-500 hover:shadow-blue-500/20 hover:border-blue-300/80 dark:hover:border-blue-600/60 hover:-translate-y-1">
              {/* Decorative accent */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-400/20 dark:bg-blue-600/20 blur-3xl rounded-full pointer-events-none transition-colors duration-500"></div>
              <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Control Panel</h3>
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isConnected ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${doorState === 'LOCKED' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 animate-pulse'}`}>
                      {doorState === 'LOCKED' ? <DoorClosed className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Physical Door</p>
                      <p className={`text-sm font-black ${doorState === 'LOCKED' ? 'text-slate-900 dark:text-white' : 'text-amber-600 dark:text-amber-400'}`}>
                        {doorState}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button onClick={handleLockdown} className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 transition-colors active:scale-95">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Lockdown</span>
                  </button>
                  <button onClick={handlePing} className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors active:scale-95">
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Ping Sensor</span>
                  </button>
                </div>
              </div>
              </div>
            </div>

            {/* 2. Security Metrics (Threats & Scans) */}
            <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-emerald-100/80 dark:border-emerald-800/50 relative overflow-hidden flex flex-col justify-between transition-all duration-500 hover:shadow-emerald-500/20 hover:border-emerald-300/80 dark:hover:border-emerald-600/60 hover:-translate-y-1">
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-400/20 dark:bg-emerald-600/20 blur-3xl rounded-full pointer-events-none transition-colors duration-500"></div>
              <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Security Metrics</h3>
                <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-md text-blue-600 dark:text-blue-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Unauthorized Attempts</p>
                    <span className="text-4xl font-black text-red-600 dark:text-red-500 block leading-none mt-1.5">{stats.denied}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Scans</p>
                    <span className="text-xl font-bold text-slate-900 dark:text-white">{stats.totalScans}</span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-1 shadow-inner">
                  {/* Visual ratio of denied vs granted */}
                  <div className="flex h-full w-full">
                    <div className="bg-red-500 h-full" style={{ width: `${stats.totalScans > 0 ? (stats.denied / stats.totalScans) * 100 : 0}%` }}></div>
                    <div className="bg-emerald-500 h-full" style={{ width: `${stats.totalScans > 0 ? (stats.granted / stats.totalScans) * 100 : 100}%` }}></div>
                  </div>
                </div>
              </div>
              </div>
            </div>

            {/* 3. Hardware & Network Status */}
            <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-indigo-100/80 dark:border-indigo-800/50 relative overflow-hidden flex flex-col justify-between transition-all duration-500 hover:shadow-indigo-500/20 hover:border-indigo-300/80 dark:hover:border-indigo-600/60 hover:-translate-y-1">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-400/20 dark:bg-indigo-600/20 blur-3xl rounded-full pointer-events-none transition-colors duration-500"></div>
              <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hardware Status</h3>
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-md text-indigo-600 dark:text-indigo-400">
                  <Server className="w-4 h-4" />
                </div>
              </div>

              <div className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Battery className="w-3.5 h-3.5" /> Battery</span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">98%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5" /> Network latency</span>
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400">24 ms</span>
                </div>
                <div className="mt-1 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">System Uptime</span>
                    <span className="text-sm font-black text-emerald-500 dark:text-emerald-400">99.98%</span>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>

          {/* Live Access Stream & Trends */}
          <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-700/60 overflow-hidden flex flex-col ring-1 ring-white/50 dark:ring-white/5 relative transition-all duration-500">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"></div>
            <div className="p-5 border-b border-slate-200 dark:border-slate-800/60 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 transition-colors duration-500">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" /> Live Access Stream
              </h3>
              <Link href="/admin/logs" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors">
                View Log History
              </Link>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 divide-y xl:divide-y-0 xl:divide-x divide-slate-200 dark:divide-slate-800/60">
              {/* Left side: Access Table */}
              <div className="xl:col-span-2 overflow-x-auto p-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
                      <th className="py-3 px-5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Timestamp</th>
                      <th className="py-3 px-5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Identity</th>
                      <th className="py-3 px-5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Access Point</th>
                      <th className="py-3 px-5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 px-6 text-center text-slate-500 dark:text-slate-400 font-medium">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <Activity className="w-8 h-8 text-slate-300 dark:text-slate-600 animate-pulse" />
                            Monitoring for entry attempts...
                          </div>
                        </td>
                      </tr>
                    ) : (
                      logs.slice(0, 5).map(log => (
                        <tr key={log.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${log.status === 'DENIED' || log.status === 'ERROR' ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}>
                          <td className="py-3.5 px-5 text-sm font-medium text-slate-500 dark:text-slate-400">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="py-3.5 px-5 text-sm text-slate-900 dark:text-white font-medium flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${log.status === 'GRANTED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                              'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                              }`}>
                              {log.userName ? log.userName.charAt(0).toUpperCase() : <Key className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <div className="font-bold text-sm leading-none">{log.userName || 'Unknown RFID'}</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">ID: {log.uid}</div>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-xs font-bold text-slate-700 dark:text-slate-300">{log.doorId}</td>
                          <td className="py-3.5 px-5">
                            {log.status === 'GRANTED' && (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-1 rounded-md">
                                <Unlock className="w-3 h-3" /> GRANTED
                              </span>
                            )}
                            {log.status === 'DENIED' && (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-red-700 bg-red-100 border border-red-200 dark:border-red-800/50 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded-md">
                                <AlertTriangle className="w-3 h-3" /> DENIED
                              </span>
                            )}
                            {log.status === 'ERROR' && (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 dark:border-amber-800/50 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-1 rounded-md">
                                <AlertTriangle className="w-3 h-3" /> ERROR
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Right side: Access Trends Bar Chart Placeholder */}
              <div className="xl:col-span-1 p-5 bg-slate-50/30 dark:bg-slate-900/20 flex flex-col justify-center min-h-[200px]">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider flex items-center justify-between">
                  Access Volume (Today)
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">Last 12h</span>
                </h4>
                <div className="flex items-end gap-1.5 h-28 mt-auto">
                  {[20, 35, 15, 60, 90, 45, 80, 100, 30, 10, 5, 25].map((height, i) => (
                    <div key={i} className="flex-1 bg-blue-100 dark:bg-blue-900/30 rounded-t-sm relative group h-full flex items-end">
                      <div
                        className="w-full bg-blue-500 dark:bg-blue-500/80 rounded-t-sm transition-all duration-500 group-hover:bg-cyan-400"
                        style={{ height: `${height}%` }}
                      ></div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-3 text-[10px] text-slate-400 font-bold">
                  <span>08:00</span>
                  <span>14:00</span>
                  <span>20:00</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SIDEBAR AREA */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">



          <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-indigo-100 dark:border-indigo-800/50 relative overflow-hidden transition-all duration-500 hover:shadow-indigo-500/10">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-400/15 dark:bg-indigo-600/15 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none transition-colors duration-500"></div>
            <div className="relative z-10">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-500" /> Administration
            </h3>
            <div className="flex flex-col gap-2.5">
              <Link href="/admin/users" className="w-full bg-blue-600 dark:bg-blue-600 text-white text-xs font-bold py-3 rounded-xl hover:bg-blue-700 dark:hover:bg-blue-500 transition-all shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:-translate-y-0.5 flex items-center justify-center gap-2 active:scale-95">
                <UserPlus className="w-4 h-4" />
                Register New User
              </Link>
              <Link href="/admin/users" className="w-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 shadow-sm hover:-translate-y-0.5 flex items-center justify-center gap-2 active:scale-95">
                <Shield className="w-4 h-4" />
                Manage Permissions
              </Link>
            </div>
            </div>
          </div>

          {/* System Notification Area */}
          <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-slate-200/80 dark:border-slate-700/60 relative overflow-hidden transition-all duration-500">
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-slate-400/10 dark:bg-slate-600/10 blur-3xl rounded-full pointer-events-none transition-colors duration-500"></div>
            <div className="relative z-10">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">System Alerts</h3>
            <div className="flex flex-col gap-3">
              <div className="flex gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg h-fit">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Scheduled Update</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 font-medium leading-relaxed">Firmware update at 02:00 AM tonight.</p>
                </div>
              </div>

              {!isConnected && (
                <div className="flex gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 animate-pulse">
                  <div className="p-1.5 bg-red-100 dark:bg-red-900/40 rounded-lg h-fit">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Connection Lost</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 font-medium leading-relaxed">WebSocket disconnected.</p>
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}


