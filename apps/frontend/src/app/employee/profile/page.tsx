'use client';

import React, { useState } from 'react';
import { User, CreditCard, Bell, MessageCircle, ShieldCheck, Activity } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { RobotShield } from '@/components/RobotShield';

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
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors duration-500 ease-in-out p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Profile</h1>
            <p className="text-slate-500 dark:text-zinc-400 mt-1">Manage your identity and security preferences.</p>
          </div>
          <ThemeToggle />
        </div>

        {/* Profile Identity Card */}
        <div className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/60 dark:border-zinc-800/60 shadow-sm hover:shadow-md transition-all duration-500 group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-100 dark:bg-zinc-800 rounded-full blur-3xl opacity-50 -mr-20 -mt-20 pointer-events-none transition-colors duration-500"></div>
          
          <div className="relative p-8 flex flex-col md:flex-row items-start md:items-center gap-8">
            <div className="relative">
              <div className="w-32 h-32 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-slate-400 border-[6px] border-white dark:border-zinc-900 shadow-xl z-10 transition-colors duration-500">
                <User className="w-14 h-14" />
              </div>
              <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-white dark:border-zinc-900 rounded-full z-20 transition-colors duration-500"></div>
            </div>
            
            <div className="flex-1 space-y-2">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white transition-colors duration-500">John Doe</h2>
              <p className="text-lg text-slate-500 dark:text-zinc-400 transition-colors duration-500">Software Engineer • Engineering Department</p>
              
              <div className="pt-2 flex flex-wrap gap-3">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 transition-colors duration-500">
                  <ShieldCheck className="w-4 h-4 mr-2" /> EMP-2024-042
                </span>
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800/30 transition-colors duration-500">
                  <Activity className="w-4 h-4 mr-2" /> Active Status
                </span>
              </div>
            </div>

            {/* Illustration */}
            <div className="hidden md:block w-48 h-48 opacity-90 group-hover:scale-105 transition-transform duration-700 ease-out animate-mascot">
              <RobotShield />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* RFID Card Status */}
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-slate-200/60 dark:border-zinc-800/60 shadow-sm hover:shadow-md transition-all duration-500 flex flex-col">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3.5 bg-slate-100 dark:bg-zinc-800 rounded-2xl transition-colors duration-500">
                <CreditCard className="w-6 h-6 text-slate-900 dark:text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white transition-colors duration-500">Access Card</h3>
            </div>
            
            <div className="flex-1 space-y-6">
              <div className="p-5 bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800/80 transition-colors duration-500">
                <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mb-2">Card UID</p>
                <p className="font-mono text-xl tracking-widest text-slate-900 dark:text-white transition-colors duration-500">A1B2-C3D4-E5F6</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mb-3">Status</p>
                <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl border border-green-100 dark:border-green-900/20 transition-colors duration-500">
                  <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                  </span>
                  <span className="font-semibold text-green-700 dark:text-green-400">Active & Working</span>
                </div>
              </div>
            </div>

            <button className="mt-8 w-full py-3.5 px-4 border-2 border-red-100 text-red-600 dark:border-red-900/30 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl font-bold transition-all duration-300">
              Report Lost Card
            </button>
          </div>

          {/* Notifications & Settings */}
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-slate-200/60 dark:border-zinc-800/60 shadow-sm hover:shadow-md transition-all duration-500">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3.5 bg-slate-100 dark:bg-zinc-800 rounded-2xl transition-colors duration-500">
                <Bell className="w-6 h-6 text-slate-900 dark:text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white transition-colors duration-500">Notifications</h3>
            </div>
            
            <p className="text-slate-500 dark:text-zinc-400 leading-relaxed mb-8 transition-colors duration-500">
              Receive real-time alerts when your access card is used. This helps prevent unauthorized entry.
            </p>

            <div className="space-y-4">
              <div className="group border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-300">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-[#06C755]/10 rounded-xl">
                      <MessageCircle className="w-7 h-7 text-[#06C755]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white transition-colors duration-500">LINE Notify</h4>
                      <p className="text-sm text-slate-500 dark:text-zinc-400 transition-colors duration-500">Instant access alerts</p>
                    </div>
                  </div>
                  <div>
                    {lineConnected ? (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold tracking-wide bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 transition-colors duration-500">
                        CONNECTED
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold tracking-wide bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400 transition-colors duration-500">
                        NOT CONNECTED
                      </span>
                    )}
                  </div>
                </div>
                
                {!lineConnected ? (
                  <button 
                    onClick={handleConnectLine}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-xl font-bold transition-all duration-300 shadow-sm shadow-[#06C755]/20 hover:shadow-md hover:shadow-[#06C755]/30 active:scale-[0.98]"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Connecting...
                      </span>
                    ) : 'Connect with LINE'}
                  </button>
                ) : (
                  <button 
                    onClick={() => setLineConnected(false)}
                    className="w-full py-3.5 px-4 bg-slate-100 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-xl font-bold transition-all duration-300"
                  >
                    Disconnect
                  </button>
                )}
              </div>

              <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 flex items-center justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-slate-100 dark:bg-zinc-800 rounded-xl transition-colors duration-500">
                    <Activity className="w-7 h-7 text-slate-700 dark:text-zinc-300" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white transition-colors duration-500">Weekly Reports</h4>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 transition-colors duration-500">Via registered email</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                  <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all after:duration-300 dark:border-zinc-600 peer-checked:bg-slate-800 dark:peer-checked:bg-white peer-checked:after:dark:bg-slate-800 peer-checked:after:dark:border-slate-800 transition-colors duration-500"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
