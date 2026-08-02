import React, { useEffect, useRef, useCallback } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { useInterview } from '../InterviewContext';
import { useTheme } from '../../../context/ThemeContext';

/**
 * ExcalidrawCanvas
 *
 * A clean, modular wrapper around the official @excalidraw/excalidraw package.
 * Replaces the old CanvasWhiteboard.jsx custom canvas implementation.
 *
 * Responsibilities:
 *  - Renders the Excalidraw editor, automatically matching the app's light/dark
 *    theme by reading from ThemeContext via useTheme().
 *  - On every local change, throttles and broadcasts the full scene to all room
 *    participants via the broadcastExcalidrawScene() context function.
 *  - Listens for remote scene updates (excalidrawScene in context) and applies
 *    them using the Excalidraw API's updateScene() method.
 *
 * Layout contract: parent must be `position: relative` (or `absolute inset-0`).
 * This component renders as `absolute inset-0 z-40` — same as the old whiteboard.
 */

// Throttle helper — fires at most once per `delay` ms, always fires the
// trailing call so the final state is never lost.
function useThrottle(fn, delay) {
  const lastCallRef = useRef(0);
  const timerRef = useRef(null);

  return useCallback(
    (...args) => {
      const now = Date.now();
      const remaining = delay - (now - lastCallRef.current);

      if (remaining <= 0) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        lastCallRef.current = now;
        fn(...args);
      } else {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          timerRef.current = null;
          fn(...args);
        }, remaining);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn, delay]
  );
}

export default function ExcalidrawCanvas() {
  const { excalidrawScene, broadcastExcalidrawScene } = useInterview();
  // Reads 'light' | 'dark' from the global ThemeContext — updates reactively.
  const { theme } = useTheme();

  // Ref to the Excalidraw API instance — used for programmatic scene updates.
  const excalidrawAPIRef = useRef(null);

  // Track whether the last scene update originated remotely to avoid
  // re-broadcasting it back (echo prevention).
  const isRemoteUpdateRef = useRef(false);

  // Apply remote scene updates arriving from other participants.
  useEffect(() => {
    if (!excalidrawScene || !excalidrawAPIRef.current) return;

    try {
      const parsed = JSON.parse(excalidrawScene);
      isRemoteUpdateRef.current = true;
      excalidrawAPIRef.current.updateScene({
        elements: parsed.elements ?? [],
        appState: parsed.appState ?? {},
      });
    } catch (err) {
      console.error('[ExcalidrawCanvas] Failed to parse remote scene:', err);
    }
  }, [excalidrawScene]);

  // Throttled broadcast — sends at most once every 300ms.
  const throttledBroadcast = useThrottle(broadcastExcalidrawScene, 300);

  // onChange fires on every Excalidraw state change (user interaction).
  const handleChange = useCallback(
    (elements, appState) => {
      // Skip re-broadcasting scenes that were applied from a remote update.
      if (isRemoteUpdateRef.current) {
        isRemoteUpdateRef.current = false;
        return;
      }
      throttledBroadcast(elements, appState);
    },
    [throttledBroadcast]
  );

  return (
    <div className="absolute inset-0 z-40 overflow-hidden">
      <Excalidraw
        // Provide the Excalidraw API ref for programmatic access (updateScene).
        excalidrawAPI={(api) => {
          excalidrawAPIRef.current = api;
        }}
        onChange={handleChange}
        // theme prop follows the app's active theme (light / dark) reactively.
        theme={theme}
        // Show the built-in menu (save, export, etc.) and collaboration panel.
        UIOptions={{
          canvasActions: {
            saveToActiveFile: false, // We handle persistence via Socket.IO
            loadScene: false,        // Prevent loading external files mid-session
            export: {
              saveFileToDisk: true,  // Allow local PNG / SVG export
            },
          },
        }}
      />
    </div>
  );
}
