'use client';

import React from 'react';
import { Calendar, Clock } from 'lucide-react';

export default function EmployeeMyLogsPage() {
  // Mock data for employee's personal logs
  const myLogs = [
    { id: '1', timestamp: new Date(new Date().setHours(8, 25, 0)).toISOString(), status: 'GRANTED', doorId: 'Main Entrance' },
    { id: '2', timestamp: new Date(new Date().setHours(12, 5, 0)).toISOString(), status: 'GRANTED', doorId: 'Main Entrance' },
    { id: '3', timestamp: new Date(new Date().setHours(12, 55, 0)).toISOString(), status: 'GRANTED', doorId: 'Main Entrance' },
    { id: '4', timestamp: new Date(new Date().setHours(17, 30, 0)).toISOString(), status: 'GRANTED', doorId: 'Main Entrance' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">My Access History</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Review your personal door access records and time entries.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
            <h3 className="font-semibold text-slate-900 dark:text-white">Recent Scans</h3>
            <span className="text-sm text-slate-500 dark:text-zinc-400">Today</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-800/50">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                {myLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-slate-900 dark:text-white font-medium">
                        <Clock className="w-4 h-4 mr-2 text-slate-400" />
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-zinc-300">
                      {log.doorId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.status === 'GRANTED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Today's Summary</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-zinc-800">
              <span className="text-sm text-slate-500 dark:text-zinc-400">First Scan In</span>
              <span className="text-sm font-medium text-slate-900 dark:text-white">08:25 AM</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-zinc-800">
              <span className="text-sm text-slate-500 dark:text-zinc-400">Last Scan Out</span>
              <span className="text-sm font-medium text-slate-900 dark:text-white">05:30 PM</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-500 dark:text-zinc-400">Total Hours (Est.)</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">9h 5m</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-zinc-800">
            <p className="text-xs text-slate-500 dark:text-zinc-400 text-center">
              Note: Time entries are estimates based on your first and last door scans of the day.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
