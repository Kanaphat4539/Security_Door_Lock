'use client';

import React, { useEffect, useState } from 'react';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { useLogStore } from '@/store/useLogStore';
import { Lock, Users, Activity, Battery, Wifi, Unlock, Monitor, AlertTriangle, UserPlus, Settings, FileText, Info } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { isConnected } = useWebSocket();
  const { logs } = useLogStore();
  const [stats, setStats] = useState({ totalScans: 0, granted: 0, denied: 0 });

  useEffect(() => {
    const granted = logs.filter(l => l.status === 'GRANTED').length;
    const denied = logs.filter(l => l.status === 'DENIED' || l.status === 'ERROR').length;
    setStats({ totalScans: logs.length, granted, denied });
  }, [logs]);

  return (
    <div className="min-h-screen">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-blue-950 dark:text-white">Overview</h1>
        <p className="text-base text-slate-600 dark:text-zinc-400 mt-2">Real-time facility status and recent activity.</p>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* Bento Grid: Quick Overview (8 columns) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          
          {/* Status Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Main Entrance Status */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-md border border-slate-200 dark:border-zinc-800 relative overflow-hidden flex flex-col items-center justify-center text-center">
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className={`text-xs font-semibold uppercase tracking-wider ${isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 border-2 ${isConnected ? 'bg-emerald-500/10 border-emerald-500' : 'bg-red-500/10 border-red-500'}`}>
                {isConnected ? (
                  <Lock className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
                )}
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Main System</h3>
              <p className={`text-sm font-bold px-4 py-1.5 rounded-full ${isConnected ? 'text-emerald-700 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-500/20' : 'text-red-700 bg-red-500/10 dark:text-red-400 dark:bg-red-500/20'}`}>
                {isConnected ? 'SECURE' : 'OFFLINE'}
              </p>
            </div>

            {/* Active Users */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-md border border-slate-200 dark:border-zinc-800 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Total Scans</h3>
                <Users className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <span className="text-4xl font-bold text-blue-950 dark:text-white block leading-none mb-2">{stats.totalScans}</span>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  {stats.granted} granted, {stats.denied} denied
                </p>
              </div>
            </div>

            {/* System Health */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-md border border-slate-200 dark:border-zinc-800 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">System Health</h3>
                <Activity className="w-5 h-5 text-slate-400" />
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900 dark:text-zinc-100 flex items-center gap-1.5"><Battery className="w-4 h-4" /> Battery</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">98%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '98%' }}></div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-zinc-100 flex items-center gap-1.5"><Wifi className="w-4 h-4" /> Network</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Strong</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-md border border-slate-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-zinc-800/50">
              <h3 className="text-xl font-semibold text-blue-950 dark:text-white">Recent Activity</h3>
              <Link href="/admin/logs" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">View All</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-800">
                    <th className="py-3 px-6 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Time</th>
                    <th className="py-3 px-6 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">User</th>
                    <th className="py-3 px-6 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Door</th>
                    <th className="py-3 px-6 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 px-6 text-center text-slate-500 dark:text-zinc-400">
                        Monitoring for activity...
                      </td>
                    </tr>
                  ) : (
                    logs.slice(0, 5).map(log => (
                      <tr key={log.id} className={`hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors ${log.status === 'DENIED' || log.status === 'ERROR' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                        <td className="py-4 px-6 text-sm text-slate-500 dark:text-zinc-400">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-900 dark:text-white font-medium flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            log.status === 'GRANTED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
                          }`}>
                            {log.userName ? log.userName.charAt(0) : '?'}
                          </div>
                          <div>
                            <div>{log.userName || 'Unknown'}</div>
                            <div className="text-xs text-slate-500 font-normal">UID: {log.uid}</div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-900 dark:text-white">{log.doorId}</td>
                        <td className="py-4 px-6">
                          {log.status === 'GRANTED' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-1 rounded-sm">
                              <Unlock className="w-3.5 h-3.5" /> Unlocked
                            </span>
                          )}
                          {log.status === 'DENIED' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded-sm">
                              <AlertTriangle className="w-3.5 h-3.5" /> Access Denied
                            </span>
                          )}
                          {log.status === 'ERROR' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-1 rounded-sm">
                              <AlertTriangle className="w-3.5 h-3.5" /> Error
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar: Quick Actions (4 columns) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-md border border-slate-200 dark:border-zinc-800">
            <h3 className="text-xl font-semibold text-blue-950 dark:text-white mb-4">Quick Actions</h3>
            <div className="flex flex-col gap-3">
              <Link href="/admin/users" className="w-full bg-blue-950 dark:bg-blue-600 text-white text-sm font-medium py-3 rounded-lg hover:bg-blue-900 dark:hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]">
                <UserPlus className="w-5 h-5" />
                Invite New User
              </Link>
              <Link href="/admin/users" className="w-full bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-sm font-medium py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700 flex items-center justify-center gap-2 active:scale-[0.98]">
                <Settings className="w-5 h-5" />
                Manage Roles
              </Link>
              <Link href="/admin/logs" className="w-full bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white text-sm font-medium py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors border border-slate-200 dark:border-zinc-700 flex items-center justify-center gap-2 active:scale-[0.98]">
                <FileText className="w-5 h-5" />
                View Full Logs
              </Link>
            </div>
          </div>

          {/* System Notification Area */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-md border border-slate-200 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-4">System Alerts</h3>
            <div className="flex flex-col gap-3">
              <div className="flex gap-4 p-4 rounded-lg bg-slate-100 dark:bg-zinc-800 border-l-4 border-blue-950 dark:border-blue-500">
                <Info className="w-5 h-5 text-blue-950 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-slate-900 dark:text-zinc-100">Scheduled Maintenance</h4>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">System update scheduled for 02:00 AM tonight.</p>
                </div>
              </div>
              {!isConnected && (
                <div className="flex gap-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600 dark:border-red-500">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 dark:text-zinc-100">WebSocket Disconnected</h4>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Unable to receive real-time updates. Check server status.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
