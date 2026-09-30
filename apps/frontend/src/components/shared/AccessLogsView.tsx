'use client';

import React, { useEffect, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { useLogStore } from '@/store/useLogStore';
import { SnapshotViewer } from '@/components/shared/SnapshotViewer';
import { fetchHistoryPage } from '@/services/backend';
import type { AccessLog } from '@/store/useLogStore';

export default function AccessLogsView({ guard = false }: { guard?: boolean }) {
  const { logs } = useLogStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [historyLogs, setHistoryLogs] = useState<AccessLog[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!guard) return;
    let active = true;
    fetchHistoryPage()
      .then((page) => {
        if (!active) return;
        setHistoryLogs(page.logs);
        setNextCursor(page.nextCursor);
      })
      .catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [guard, retryKey]);

  const loadMore = async () => {
    if (nextCursor === null || loading) return;
    setLoading(true);
    setLoadError(false);
    try {
      const page = await fetchHistoryPage(nextCursor);
      setHistoryLogs((current) => [...current, ...page.logs]);
      setNextCursor(page.nextCursor);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const visibleLogs = guard
    ? Array.from(new Map([...historyLogs, ...logs].map((log) => [log.id, log])).values()).sort((a, b) => b.id - a.id)
    : logs;

  // ข้อมูลจริงมาจาก store (WebSocketProvider โหลด /access/recent + realtime มาให้)
  const filteredLogs = visibleLogs.filter(log => {
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
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{guard ? 'See who scanned in or out and when. Load older events to continue through history.' : 'Door access attempts across the facility.'}</p>
        </div>
      </div>

      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xl overflow-hidden ring-1 ring-white/50 dark:ring-white/5 relative transition-all duration-500">
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row gap-4 bg-slate-50/30 dark:bg-slate-800/30">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder={guard ? 'Search loaded events by user or UID...' : 'Search by user or UID...'}
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
              <option value="granted">Granted</option>
              <option value="denied">Denied</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-700/60">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User Details</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Direction</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Image</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0 group">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </div>
                    <div>{new Date(log.createdAt).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{log.userName || 'Unknown User'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 bg-slate-100/50 dark:bg-slate-800/50 inline-block px-1.5 py-0.5 rounded">UID: {log.uid}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {log.direction ? log.direction.toUpperCase() : 'IN'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold border ${log.status === 'granted' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' :
                      log.status === 'denied' ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50' :
                        'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50'
                      }`}>
                      {log.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                    {log.imageUrl ? (
                      <SnapshotViewer src={log.imageUrl} />
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                    No loaded events match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {guard && (
        <div className="flex flex-col items-center gap-2 pb-4">
          {loadError && (
            <button type="button" onClick={() => { setLoadError(false); setRetryKey((value) => value + 1); }} className="text-sm font-bold text-red-600 dark:text-red-400 hover:underline">
              Could not load history. Retry
            </button>
          )}
          {nextCursor !== null && (
            <button type="button" onClick={loadMore} disabled={loading} className="px-5 py-2.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 disabled:opacity-50">
              {loading ? 'Loading…' : 'Load older events'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
