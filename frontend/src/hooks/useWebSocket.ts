import { useEffect, useState, useRef, useCallback } from 'react';

export interface WsEvent {
  event: string;
  timestamp: string;
  message: string;
  data: any;
}

export function useWebSocket(sessionId: string | null) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<WsEvent[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback((id: string) => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    // In dev environment, websocket targets port 8000
    const ws = new WebSocket(`ws://localhost:8000/ws/${id}`);
    socketRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log('WebSocket connection established:', id);
    };

    ws.onmessage = (event) => {
      try {
        const payload: WsEvent = JSON.parse(event.data);
        setEvents((prev) => [...prev, payload]);
      } catch (e) {
        console.error('Error parsing WebSocket event:', e);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('WebSocket connection closed:', id);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setConnected(false);
  }, []);

  useEffect(() => {
    if (sessionId) {
      connect(sessionId);
    }
    return () => {
      disconnect();
    };
  }, [sessionId, connect, disconnect]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return { connected, events, clearEvents, connect, disconnect };
}
