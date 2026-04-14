"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { getToken, isAuthenticated } from "@/lib/auth";

type SocketContextType = {
  isConnected: boolean;
  connectionVersion: number;
  subscribe: (handler: (data: any) => void) => () => void;
};

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionVersion, setConnectionVersion] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<(data: any) => void>>(new Set());
  const retryCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const subscribe = useCallback((handler: (data: any) => void) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN || socketRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }
    if (!isAuthenticated()) return;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const token = getToken();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const wsUrl = `${apiUrl.replace("https://", "wss://").replace("http://", "ws://")}/api/ws?token=${token}`;

    console.log(`[DEBUG] SocketProvider: Attempting to connect (Attempt ${retryCountRef.current + 1})...`);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("[DEBUG] SocketProvider: WebSocket Connected");
      setIsConnected(true);
      setConnectionVersion((v) => v + 1);
      retryCountRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handlersRef.current.forEach((handler) => handler(data));
      } catch (err) {
        console.error("[DEBUG] SocketProvider ERROR: Message Parse Error:", err);
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      socketRef.current = null;
      
      const code = event.code;
      const reason = event.reason || "No reason provided";
      console.log(`[DEBUG] SocketProvider: WebSocket Disconnected. Code: ${code}, Reason: ${reason}`);

      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
      console.log(`[DEBUG] SocketProvider: Reconnecting in ${delay}ms...`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        retryCountRef.current += 1;
        connect();
      }, delay);
    };

    ws.onerror = (err) => {
      console.error("[DEBUG] SocketProvider ERROR: WebSocket Error:", err);
    };

    socketRef.current = ws;
  }, []);

  useEffect(() => {
    connect();

    const handleFocus = () => {
      if (socketRef.current === null || socketRef.current.readyState === WebSocket.CLOSED) {
        console.log("[DEBUG] SocketProvider: Tab focused and socket is closed. Reconnecting immediately.");
        retryCountRef.current = 0;
        connect();
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      socketRef.current?.close();
    };
  }, [connect]);

  return (
    <SocketContext.Provider value={{ isConnected, connectionVersion, subscribe }}>
      {children}
    </SocketContext.Provider>
  );
};

