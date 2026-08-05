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

    async function connect() {
      // 1) โหลด log ล่าสุดจาก REST มาลง store ก่อน
      try {
        const logs = await fetchRecentLogs();
        if (active) setLogs(logs);
      } catch (err) {
        console.error('โหลด log เริ่มต้นไม่สำเร็จ', err);
      }

      // 2) ขอตั๋วอายุสั้นแล้วต่อ WebSocket (backend บังคับตรวจตอน handshake)
      try {
        const ticket = await getWsTicket();
        const url =
          process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
        socketInstance = io(url, {
          auth: { token: ticket },
          autoConnect: true,
        });
        if (!active) {
          socketInstance.disconnect();
          return;
        }
        setSocket(socketInstance);

        socketInstance.on('connect', () => active && setIsConnected(true));
        socketInstance.on('disconnect', () => active && setIsConnected(false));

        // backend emit event 'access' ทุกครั้งที่มีการทาบบัตร
        socketInstance.on('access', (data) => {
          addLog(mapAccessAttempt(data));
        });
      } catch (err) {
        console.error('ต่อ WebSocket ไม่สำเร็จ (ขอตั๋วไม่ได้?)', err);
      }
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
