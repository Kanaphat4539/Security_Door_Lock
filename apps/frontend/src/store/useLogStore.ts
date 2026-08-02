import { create } from 'zustand';

export type AccessStatus = 'GRANTED' | 'DENIED' | 'ERROR';

export interface AccessLog {
  id: string;
  userId: string | null;
  userName?: string;
  uid: string;
  timestamp: string;
  status: AccessStatus;
  doorId: string;
  imageUrl?: string;
}

interface LogStore {
  logs: AccessLog[];
  recentLog: AccessLog | null;
  addLog: (log: AccessLog) => void;
  setLogs: (logs: AccessLog[]) => void;
  clearLogs: () => void;
}

export const useLogStore = create<LogStore>((set) => ({
  logs: [],
  recentLog: null,
  addLog: (log) => set((state) => ({ 
    logs: [log, ...state.logs], 
    recentLog: log 
  })),
  setLogs: (logs) => set({ logs }),
  clearLogs: () => set({ logs: [], recentLog: null }),
}));
