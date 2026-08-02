'use client';

import React, { useState } from 'react';
import { Search, Filter, Download } from 'lucide-react';
import { useLogStore } from '@/store/useLogStore';

export default function AdminLogsPage() {
  const { logs } = useLogStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Fallback to mock data if store is empty for demonstration
  const displayLogs = logs.length > 0 ? logs : [
    { id: '1', userName: 'John Doe', uid: 'A1B2C3D4', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), status: 'GRANTED', doorId: 'Main Entrance' },
    { id: '2', userName: 'Unknown', uid: 'UNKNOWN_123', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), status: 'DENIED', doorId: 'Back Door' },
    { id: '3', userName: 'Jane Smith', uid: 'E5F6G7H8', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), status: 'GRANTED', doorId: 'Main Entrance' },
  ];

  const filteredLogs = displayLogs.filter(log => {
    const matchesSearch = (log.userName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      log.uid.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xl ring-1 ring-white/50 dark:ring-white/5 relative overflow-hidden transition-all duration-500 hover:shadow-blue-500/10 hover:border-blue-200/80 dark:hover:border-blue-800/50">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-400/10 dark:bg-blue-600/10 blur-3xl rounded-full pointer-events-none transition-colors duration-500"></div>
        <div className="relative z-10">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Access History Logs</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Complete history of all door access attempts across the facility.</p>
        </div>
        <button className="relative z-10 flex items-center px-4 py-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 group">
          <Download className="w-4 h-4 mr-2 group-hover:-translate-y-0.5 transition-transform" />
          Export CSV
        </button>
      </div>

      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xl overflow-hidden ring-1 ring-white/50 dark:ring-white/5 relative transition-all duration-500">
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row gap-4 bg-slate-50/30 dark:bg-slate-800/30">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by user or UID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-200/60 dark:border-slate-700/60 rounded-xl leading-5 bg-white/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50 sm:text-sm transition-all backdrop-blur-sm shadow-inner hover:bg-white/80 dark:hover:bg-slate-800/80"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-slate-400" />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full pl-9 pr-10 py-2.5 border border-slate-200/60 dark:border-slate-700/60 rounded-xl leading-5 bg-white/50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500/50 sm:text-sm transition-all appearance-none backdrop-blur-sm shadow-inner hover:bg-white/80 dark:hover:bg-slate-800/80"
            >
              <option value="ALL">All Status</option>
              <option value="GRANTED">Granted</option>
              <option value="DENIED">Denied</option>
              <option value="ERROR">Error</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-700/60">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User Details</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Door ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Image</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0 group">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </div>
                    <div>{new Date(log.timestamp).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{log.userName || 'Unknown User'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 bg-slate-100/50 dark:bg-slate-800/50 inline-block px-1.5 py-0.5 rounded">UID: {log.uid}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {log.doorId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold border ${log.status === 'GRANTED' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' :
                        log.status === 'DENIED' ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50' :
                          'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50'
                      }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                    {log.status === 'DENIED' ? (
                      <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-bold text-xs underline underline-offset-2 transition-colors">
                        View Snapshot
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                    No logs found matching your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
