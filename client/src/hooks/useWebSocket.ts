import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

export function useWebSocket() {
  const [wsData, setWsData] = useState<any>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    // Connect to WebSocket via Socket.io
    socketRef.current = io('http://localhost:3100', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socketRef.current.on('agent-status-update', (data: any) => {
      setWsData((prev: any) => ({ ...prev, agentStatus: data }));
    });

    socketRef.current.on('backlog-update', (data: any) => {
      setWsData((prev: any) => ({ ...prev, backlog: data }));
    });

    socketRef.current.on('issue-update', (data: any) => {
      setWsData((prev: any) => ({ ...prev, issues: data }));
    });

    socketRef.current.on('memory-update', (data: any) => {
      setWsData((prev: any) => ({ ...prev, memory: data }));
    });

    socketRef.current.on('error', (error: any) => {
      console.error('WebSocket error:', error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return { wsData, socket: socketRef.current };
}
