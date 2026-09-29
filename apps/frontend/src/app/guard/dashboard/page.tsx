'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, ArrowDownLeft, ArrowUpRight, Clock3, FileText, Monitor, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { fetchStats, type AccessStats } from '@/services/backend';
import { useLogStore } from '@/store/useLogStore';

const timeOf = (value: string) => new Date(value).toLocaleString('th-TH', {
  dateStyle: 'short',
  timeStyle: 'medium',
});

export default function GuardDashboardPage() {
  const { isConnected } = useWebSocket();
  const logs = useLogStore((state) => state.logs);
  const [stats, setStats] = useState<AccessStats | null>(null);
  const latestLogId = logs[0]?.id;

  useEffect(() => {
    let active = true;
    fetchStats()
      .then((data) => { if (active) setStats(data); })
      .catch((error) => console.error('โหลดสรุปการเข้าออกไม่สำเร็จ', error));
    return () => { active = false; };
  }, [latestLogId]);

  const latest = logs[0];

  return (
    <div className="min-h-screen bg-transparent transition-colors duration-500 p-4 md:p-8 font-sans relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-96 bg-blue-500/10 dark:bg-blue-900/20 blur-[120px] pointer-events-none -z-10" />
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Monitor className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Security Door Lock
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 font-medium">Live access monitoring for the laboratory.</p>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200">
          {isConnected ? <Wifi className="w-4 h-4 text-emerald-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
          {isConnected ? 'Live connection' : 'Connection offline'}
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-blue-100/80 dark:border-blue-800/50">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider"><span>Entries Today</span><ArrowDownLeft className="w-5 h-5 text-blue-500" /></div>
          <p className="text-4xl font-black text-slate-900 dark:text-white mt-4">{stats?.entriesToday ?? '—'}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Granted scans into the room</p>
        </div>
        <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-red-100/80 dark:border-red-800/50">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider"><span>Denied Today</span><AlertTriangle className="w-5 h-5 text-red-500" /></div>
          <p className="text-4xl font-black text-red-600 dark:text-red-400 mt-4">{stats?.deniedToday ?? '—'}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Access attempts that were refused</p>
        </div>
        <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-emerald-100/80 dark:border-emerald-800/50">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider"><span>Latest Scan</span><Clock3 className="w-5 h-5 text-emerald-500" /></div>
          <p className="text-lg font-black text-slate-900 dark:text-white mt-4 truncate">{latest?.userName ?? (latest ? 'Unknown card' : 'No scans yet')}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{latest ? `${latest.direction === 'in' ? 'IN' : 'OUT'} · ${timeOf(latest.createdAt)}` : 'Waiting for an access event'}</p>
        </div>
      </div>

      <section className="mt-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-xl overflow-hidden ring-1 ring-white/50 dark:ring-white/5 relative z-10">
        <div className="flex items-center justify-between gap-4 p-6 border-b border-slate-200/80 dark:border-slate-700/60">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Recent Access</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Who scanned in or out, and when.</p>
          </div>
          <Link href="/guard/logs" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-400 hover:underline"><FileText className="w-4 h-4" /> Full history</Link>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
          {logs.slice(0, 8).map((log) => (
            <div key={log.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
              <div className={`p-2 rounded-lg ${log.direction === 'in' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                {log.direction === 'in' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{log.userName ?? 'Unknown card'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{log.direction.toUpperCase()} · {timeOf(log.createdAt)}</p>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${log.status === 'granted' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50'}`}>{log.status.toUpperCase()}</span>
            </div>
          ))}
          {logs.length === 0 && <p className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">No access events yet.</p>}
        </div>
      </section>
      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><ShieldCheck className="w-4 h-4" /> Guard view · read-only access history</p>
    </div>
  );
}
