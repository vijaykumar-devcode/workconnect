import React, { useEffect } from 'react';
import { useTracks, VideoTrack } from '@livekit/components-react';
import { Track } from 'livekit-client';

export default function ScreenShareArea() {
  // Official LiveKit React Pattern:
  // useTracks automatically handles the WebRTC event lifecycle, triggering React re-renders
  // natively when tracks are published, subscribed, or unpublished without any manual 'room.on' events.
  const tracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }]);

  // We rely ONLY on TrackPublication logic to find the active stream.
  // We NEVER use tracks[0] or participant boolean flags.
  const activeScreenShare = tracks.find(
    (t) => t.source === Track.Source.ScreenShare && t.publication && t.publication.isSubscribed && t.publication.track
  );

  // Mandatory Debug Logs
  useEffect(() => {
    console.groupCollapsed('[DEBUG-SCREENSHARE] LiveKit State');
    console.log(`Total Track References Detected: ${tracks.length}`);
    tracks.forEach((t) => {
      console.log(`Participant: ${t.participant.identity}`);
      if (t.publication) {
        console.log(` ↳ publication.source: ${t.publication.source}`);
        console.log(` ↳ publication.isSubscribed: ${t.publication.isSubscribed}`);
        console.log(` ↳ publication.track exists: ${!!t.publication.track}`);
      } else {
        console.log(` ↳ Empty Placeholder (No Publication)`);
      }
    });
    console.groupEnd();
  }, [tracks]);

  if (!activeScreenShare) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500 font-medium bg-slate-950">
        <div className="flex flex-col items-center gap-2">
          <svg className="w-12 h-12 text-slate-700 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p>Waiting for candidate to share screen...</p>
        </div>
      </div>
    );
  }

  // Render ONLY when valid track exists
  return (
    <div className="w-full h-full bg-black relative">
      <VideoTrack 
        trackRef={activeScreenShare}
        className="w-full h-full object-contain" 
      />
      <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded text-xs text-white backdrop-blur-md z-50 shadow-lg border border-slate-700">
        Candidate Screen (Live)
      </div>
    </div>
  );
}
