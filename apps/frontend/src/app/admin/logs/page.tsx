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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Access History Logs</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Complete history of all door access attempts across the facility.</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-sm font-medium rounded-lg transition-colors shadow-sm">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by user or UID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-zinc-700 rounded-lg leading-5 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            />
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-slate-400" />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full pl-9 pr-10 py-2 border border-slate-300 dark:border-zinc-700 rounded-lg leading-5 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors appearance-none"
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
              <tr className="bg-slate-50 dark:bg-zinc-800/50">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">User Details</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Door ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Image</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-zinc-300">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </div>
                    <div>{new Date(log.timestamp).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{log.userName || 'Unknown User'}</div>
                    <div className="text-xs text-slate-500 dark:text-zinc-500 font-mono mt-1">UID: {log.uid}</div>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-zinc-300">
                    {log.status === 'DENIED' ? (
                      <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-xs underline">
                        View Snapshot
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-zinc-500">
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
