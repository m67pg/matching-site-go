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
      retryCountRef.current = 0; // 驥崎､・ｩｦ陦悟屓謨ｰ繧偵Μ繧ｻ繝・ヨ
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

      // 謖・焚繝舌ャ繧ｯ繧ｪ繝輔↓繧医ｋ蜀肴磁邯壹Ο繧ｸ繝・け
      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
      console.log(`[DEBUG] SocketProvider: Reconnecting in ${delay}ms...`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        retryCountRef.current += 1;
        connect();
      }, delay);
    };

    ws.onerror = (err) => {
      console.error("[DEBUG] SocketProvider ERROR: WebSocket Error:", err);
      // onerror 縺ｮ蠕後・騾壼ｸｸ onclose 縺瑚ｵｰ繧九・縺ｧ縺薙％縺ｧ縺ｯ菴輔ｂ縺励↑縺・    };

    socketRef.current = ws;
  }, []);

  useEffect(() => {
    connect();

    const handleFocus = () => {
      // 繝輔か繝ｼ繧ｫ繧ｹ譎ゅ↓謗･邯壹′蛻・ｌ縺ｦ縺・ｌ縺ｰ蜊ｳ蠎ｧ縺ｫ蜀肴磁邯壹ｒ隧ｦ縺ｿ繧・      if (socketRef.current === null || socketRef.current.readyState === WebSocket.CLOSED) {
        console.log("[DEBUG] SocketProvider: Tab focused and socket is closed. Reconnecting immediately.");
        retryCountRef.current = 0; // 繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ繧｢繧ｯ繧ｷ繝ｧ繝ｳ縺ｪ縺ｮ縺ｧ繝ｪ繧ｻ繝・ヨ縺励※蜊ｳ譎・        connect();
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

