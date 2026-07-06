'use client';

import React, { useEffect, useState } from 'react';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { useLogStore } from '@/store/useLogStore';
import { Users, DoorOpen, AlertTriangle, Activity } from 'lucide-react';

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
    { title: 'Total Scans Today', value: stats.totalScans.toString(), icon: Activity, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { title: 'Access Granted', value: stats.granted.toString(), icon: DoorOpen, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
    { title: 'Access Denied', value: stats.denied.toString(), icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    { title: 'Active Employees', value: '124', icon: Users, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  ];

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            {isConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
            System Status: {isConnected ? 'Online (Real-time Active)' : 'Offline (Disconnected)'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center">
            <div className={`p-4 rounded-full ${stat.bg} mr-4`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">{stat.title}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Real-time Logs section */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Access Logs (Live)</h2>
          {recentLog && (
            <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 py-1 px-2 rounded-full animate-pulse">
              New activity detected
            </span>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-zinc-800/50">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Door ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500 dark:text-zinc-500">
                    No recent activity. Waiting for scans...
                  </td>
                </tr>
              ) : (
                logs.slice(0, 5).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-zinc-300">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-medium text-slate-600 dark:text-zinc-300 mr-3">
                          {log.userName ? log.userName.charAt(0) : '?'}
                        </div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {log.userName || 'Unknown User'}
                          <div className="text-xs text-slate-500 dark:text-zinc-500 font-normal">UID: {log.uid}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-zinc-300">
                      {log.doorId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.status === 'GRANTED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        log.status === 'DENIED' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
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
