import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  VideoTrack,
  useLocalParticipant,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import ChatModal from './components/ChatModal';
import ExcalidrawCanvas from './components/ExcalidrawCanvas';
import ScreenShareArea from './components/ScreenShareArea';
import { useInterview } from './InterviewContext';
import { useTheme } from '../../context/ThemeContext';

// ─────────────────────────────────────────────────────────────────────────────
// useDraggable — custom hook
//
// Root-cause fix for Full Screen visibility & Dragging:
//   - The previous `position: fixed` + portal approach caused the cards to disappear
//     in Full Screen mode because the portal rendered to `document.body` instead of
//     inside the `containerRef` that went full-screen.
//   - This revised hook uses `position: absolute` and relies on `offsetParent`
//     (which will be the `containerRef`) to calculate boundaries.
//   - Includes a ResizeObserver to keep cards inside the viewport when the 
//     browser resizes or enters/exits full screen.
// ─────────────────────────────────────────────────────────────────────────────
function useDraggable(initialX, initialY, cardW = 240, cardH = 180) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const posRef       = useRef({ x: initialX, y: initialY });
  const dragRef      = useRef(null); 
  const isDragging   = useRef(false);
  const cardRef      = useRef(null);

  // clamp so card stays inside the positioned parent (the interview room container)
  const clamp = useCallback((x, y) => {
    const parent = cardRef.current?.offsetParent;
    const parentW = parent?.clientWidth ?? window.innerWidth;
    const parentH = parent?.clientHeight ?? window.innerHeight;
    const maxX = parentW - (cardRef.current?.offsetWidth  ?? cardW);
    const maxY = parentH - (cardRef.current?.offsetHeight ?? cardH);
    return {
      x: Math.max(0, Math.min(maxX, x)),
      y: Math.max(0, Math.min(maxY, y)),
    };
  }, [cardW, cardH]);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    isDragging.current = true;
    dragRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startElemX:  posRef.current.x,
      startElemY:  posRef.current.y,
    };

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDragging.current || !dragRef.current) return;
      const dx = e.clientX - dragRef.current.startMouseX;
      const dy = e.clientY - dragRef.current.startMouseY;
      const raw = {
        x: dragRef.current.startElemX + dx,
        y: dragRef.current.startElemY + dy,
      };
      const clamped = clamp(raw.x, raw.y);
      if (cardRef.current) {
        cardRef.current.style.left = `${clamped.x}px`;
        cardRef.current.style.top  = `${clamped.y}px`;
      }
      posRef.current = clamped;
    };

    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      setPos({ ...posRef.current });
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseup',   onMouseUp);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup',   onMouseUp);
    };
  }, [clamp]);

  // Handle window resizing and fullscreen toggling
  useEffect(() => {
    const parent = cardRef.current?.parentElement;
    if (!parent) return;

    let prevWidth = parent.clientWidth || window.innerWidth;
    let prevHeight = parent.clientHeight || window.innerHeight;
    
    const observer = new ResizeObserver(() => {
      const newWidth = parent.clientWidth || window.innerWidth;
      const newHeight = parent.clientHeight || window.innerHeight;
      
      if (newWidth === prevWidth && newHeight === prevHeight) return;

      // Calculate proportional position
      const percentX = posRef.current.x / Math.max(1, (prevWidth - (cardRef.current?.offsetWidth ?? cardW)));
      const percentY = posRef.current.y / Math.max(1, (prevHeight - (cardRef.current?.offsetHeight ?? cardH)));
      
      prevWidth = newWidth;
      prevHeight = newHeight;

      // Apply proportional position to new dimensions
      const targetX = percentX * (newWidth - (cardRef.current?.offsetWidth ?? cardW));
      const targetY = percentY * (newHeight - (cardRef.current?.offsetHeight ?? cardH));
      
      const clamped = clamp(targetX, targetY);
      
      if (clamped.x !== posRef.current.x || clamped.y !== posRef.current.y) {
        posRef.current = clamped;
        setPos(clamped);
        if (cardRef.current) {
          cardRef.current.style.left = `${clamped.x}px`;
          cardRef.current.style.top  = `${clamped.y}px`;
        }
      }
    });

    observer.observe(parent);
    return () => observer.disconnect();
  }, [clamp, cardW, cardH]);

  const onTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    isDragging.current = true;
    dragRef.current = {
      startMouseX: touch.clientX,
      startMouseY: touch.clientY,
      startElemX:  posRef.current.x,
      startElemY:  posRef.current.y,
    };
  }, []);

  useEffect(() => {
    const onTouchMove = (e) => {
      if (!isDragging.current || !dragRef.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - dragRef.current.startMouseX;
      const dy = touch.clientY - dragRef.current.startMouseY;
      const raw = {
        x: dragRef.current.startElemX + dx,
        y: dragRef.current.startElemY + dy,
      };
      const clamped = clamp(raw.x, raw.y);
      if (cardRef.current) {
        cardRef.current.style.left = `${clamped.x}px`;
        cardRef.current.style.top  = `${clamped.y}px`;
      }
      posRef.current = clamped;
    };

    const onTouchEnd = () => {
      isDragging.current = false;
      setPos({ ...posRef.current });
    };

    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend',  onTouchEnd);
    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend',  onTouchEnd);
    };
  }, [clamp]);

  return { pos, cardRef, onMouseDown, onTouchStart };
}

