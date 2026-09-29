'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useLogStore } from '@/store/useLogStore';
import {
  getWsTicket,
  fetchRecentLogs,
  mapAccessAttempt,
} from '@/services/backend';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
});

export const useWebSocket = () => useContext(WebSocketContext);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const addLog = useLogStore((state) => state.addLog);
  const setLogs = useLogStore((state) => state.setLogs);

  useEffect(() => {
    let active = true;
    let socketInstance: Socket | null = null;
    let initialLoadSucceeded = false;

    async function connect() {
      // 1) โหลด log ล่าสุดจาก REST มาลง store ก่อน
      try {
        const logs = await fetchRecentLogs();
        if (active) {
          setLogs(logs);
          initialLoadSucceeded = true;
        }
      } catch {
        console.warn('ยังโหลดประวัติการเข้าออกไม่ได้: API ไม่พร้อมใช้งาน');
      }

      // ทุก handshake ต้องใช้ตั๋วใหม่ เพราะตั๋วเดิมหมดอายุใน 60 วินาที
      const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
      socketInstance = io(url, {
        auth: (callback) => {
          void getWsTicket()
            .then((ticket) => callback({ token: active ? ticket : '' }))
            .catch(() => {
              console.warn('ยังเชื่อมต่อเหตุการณ์สดไม่ได้: API ไม่พร้อมใช้งาน');
              callback({ token: '' });
            });
        },
        autoConnect: true,
      });
      if (!active) {
        socketInstance.disconnect();
        return;
      }
      setSocket(socketInstance);

      let connectedOnce = false;
      socketInstance.on('connect', () => {
        if (!active) return;
        setIsConnected(true);
        if (connectedOnce || !initialLoadSucceeded) {
          void fetchRecentLogs()
            .then((recent) => {
              if (!active) return;
              const current = useLogStore.getState().logs;
              setLogs(Array.from(new Map([...recent, ...current].map((log) => [log.id, log])).values()).sort((a, b) => b.id - a.id));
            })
            .catch(() => console.warn('ยังโหลดเหตุการณ์ที่พลาดระหว่างหลุดการเชื่อมต่อไม่ได้'));
        }
        connectedOnce = true;
      });
      socketInstance.on('disconnect', () => active && setIsConnected(false));

      socketInstance.on('access', (data) => {
        if (active) addLog(mapAccessAttempt(data));
      });
    }

    connect();

    return () => {
      active = false;
      socketInstance?.disconnect();
    };
  }, [addLog, setLogs]);

  return (
    <WebSocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}
