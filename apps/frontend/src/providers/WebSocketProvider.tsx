'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useLogStore } from '@/store/useLogStore';
import { authApi } from '@/services/api';

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

  useEffect(() => {
    let socketInstance: Socket | null = null;
    let isMounted = true;

    const connectWebSocket = async () => {
      try {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
        let token = '';

        // Try getting the ws-ticket if authenticated
        if (typeof window !== 'undefined' && localStorage.getItem('auth_token')) {
          try {
            const { ticket } = await authApi.getWsTicket();
            token = ticket;
          } catch (e) {
            console.error('Failed to get WebSocket ticket:', e);
          }
        }
        
        if (!isMounted) return;

        socketInstance = io(socketUrl, {
          auth: { token },
          autoConnect: true,
        });

        setSocket(socketInstance);

        socketInstance.on('connect', () => {
          console.log('Connected to WebSocket server');
          setIsConnected(true);
        });

        socketInstance.on('disconnect', () => {
          console.log('Disconnected from WebSocket server');
          setIsConnected(false);
        });

        // Listen for real-time access logs using the new event name
        socketInstance.on('access', (data) => {
          console.log('New access log received:', data);
          addLog(data);
        });
      } catch (err) {
        console.error('WebSocket connection setup failed:', err);
      }
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [addLog]);

  return (
    <WebSocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}
