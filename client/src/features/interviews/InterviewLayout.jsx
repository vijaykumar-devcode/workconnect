import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LiveKitRoom, RoomAudioRenderer, ControlBar, useTracks, ParticipantTile, useLocalParticipant, TrackToggle } from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import { Rnd } from 'react-rnd';
import ChatModal from './components/ChatModal';
import CanvasWhiteboard from './components/CanvasWhiteboard';
import ScreenShareArea from './components/ScreenShareArea';
import { useInterview } from './InterviewContext';

function VideoStreams() {
  const tracks = useTracks([Track.Source.Camera]);

  return (
    <>
      {tracks.map((trackReference, index) => (
        <Rnd
          key={trackReference.participant.identity}
          default={{
            x: window.innerWidth - 320 - 20,
            y: window.innerHeight - (240 + 20) * (index + 1) - 100,
            width: 320,
            height: 240,
          }}
          minWidth={200}
          minHeight={150}
          bounds="window"
          className="z-50 bg-slate-800 rounded-xl overflow-hidden shadow-2xl border border-slate-700/50"
        >
          <div className="w-full h-full relative">
            <ParticipantTile
              participant={trackReference.participant}
              source={trackReference.source}
              className="w-full h-full object-cover"
            />
          </div>
        </Rnd>
      ))}
    </>
  );
}

function CustomScreenShareButton() {
  const { localParticipant } = useLocalParticipant();
  const { role } = useInterview();
  const isSharing = localParticipant?.isScreenShareEnabled;

  useEffect(() => {
    if (role === 'CANDIDATE' && localParticipant) {
      // console.log(`[DEBUG-CANDIDATE] isScreenShareEnabled: ${isSharing}`);
      localParticipant.getTrackPublications().forEach((pub) => {
        if (pub.source === Track.Source.ScreenShare) {
          // console.log(`[DEBUG-CANDIDATE] Published Track Info -> isMuted: ${pub.isMuted}, hasTrack: ${!!pub.track}`);
        }
      });
    }
  }, [isSharing, localParticipant, role]);

  if (role !== 'CANDIDATE') return null;

  return (
    <TrackToggle 
      source={Track.Source.ScreenShare}
      showIcon={false}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border shadow-sm flex items-center gap-2 ${isSharing ? 'bg-red-500 hover:bg-red-600 border-red-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 border-indigo-500 text-white'}`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      {isSharing ? 'Stop Screen Share' : 'Share Screen'}
    </TrackToggle>
  );
}

export default function InterviewLayout({ interviewId }) {
  const { liveKitToken, timerState, toggleChat, extendTimer, role } = useInterview();
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (timerState.remainingSeconds === 0 && timerState.actualEndTime != null && !hasEnded) {
      setHasEnded(true);
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => {});
      } catch (e) {}
      alert('Time is up! The interview is marked as completed.');
      handleEndInterview();
    }
  }, [timerState.remainingSeconds, timerState.actualEndTime, hasEnded]);

  const getTimerColor = (seconds) => {
    if (!seconds) return 'text-amber-400';
    if (seconds <= 300) return 'text-red-500 animate-pulse'; // 5 mins
    if (seconds <= 600) return 'text-orange-500'; // 10 mins
    if (seconds <= 900) return 'text-yellow-400'; // 15 mins
    return 'text-green-400';
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current) {
        containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => console.error(err));
      }
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(err => console.error(err));
    }
  };

  const handleEndInterview = () => {
    // Navigate back to the previous screen or explicitly to interviews dashboard
    // The LiveKitRoom unmounting will cleanly disconnect them
    navigate(-1);
  };

  if (!liveKitToken) {
    return <div className="flex items-center justify-center h-screen bg-slate-900 text-white">Authenticating Room...</div>;
  }

  return (
    <div ref={containerRef} className="h-screen w-full flex flex-col bg-slate-900 text-white overflow-hidden relative">
      <LiveKitRoom
        video={true}
        audio={true}
        token={liveKitToken}
        serverUrl={import.meta.env.VITE_LIVEKIT_URL || 'wss://your-livekit-server.com'}
        adaptiveStream={true}
        dynacast={true}
        data-lk-theme="default"
        className="w-full h-full flex flex-col relative"
      >
      {/* TOP BAR */}
      <div className="h-14 border-b border-slate-700 bg-slate-800 flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold tracking-wide">Technical Interview</h2>
          <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400 font-medium">In Progress</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className={`text-xl font-mono ${getTimerColor(timerState.remainingSeconds)}`}>
              {formatTime(timerState.remainingSeconds)}
            </div>
            {role !== 'CANDIDATE' && (
              <>
                <button onClick={() => extendTimer(5)} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded transition-colors">+5m</button>
                <button onClick={() => extendTimer(10)} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded transition-colors">+10m</button>
                <button onClick={() => extendTimer(15)} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded transition-colors">+15m</button>
              </>
            )}
          </div>
          <button onClick={handleEndInterview} className="bg-red-500 hover:bg-red-600 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
            End Interview
          </button>
        </div>
      </div>

      {/* CANDIDATE SHARED SCREEN (PRIMARY AREA) - 80% Viewport */}
      <div className="flex-1 w-full bg-slate-950 flex items-center justify-center relative overflow-hidden">
        
        {/* LiveKit Screen Share rendering */}
        <ScreenShareArea />
        
        {/* Whiteboard / ER Diagram Canvas Layer (Absolute over screen share if active) */}
        {isWhiteboardOpen && <CanvasWhiteboard />}

        {/* Floating Chat Modal */}
        <ChatModal />
      </div>

      {/* FLOATING DRAGGABLE VIDEOS */}
      <VideoStreams />

      {/* BOTTOM TOOLBAR */}
      <div className="h-16 border-t border-slate-700 bg-slate-800 flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-4 w-1/3">
          <button 
            onClick={() => setIsWhiteboardOpen(!isWhiteboardOpen)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${isWhiteboardOpen ? 'bg-indigo-600 text-white border-indigo-600' : 'hover:bg-slate-700 border-slate-600'}`}
          >
            Whiteboard
          </button>
          <button 
            onClick={toggleChat}
            className="px-4 py-2 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-600"
          >
            Chat
          </button>
        </div>

        <div className="flex-1 flex justify-center items-center gap-4">
          <CustomScreenShareButton />
          <ControlBar className="!bg-transparent !p-0 !border-0" />
        </div>

        <div className="flex items-center justify-end w-1/3">
          <button onClick={handleFullscreen} className="px-4 py-2 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-600">
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>

      {/* Hidden Audio Renderer for LiveKit */}
      <RoomAudioRenderer />
    </LiveKitRoom>
    </div>
  );
}

function formatTime(seconds) {
  if (!seconds) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
