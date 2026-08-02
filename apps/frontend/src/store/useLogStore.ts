import { create } from 'zustand';

export type Direction = 'in' | 'out';
export type AccessStatus = 'granted' | 'denied';

export interface AccessLog {
  id: number;
  uid: string;
  direction: Direction;
  status: AccessStatus;
  imagePath: string | null;
  userName: string | null;
  createdAt: string;
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
