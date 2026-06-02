import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../../services/api'; // Standard axios/fetch wrapper

const InterviewContext = createContext(null);

export const useInterview = () => {
  const context = useContext(InterviewContext);
  if (!context) {
    throw new Error('useInterview must be used within an InterviewProvider');
  }
  return context;
};

export const InterviewProvider = ({ children, interviewId, userId, role }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [liveKitToken, setLiveKitToken] = useState(null);

  // Real-time State
  const [chatHistory, setChatHistory] = useState([]);
  const [whiteboardBatches, setWhiteboardBatches] = useState([]);
  const [timerState, setTimerState] = useState({ actualEndTime: null, remainingSeconds: 0 });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const socketRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // 1. Fetch LiveKit Token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const data = await api.post(`/interviews/${interviewId}/token`);
        if (data?.data?.token) {
          setLiveKitToken(data.data.token);
        }
      } catch (err) {
        console.error('Failed to fetch LiveKit token:', err);
      }
    };
    fetchToken();
  }, [interviewId]);

  // 2. Initialize Socket Connection & Handle Reconnection Flow
  useEffect(() => {
    // In production, configure exact backend URL and pass JWT for auth
    const API_URL = import.meta.env.VITE_API_URL || '';

    // Minimal, safe auth: read the stored access token and provide it via Socket.IO handshake.
    // If no token is present we avoid initiating the socket (prevents noisy rejected handshakes).
    const token = localStorage.getItem('accessToken');
    if (!token) {
      // Intentionally do not connect if no auth token is available.
      // The server enforces JWT on the handshake; connecting without a token results in immediate rejection.
      // Log a concise developer warning so issues are visible during testing.
      // eslint-disable-next-line no-console
      console.warn('Interview socket not initialized: missing accessToken in localStorage');
      return;
    }

    const newSocket = io(API_URL, { auth: { token } });
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      // Trigger state hydration request
      newSocket.emit('join_interview_room', { interviewId, userId, role });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Handle State Hydration
    newSocket.on('room_state_hydration', (state) => {
      setChatHistory(state.chatHistory || []);
      setWhiteboardBatches(state.whiteboardBatches || []);
      if (state.timerState?.actualEndTime) {
        setTimerState(prev => ({ ...prev, actualEndTime: new Date(state.timerState.actualEndTime) }));
      }
    });

    // Handle Real-time Chat (Capped at 200 messages for memory safety)
    newSocket.on('chat_message_received', (msg) => {
      setChatHistory(prev => {
        const updated = [...prev, msg];
        return updated.length > 200 ? updated.slice(updated.length - 200) : updated;
      });
      if (!isChatOpen) {
        setUnreadChatCount(prev => prev + 1);
      }
    });

    // Handle Real-time Whiteboard
    newSocket.on('whiteboard_event_received', (eventData) => {
      // Logic to append to current unbatched strokes for the canvas to render
      setWhiteboardBatches(prev => {
        const latest = [...prev];
        // Append to the last batch or create a temporary one for real-time
        if (latest.length === 0) latest.push({ events: [] });
        latest[latest.length - 1].events.push(eventData);
        return latest;
      });
    });

    // Handle Timer Sync
    newSocket.on('timer_sync', (state) => {
      if (state.actualEndTime) {
        setTimerState(prev => ({ ...prev, actualEndTime: new Date(state.actualEndTime) }));
      }
    });

    return () => {
      newSocket.disconnect();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [interviewId, userId, role]);

  // 3. Timer Local Computation
  useEffect(() => {
    if (!timerState.actualEndTime) return;

    timerIntervalRef.current = setInterval(() => {
      const remainingMs = timerState.actualEndTime.getTime() - new Date().getTime();
      const remainingSecs = Math.max(0, Math.floor(remainingMs / 1000));
      setTimerState(prev => ({ ...prev, remainingSeconds: remainingSecs }));

      if (remainingSecs === 0) {
        clearInterval(timerIntervalRef.current);
      }
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, [timerState.actualEndTime]);

  // Business Logic Actions
  const sendChatMessage = useCallback((content) => {
    if (socketRef.current) {
      socketRef.current.emit('chat_message', { interviewId, senderId: userId, content });
      // Optimistic update
      setChatHistory(prev => [...prev, { sender: userId, content, createdAt: new Date() }]);
    }
  }, [interviewId, userId]);

  const emitWhiteboardEvent = useCallback((eventType, payload) => {
    if (socketRef.current) {
      const eventData = {
        eventType,
        payload: typeof payload === 'string' ? payload : JSON.stringify(payload || {}),
        senderId: userId,
        timestamp: new Date().toISOString()
      };
      
      // Optimistic update to fix disappearing local strokes
      setWhiteboardBatches(prev => {
        const latest = [...prev];
        if (latest.length === 0) latest.push({ events: [] });
        latest[latest.length - 1].events.push(eventData);
        return latest;
      });

      socketRef.current.emit('whiteboard_event', { interviewId, eventType, payload, senderId: userId });
    }
  }, [interviewId, userId]);

  const extendTimer = useCallback((minutes) => {
    if (socketRef.current) {
      socketRef.current.emit('extend_timer', { interviewId, minutes });
    }
  }, [interviewId]);

  const toggleChat = useCallback(() => {
    setIsChatOpen(prev => {
      if (!prev) setUnreadChatCount(0);
      return !prev;
    });
  }, []);

  const value = {
    socket,
    isConnected,
    liveKitToken,
    chatHistory,
    whiteboardBatches,
    timerState,
    isChatOpen,
    unreadChatCount,
    sendChatMessage,
    emitWhiteboardEvent,
    toggleChat,
    extendTimer,
    role
  };

  return (
    <InterviewContext.Provider value={value}>
      {children}
    </InterviewContext.Provider>
  );
};
