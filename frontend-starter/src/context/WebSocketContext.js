// src/context/WebSocketContext.js
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8080';

export const WebSocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const attemptsRef = useRef(0);
  const closedByUserRef = useRef(false);
  // Every incoming message is delivered to each listener, so nothing is lost when
  // several events arrive within one React render (lastMessage alone would drop them).
  const listenersRef = useRef(new Set());

  const addListener = useCallback((fn) => {
    listenersRef.current.add(fn);
    return () => listenersRef.current.delete(fn);
  }, []);

  const send = useCallback((message) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(typeof message === 'string' ? message : JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const subscribe = useCallback(
    (channel, parameters = {}) => send({ type: 'subscribe', channel, parameters, timestamp: new Date() }),
    [send]
  );

  useEffect(() => {
    closedByUserRef.current = false;

    const connect = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        attemptsRef.current = 0;
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          return;
        }
        if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
          return;
        }
        setLastMessage(message);
        listenersRef.current.forEach((fn) => {
          try {
            fn(message);
          } catch (error) {
            console.error('WebSocket listener error:', error);
          }
        });
      };

      ws.onerror = () => {};

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        if (closedByUserRef.current) return;
        const timeout = Math.min(1000 * 2 ** attemptsRef.current, 30000);
        attemptsRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(connect, timeout);
      };
    };

    connect();

    return () => {
      closedByUserRef.current = true;
      clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ isConnected, lastMessage, send, subscribe, addListener }}>
      {children}
    </WebSocketContext.Provider>
  );
};
