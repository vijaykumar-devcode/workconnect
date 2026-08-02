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
  const [timerState, setTimerState] = useState({
    actualEndTime: null,
    remainingSeconds: 0,
    isTimerReady: false, // true only after the first real countdown tick
  });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [timerError, setTimerError] = useState(null); // Surfaces extend/start errors to the UI

  /**
   * excalidrawScene — holds the latest remote scene JSON string.
   * ExcalidrawCanvas reads this and calls updateScene() whenever it changes.
   * Null means no scene has been received yet (fresh whiteboard).
   */
  const [excalidrawScene, setExcalidrawScene] = useState(null);

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
    let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    if (API_URL.endsWith('/api')) {
      API_URL = API_URL.replace(/\/api$/, '');
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
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

    // -----------------------------------------------------------------------
    // Handle State Hydration
    // -----------------------------------------------------------------------
    newSocket.on('room_state_hydration', (state) => {
      setChatHistory(state.chatHistory || []);

      if (state.excalidrawScene) {
        setExcalidrawScene(state.excalidrawScene);
      }

      if (state.timerState?.actualEndTime) {
        // Active timer already running — restore it from the server.
        setTimerState(prev => ({
          ...prev,
          actualEndTime: new Date(state.timerState.actualEndTime),
        }));
      } else if (role !== 'CANDIDATE') {
        // No active timer and this user is the interviewer.
        // Request the server to start (or re-sync) the timer.
        // The server is idempotent: if a timer was already stored it re-syncs
        // without resetting, so this is safe to call on every reconnect.
        newSocket.emit('start_interview_timer', { interviewId });
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

    // Handle Real-time Excalidraw Scene Sync from other participants
    newSocket.on('excalidraw_scene_received', ({ scene }) => {
      if (scene) setExcalidrawScene(scene);
    });

    // -----------------------------------------------------------------------
    // Handle Timer Sync — broadcasted by the server after every start/extend.
    // We only update the fields that are present in the payload; this lets
    // a partial update (e.g. only actualEndTime from extend_timer) work
    // without clearing the existing actualStartTime.
    // -----------------------------------------------------------------------
    newSocket.on('timer_sync', (state) => {
      setTimerState(prev => ({
        ...prev,
        ...(state.actualStartTime ? { actualStartTime: new Date(state.actualStartTime) } : {}),
        ...(state.actualEndTime   ? { actualEndTime:   new Date(state.actualEndTime)   } : {}),
      }));
    });

    // Handle timer operation errors (start / extend failures)
    newSocket.on('timer_error', ({ message }) => {
      setTimerError(message);
      // Auto-clear the error after 5 seconds so it doesn't linger
      setTimeout(() => setTimerError(null), 5000);
    });

    return () => {
      newSocket.disconnect();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId, userId, role]);

  // 3. Timer Local Computation
  // Runs a 1-second interval countdown derived from the server-authoritative
  // actualEndTime.  Resets whenever actualEndTime changes (start or extend).
  useEffect(() => {
    if (!timerState.actualEndTime) return;

    const tick = () => {
      const remainingMs = timerState.actualEndTime.getTime() - Date.now();
      const remainingSecs = Math.max(0, Math.floor(remainingMs / 1000));
      setTimerState(prev => ({
        ...prev,
        remainingSeconds: remainingSecs,
        // Mark the timer as ready only after we have received and computed
        // at least one real tick from the server-authoritative end time.
        // This prevents the initial state (remainingSeconds: 0) from
        // incorrectly triggering the "Time is up" alert on room entry.
        isTimerReady: true,
      }));
      if (remainingSecs === 0) {
        clearInterval(timerIntervalRef.current);
      }
    };

    // Run immediately so the display doesn't lag by 1 second on start/extend.
    tick();
    timerIntervalRef.current = setInterval(tick, 1000);

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

  /**
   * broadcastExcalidrawScene
   *
   * Called by ExcalidrawCanvas (throttled) whenever the local user makes a change.
   */
  const broadcastExcalidrawScene = useCallback((elements, appState) => {
    if (!socketRef.current) return;

    const scene = JSON.stringify({
      elements,
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor,
        currentItemStrokeColor: appState.currentItemStrokeColor,
        currentItemBackgroundColor: appState.currentItemBackgroundColor,
        currentItemFillStyle: appState.currentItemFillStyle,
        currentItemStrokeWidth: appState.currentItemStrokeWidth,
        currentItemRoughness: appState.currentItemRoughness,
        currentItemOpacity: appState.currentItemOpacity,
        currentItemFontFamily: appState.currentItemFontFamily,
        currentItemFontSize: appState.currentItemFontSize,
        currentItemTextAlign: appState.currentItemTextAlign,
        currentItemStrokeSharpness: appState.currentItemStrokeSharpness,
      },
    });

    socketRef.current.emit('excalidraw_sync', {
      interviewId,
      scene,
      senderId: userId,
    });
  }, [interviewId, userId]);

  /**
   * extendTimer
   *
   * Emits an extend_timer request to the server.  The server validates the
   * minutes value, persists the new end-time, and broadcasts timer_sync back
   * to all room participants.  Any server-side error comes back as timer_error.
   *
   * @param {number} minutes - Positive integer (1–120)
   */
  const extendTimer = useCallback((minutes) => {
    if (!socketRef.current) return;
    setTimerError(null); // Clear any previous error before the new attempt
    socketRef.current.emit('extend_timer', { interviewId, minutes });
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
    excalidrawScene,
    broadcastExcalidrawScene,
    timerState,
    timerError,
    isChatOpen,
    unreadChatCount,
    sendChatMessage,
    toggleChat,
    extendTimer,
    role,
  };

  return (
    <InterviewContext.Provider value={value}>
      {children}
    </InterviewContext.Provider>
  );
};
