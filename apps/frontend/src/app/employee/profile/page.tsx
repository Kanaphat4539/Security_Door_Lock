'use client';

import React, { useState } from 'react';
import { User, CreditCard, Bell, MessageCircle, Save } from 'lucide-react';

export default function EmployeeProfilePage() {
  const [lineConnected, setLineConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConnectLine = () => {
    setLoading(true);
    // Simulate API call to get LINE Login URL
    setTimeout(() => {
      setLoading(false);
      setLineConnected(true);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-slate-400 border-4 border-white dark:border-zinc-900 shadow-sm">
            <User className="w-12 h-12" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">John Doe</h2>
            <p className="text-slate-500 dark:text-zinc-400">Software Engineer • Engineering Department</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                Employee ID: EMP-2024-042
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Status: Active
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* RFID Card Status */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">RFID Card Status</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500 dark:text-zinc-400">Card UID</p>
              <p className="font-mono text-slate-900 dark:text-white bg-slate-50 dark:bg-zinc-800 p-2 rounded mt-1 border border-slate-100 dark:border-zinc-700">A1B2-C3D4-E5F6</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-zinc-400">Status</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">Active & Working</span>
              </div>
            </div>
            
            <button className="w-full mt-4 py-2 px-4 border border-red-200 text-red-600 dark:border-red-900/50 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors">
              Report Lost Card
            </button>
          </div>
        </div>

        {/* Notifications & Settings */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Notifications</h3>
          </div>
          
          <div className="space-y-6">
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Receive real-time alerts when your RFID card is used to access secure areas. This helps prevent unauthorized use of your card.
            </p>

            <div className="border border-slate-200 dark:border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-6 h-6 text-[#06C755]" />
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white">LINE Notify</h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">Receive alerts via LINE Flex Messages</p>
                  </div>
                </div>
                <div>
                  {lineConnected ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-400">
                      Not Connected
                    </span>
                  )}
                </div>
              </div>
              
              {!lineConnected ? (
                <button 
                  onClick={handleConnectLine}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {loading ? 'Connecting...' : 'Connect with LINE'}
                </button>
              ) : (
                <button 
                  onClick={() => setLineConnected(false)}
                  className="w-full py-2 px-4 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors"
                >
                  Disconnect
                </button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-slate-900 dark:text-white">Email Notifications</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Weekly summary reports</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
