import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [stockUpdateTrigger, setStockUpdateTrigger] = useState(0);
  const [notificationTrigger, setNotificationTrigger] = useState(0);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.close();
        setSocket(null);
      }
      return;
    }

    const wsScheme = window.location.protocol === "https:" ? "wss:" : "ws:";
    let host = "localhost:8000";
    const envApiUrl = import.meta.env.VITE_API_URL;
    if (envApiUrl) {
      try {
        const urlObj = new URL(envApiUrl);
        host = urlObj.host;
      } catch (e) {
        console.error("Failed to parse VITE_API_URL for WS host resolution:", e);
      }
    }
    const wsUrl = `${wsScheme}//${host}/api/ws/live?client_id=${user.user_id}`;

    console.log(`Connecting to WebSocket: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connection established.");
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("Received WebSocket event:", message);

        if (message.event === "stock_updated") {
          setStockUpdateTrigger((prev) => prev + 1);
        } else if (message.event === "notification_new" || message.event === "alert") {
          setNotificationTrigger((prev) => prev + 1);
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed. Attempting reconnect in 5s...");
      setSocket(null);
      // Optional: Auto-reconnect loop can be handled here if needed
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      ws.close();
    };
  }, [user]);

  const sendEvent = (action, payload) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action, ...payload }));
      return true;
    }
    return false;
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        stockUpdateTrigger,
        notificationTrigger,
        sendEvent,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
