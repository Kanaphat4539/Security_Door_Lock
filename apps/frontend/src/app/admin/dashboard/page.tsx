'use client';

import React, { useEffect, useState } from 'react';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { useLogStore } from '@/store/useLogStore';
import { Users, DoorOpen, AlertTriangle, Activity, Zap } from 'lucide-react';

export default function AdminDashboardPage() {
  const { isConnected } = useWebSocket();
  const { logs, recentLog } = useLogStore();
  const [stats, setStats] = useState({ totalScans: 0, granted: 0, denied: 0 });

  useEffect(() => {
    // Calculate simple stats based on logs in store (for demo purposes)
    const granted = logs.filter(l => l.status === 'GRANTED').length;
    const denied = logs.filter(l => l.status === 'DENIED' || l.status === 'ERROR').length;
    setStats({ totalScans: logs.length, granted, denied });
  }, [logs]);

  const statCards = [
    { 
      title: 'Total Scans Today', 
      value: stats.totalScans.toString(), 
      icon: Activity, 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      shadow: 'hover:shadow-blue-500/20'
    },
    { 
      title: 'Access Granted', 
      value: stats.granted.toString(), 
      icon: DoorOpen, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      shadow: 'hover:shadow-emerald-500/20'
    },
    { 
      title: 'Access Denied', 
      value: stats.denied.toString(), 
      icon: AlertTriangle, 
      color: 'text-rose-500', 
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      shadow: 'hover:shadow-rose-500/20'
    },
    { 
      title: 'Active Employees', 
      value: '124', 
      icon: Users, 
      color: 'text-purple-500', 
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      shadow: 'hover:shadow-purple-500/20'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">
            Overview Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Monitor real-time security access and system status.
          </p>
        </div>
        
        {/* Status Pill */}
        <div className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-full border shadow-sm backdrop-blur-md transition-all ${
          isConnected 
            ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50' 
            : 'bg-rose-50/80 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50'
        }`}>
          <div className="relative flex h-3 w-3">
            {isConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-rose-500'}`}></span>
          </div>
          <span className={`text-sm font-semibold tracking-wide ${isConnected ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
            {isConnected ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div 
            key={index} 
            className={`group relative overflow-hidden bg-white dark:bg-zinc-900/80 p-6 rounded-2xl border ${stat.border} shadow-sm hover:-translate-y-1 ${stat.shadow} hover:shadow-xl transition-all duration-300 backdrop-blur-xl`}
          >
            {/* Background Gradient Blob */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${stat.bg} blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500`}></div>
            
            <div className="relative z-10 flex items-center justify-between">
              <div className={`p-3.5 rounded-xl ${stat.bg} backdrop-blur-md border border-white/10 dark:border-white/5`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            
            <div className="relative z-10 mt-5">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Real-time Logs section */}
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 shadow-lg overflow-hidden transition-all">
        <div className="px-6 py-5 border-b border-slate-200/80 dark:border-zinc-800/80 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Zap className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Live Activity Stream</h2>
          </div>
          {recentLog && (
            <span className="flex items-center gap-2 text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 py-1.5 px-3 rounded-full border border-blue-200 dark:border-blue-500/20 shadow-sm animate-pulse">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              New Scan Detected
            </span>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-zinc-800/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Identity</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Entry Point</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 dark:text-zinc-500">
                      <Activity className="w-12 h-12 mb-3 opacity-20" />
                      <p className="text-sm font-medium">Monitoring for activity...</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.slice(0, 8).map((log, i) => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-600 dark:text-zinc-300">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-zinc-300 border border-slate-300/50 dark:border-zinc-600/50 shadow-sm group-hover:scale-105 transition-transform">
                          {log.userName ? log.userName.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white">
                            {log.userName || 'Unknown Identity'}
                          </div>
                          <div className="text-xs font-mono text-slate-500 dark:text-zinc-400 mt-0.5 opacity-80">
                            ID: {log.uid}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-zinc-300">
                        <DoorOpen className="w-4 h-4 text-slate-400" />
                        {log.doorId}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${
                        log.status === 'GRANTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' :
                        log.status === 'DENIED' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' :
                        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                      }`}>
                        {log.status === 'GRANTED' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>}
                        {log.status === 'DENIED' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-2"></span>}
                        {log.status === 'ERROR' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2"></span>}
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