// ─────────────────────────────────────────────────────────────────────────────
// DraggableVideoCard
// ─────────────────────────────────────────────────────────────────────────────
const CARD_W = 240;
const CARD_H = 180;

function DraggableVideoCard({ trackRef, label, defaultPosition, isMirrored = false }) {
  const { pos, cardRef, onMouseDown, onTouchStart } = useDraggable(
    defaultPosition.x,
    defaultPosition.y,
    CARD_W,
    CARD_H,
  );

  const [size, setSize] = useState({ w: CARD_W, h: CARD_H });
  const resizeRef = useRef(null);

  const onResizeMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startW: size.w,
      startH: size.h,
    };

    const onMove = (e) => {
      if (!resizeRef.current) return;
      const newW = Math.min(480, Math.max(160, resizeRef.current.startW + (e.clientX - resizeRef.current.startMouseX)));
      const newH = Math.min(360, Math.max(120, resizeRef.current.startH + (e.clientY - resizeRef.current.startMouseY)));
      setSize({ w: newW, h: newH });
    };
    const onUp = () => {
      resizeRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [size.w, size.h]);

  return (
    <div
      ref={cardRef}
      style={{
        position: 'absolute', // Absolute relative to the InterviewLayout container
        left:     pos.x,
        top:      pos.y,
        width:    size.w,
        height:   size.h,
        zIndex:   9999, // Stays above everything within the container
        willChange: 'left, top',
      }}
      className="bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700/60"
    >
      {/* ── Drag handle ─────────────────────────────────────────────────── */}
      <div
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        style={{ cursor: 'grab', touchAction: 'none' }}
        className="absolute top-0 left-0 right-0 h-8 z-20 flex items-center justify-between px-2 bg-gradient-to-b from-black/85 to-transparent select-none"
      >
        <span className="text-[10px] text-white/90 font-semibold truncate max-w-[160px] drop-shadow">
          {label}
        </span>
        <div className="flex gap-0.5 opacity-70">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-white" />
          ))}
        </div>
      </div>

      {/* ── Video feed / Camera off placeholder ─────────────────────────── */}
      <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
        {trackRef ? (
          <VideoTrack
            trackRef={trackRef}
            className="w-full h-full object-cover"
            style={isMirrored ? { transform: 'scaleX(-1)' } : {}}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 gap-2">
            <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"/>
            </svg>
            <p className="text-xs text-slate-500 font-medium">Camera off</p>
          </div>
        )}
      </div>

      {/* ── Bottom label + live indicator ───────────────────────────────── */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-end z-10" style={{ pointerEvents: 'none' }}>

        {trackRef && (
          <span className="flex items-center gap-1 bg-black/65 backdrop-blur-sm px-1.5 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[9px] text-green-400 font-bold">LIVE</span>
          </span>
        )}
      </div>

      {/* ── Resize handle ───────────────────────────────────────────────── */}
      <div
        onMouseDown={onResizeMouseDown}
        style={{ position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, cursor: 'se-resize', zIndex: 20 }}
        className="flex items-end justify-end p-1"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 9L9 2M5 9L9 5M9 9L9 9" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VideoStreams
// ─────────────────────────────────────────────────────────────────────────────
function VideoStreams({ containerRef }) {
  const { localParticipant } = useLocalParticipant();

  const allCameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: false }
  );

  const localTrack = allCameraTracks.find(
    (t) => t.participant?.isLocal
  );
  const remoteTracks = allCameraTracks.filter(
    (t) => !t.participant?.isLocal
  );

  const [initialBounds, setInitialBounds] = useState(null);

  // Measure the container to initialize absolute positions relative to the container
  useEffect(() => {
    if (containerRef.current) {
      setInitialBounds({
        w: containerRef.current.clientWidth,
        h: containerRef.current.clientHeight
      });
    }
  }, [containerRef]);

  // Don't render until we have bounds so we can position cards accurately
  if (!initialBounds) return null;

  const MARGIN  = 16;
  const BOT_BAR = 80;

  const localPos = {
    x: initialBounds.w - CARD_W - MARGIN,
    y: initialBounds.h - CARD_H - BOT_BAR - MARGIN,
  };
  const remotePos = (i) => ({
    x: initialBounds.w - CARD_W - MARGIN,
    y: initialBounds.h - CARD_H - BOT_BAR - MARGIN - (CARD_H + MARGIN) * (i + 1),
  });

  return (
    <>
      <DraggableVideoCard
        trackRef={localTrack || null}
        label={`${localParticipant?.name || localParticipant?.identity || 'You'} (You)`}
        defaultPosition={localPos}
        isMirrored={true}
      />

      {remoteTracks.map((tr, i) => (
        <DraggableVideoCard
          key={`remote-${tr.participant.identity}`}
          trackRef={tr}
          label={tr.participant.name || tr.participant.identity}
          defaultPosition={remotePos(i)}
          isMirrored={false}
        />
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InterviewLayout
// ─────────────────────────────────────────────────────────────────────────────
export default function InterviewLayout({ interviewId }) {
  const { liveKitToken, timerState, timerError, toggleChat, extendTimer, role } = useInterview();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [isFullscreen, setIsFullscreen]         = useState(false);
  const [hasEnded, setHasEnded]                 = useState(false);
  
  // The container that will go Full Screen. By keeping it relative and rendering 
  // video cards inside it, we guarantee cards are visible in both modes.
  const containerRef = useRef(null);
  const navigate     = useNavigate();

  useEffect(() => {
    if (
      timerState.isTimerReady &&
      timerState.remainingSeconds === 0 &&
      timerState.actualEndTime != null &&
      !hasEnded
    ) {
      setHasEnded(true);
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(() => {});
      } catch (_) {}
      alert('Time is up! The interview is marked as completed.');
      handleEndInterview();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerState.isTimerReady, timerState.remainingSeconds, timerState.actualEndTime, hasEnded]);

  const getTimerColor = (s) => {
    if (!s)        return 'text-amber-400';
    if (s <= 300)  return 'text-red-500 animate-pulse';
    if (s <= 600)  return 'text-orange-500';
    if (s <= 900)  return 'text-yellow-400';
    return 'text-green-400';
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current
        ?.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.error(err));
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch((err) => console.error(err));
    }
  };

  const handleEndInterview = () => navigate(-1);

  if (!liveKitToken) {
    return (
      <div className={`flex items-center justify-center h-screen font-semibold ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-700'}`}>
        Authenticating Room...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`h-[100dvh] w-full flex flex-col overflow-hidden relative transition-colors duration-200 ${isDark ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`}
    >
      <LiveKitRoom
        video={true}
        audio={true}
        token={liveKitToken}
        serverUrl={import.meta.env.VITE_LIVEKIT_URL || 'wss://your-livekit-server.com'}
        connect={true}
        adaptiveStream={true}
        dynacast={true}
        data-lk-theme="default"
        className="w-full h-full flex flex-col"
      >
        {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
        <div className={`h-14 border-b shrink-0 flex items-center justify-between px-6 z-10 transition-colors duration-200 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
          <div className="flex items-center gap-4">
            <h2 className={`text-sm font-semibold tracking-wide ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Technical Interview
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-500 font-medium">
              In Progress
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className={`text-xl font-mono ${getTimerColor(timerState.remainingSeconds)}`}>
                {formatTime(timerState.remainingSeconds)}
              </div>
              {role !== 'CANDIDATE' && (
                <>
                  {[5, 10, 15].map((m) => (
                    <button
                      key={m}
                      onClick={() => extendTimer(m)}
                      className={`text-xs px-2 py-1 rounded transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                    >
                      +{m}m
                    </button>
                  ))}
                  {timerError && (
                    <span className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-1 rounded max-w-[180px] truncate" title={timerError}>
                      ⚠ {timerError}
                    </span>
                  )}
                </>
              )}
            </div>
            <button
              onClick={handleEndInterview}
              className="bg-red-500 hover:bg-red-600 px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
            >
              End Interview
            </button>
          </div>
        </div>

        {/* ── PRIMARY CONTENT AREA ─────────────────────────────────────────── */}
        <div className={`flex-1 w-full flex items-center justify-center relative overflow-hidden transition-colors duration-200 ${isDark ? 'bg-slate-950' : 'bg-gray-100'}`}>
          <ScreenShareArea />
          {isWhiteboardOpen && <ExcalidrawCanvas />}
          <ChatModal />
        </div>

        {/* ── BOTTOM TOOLBAR ────────────────────────────────────────────────── */}
        <div className={`h-16 border-t shrink-0 flex items-center justify-between px-6 z-10 transition-colors duration-200 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
          <div className="flex items-center gap-4 w-1/3">
            <button
              onClick={() => setIsWhiteboardOpen((v) => !v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${isWhiteboardOpen ? 'bg-indigo-600 text-white border-indigo-600' : isDark ? 'hover:bg-slate-700 border-slate-600 text-slate-300' : 'hover:bg-gray-100 border-gray-300 text-gray-700'}`}
            >
              Whiteboard
            </button>
            <button
              onClick={toggleChat}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${isDark ? 'hover:bg-slate-700 border-slate-600 text-slate-300' : 'hover:bg-gray-100 border-gray-300 text-gray-700'}`}
            >
              Chat
            </button>
          </div>

          <div className="flex-1 flex justify-center items-center">
            <ControlBar controls={{ microphone: true, camera: true, screenShare: true, leave: false }} className="!bg-transparent !p-0 !border-0" />
          </div>

          <div className="flex items-center justify-end w-1/3">
            <button
              onClick={handleFullscreen}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${isDark ? 'hover:bg-slate-700 border-slate-600 text-slate-300' : 'hover:bg-gray-100 border-gray-300 text-gray-700'}`}
            >
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
          </div>
        </div>

        <RoomAudioRenderer />

        {/* Render the videos with absolute positioning directly inside LiveKitRoom. 
            By avoiding portals to document.body, the videos correctly go Full Screen 
            along with containerRef. */}
        <VideoStreams containerRef={containerRef} />
      </LiveKitRoom>
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function formatTime(seconds) {
  if (!seconds) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}
