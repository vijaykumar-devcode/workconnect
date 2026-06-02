import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useInterview } from '../InterviewContext';

export default function CanvasWhiteboard() {
  const { whiteboardBatches, emitWhiteboardEvent } = useInterview();
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const lastPanPoint = useRef(null);
  
  // Interaction State
  const activeObjId = useRef(null);
  const currentPoints = useRef([]);
  const textInputRef = useRef(null);

  // Tools & UI State
  const [mode, setMode] = useState('DRAW'); // 'DRAW' | 'ER'
  const [tool, setTool] = useState('PEN');
  const [color, setColor] = useState('#000000');
  const [textState, setTextState] = useState({ active: false, x: 0, y: 0, val: '' });

  // Infinite Canvas Transforms
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // Utility: Screen to World
  const screenToWorld = (screenX, screenY) => ({
    x: (screenX - pan.x) / zoom,
    y: (screenY - pan.y) / zoom
  });

  // Utility: World to Screen
  const worldToScreen = (worldX, worldY) => ({
    x: worldX * zoom + pan.x,
    y: worldY * zoom + pan.y
  });

  // --- OBJECT DATA MODEL PARSER ---
  // We parse the raw linear socket events into a true Figma-like object dictionary.
  const whiteboardObjects = useMemo(() => {
    const objects = new Map();
    const historyStack = []; // For Redo support (optional)

    whiteboardBatches.forEach(batch => {
      batch.events?.forEach(event => {
        const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
        
        if (event.eventType === 'clear_canvas') {
          objects.clear();
        } else if (event.eventType === 'upsert_object' && payload?.id) {
          objects.set(payload.id, { ...payload });
        } else if (event.eventType === 'remove_object' && payload?.id) {
          objects.delete(payload.id);
        }
        // Legacy Support mapping
        else if (event.eventType === 'draw_line') {
           objects.set(event._id || Math.random().toString(), { type: 'path', points: payload.points, color: payload.color || '#000000' });
        } else if (event.eventType === 'draw_shape') {
           objects.set(event._id || Math.random().toString(), { type: payload.shape, start: payload.start, end: payload.end, color: payload.color || '#000000' });
        }
      });
    });

    return objects;
  }, [whiteboardBatches]);

  // --- RENDERING ENGINE ---
  const renderObjects = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Setup Context
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    
    // Draw Background Grid (Optional enhancement for Infinite Canvas)
    const gridSize = 50;
    ctx.strokeStyle = '#e2e8f0'; // slate-200
    ctx.lineWidth = 1 / zoom;
    
    // Calculate visible bounds in world space
    const startX = Math.floor(-pan.x / zoom / gridSize) * gridSize;
    const startY = Math.floor(-pan.y / zoom / gridSize) * gridSize;
    const endX = startX + canvas.width / zoom + gridSize;
    const endY = startY + canvas.height / zoom + gridSize;
    
    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, startY); ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(startX, y); ctx.lineTo(endX, y);
    }
    ctx.stroke();

    // Render all canonical objects
    whiteboardObjects.forEach((obj) => {
      ctx.beginPath();
      ctx.strokeStyle = obj.color || '#000000';
      ctx.fillStyle = obj.color || '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (obj.type === 'path' && obj.points?.length > 0) {
        obj.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();
      } else if (['RECTANGLE', 'SQUARE'].includes(obj.type)) {
        if (obj.start && obj.end) {
          const w = obj.type === 'SQUARE' ? Math.max(Math.abs(obj.end.x - obj.start.x), Math.abs(obj.end.y - obj.start.y)) * Math.sign(obj.end.x - obj.start.x) : (obj.end.x - obj.start.x);
          const h = obj.type === 'SQUARE' ? Math.abs(w) * Math.sign(obj.end.y - obj.start.y) : (obj.end.y - obj.start.y);
          ctx.strokeRect(obj.start.x, obj.start.y, w, h);
        }
      } else if (obj.type === 'CIRCLE') {
        const radius = Math.sqrt(Math.pow(obj.end.x - obj.start.x, 2) + Math.pow(obj.end.y - obj.start.y, 2));
        ctx.arc(obj.start.x, obj.start.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (obj.type === 'LINE' || obj.type === 'RELATION_LINE') {
        ctx.moveTo(obj.start.x, obj.start.y);
        ctx.lineTo(obj.end.x, obj.end.y);
        ctx.stroke();
      } else if (obj.type === 'TEXT') {
        ctx.font = '16px sans-serif';
        ctx.fillText(obj.text, obj.x, obj.y + 16);
      } else if (obj.type === 'ENTITY_BOX') {
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#64748b';
        ctx.fillRect(obj.x, obj.y, 150, 100);
        ctx.strokeRect(obj.x, obj.y, 150, 100);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '14px monospace';
        ctx.fillText(obj.name || 'Entity', obj.x + 10, obj.y + 20);
        ctx.beginPath();
        ctx.moveTo(obj.x, obj.y + 30); ctx.lineTo(obj.x + 150, obj.y + 30);
        ctx.stroke();
      }
    });

    // Render active local object being drawn
    if (isDrawing.current && activeObjId.current && currentPoints.current.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (tool === 'PEN') {
        currentPoints.current.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();
      } else {
         const start = currentPoints.current[0];
         const end = currentPoints.current[1] || start;
         if (tool === 'LINE') {
            ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
         } else if (tool === 'RECTANGLE') {
            ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
         } else if (tool === 'CIRCLE') {
            const r = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
            ctx.arc(start.x, start.y, r, 0, 2*Math.PI); ctx.stroke();
         }
      }
    }

    ctx.restore();
  };

  // Resize Listener & Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resize = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
      renderObjects();
    };
    
    window.addEventListener('resize', resize);
    resize();
    return () => window.removeEventListener('resize', resize);
  }, [whiteboardObjects, pan, zoom, color, tool]);

  // Handle Zoom Input
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const zoomDelta = e.deltaY * -0.005;
        const newZoom = Math.min(Math.max(0.1, zoom + zoomDelta), 5);
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldX = (mouseX - pan.x) / zoom;
        const worldY = (mouseY - pan.y) / zoom;
        setPan({ x: mouseX - worldX * newZoom, y: mouseY - worldY * newZoom });
        setZoom(newZoom);
      } else {
        // Pan
        setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [pan, zoom]);

  // --- MOUSE HANDLERS ---
  const handleDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (e.button === 1 || tool === 'PAN' || e.shiftKey) {
      isPanning.current = true;
      lastPanPoint.current = { x: sx, y: sy };
      return;
    }

    const { x, y } = screenToWorld(sx, sy);
    
    if (tool === 'ERASER') {
      // Find object to delete by hit-testing bounding boxes (simplified approach)
      let targetId = null;
      for (const [id, obj] of whiteboardObjects.entries()) {
        if (obj.type === 'path' && obj.points) {
           const hit = obj.points.some(p => Math.abs(p.x - x) < 20 && Math.abs(p.y - y) < 20);
           if (hit) targetId = id;
        } else if (obj.type === 'RECTANGLE' && obj.start && obj.end) {
           const minX = Math.min(obj.start.x, obj.end.x);
           const maxX = Math.max(obj.start.x, obj.end.x);
           const minY = Math.min(obj.start.y, obj.end.y);
           const maxY = Math.max(obj.start.y, obj.end.y);
           if (x >= minX && x <= maxX && y >= minY && y <= maxY) targetId = id;
        } else if (obj.type === 'CIRCLE' && obj.start && obj.end) {
           const r = Math.sqrt(Math.pow(obj.end.x - obj.start.x, 2) + Math.pow(obj.end.y - obj.start.y, 2));
           const dist = Math.sqrt(Math.pow(x - obj.start.x, 2) + Math.pow(y - obj.start.y, 2));
           if (dist <= r) targetId = id;
        } else if (obj.type === 'TEXT') {
           if (x >= obj.x && x <= obj.x + 100 && y >= obj.y && y <= obj.y + 30) targetId = id;
        } else if (obj.type === 'ENTITY_BOX') {
           if (x >= obj.x && x <= obj.x + 150 && y >= obj.y && y <= obj.y + 100) targetId = id;
        }
      }
      
      if (targetId) {
         emitWhiteboardEvent('remove_object', { id: targetId });
      }
      return;
    }

    if (tool === 'TEXT') {
      setTextState({ active: true, screenX: sx, screenY: sy, worldX: x, worldY: y, val: '' });
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }

    if (tool === 'ENTITY_BOX') {
       const uuid = crypto.randomUUID();
       emitWhiteboardEvent('upsert_object', { id: uuid, type: 'ENTITY_BOX', x, y, name: 'New_Entity' });
       return;
    }

    isDrawing.current = true;
    activeObjId.current = crypto.randomUUID();
    currentPoints.current = [{ x, y }];
  };

  const handleMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (isPanning.current) {
      setPan(prev => ({ x: prev.x + (sx - lastPanPoint.current.x), y: prev.y + (sy - lastPanPoint.current.y) }));
      lastPanPoint.current = { x: sx, y: sy };
      return;
    }

    if (!isDrawing.current) return;

    const { x, y } = screenToWorld(sx, sy);
    
    if (tool === 'PEN') {
      currentPoints.current.push({ x, y });
    } else {
      currentPoints.current[1] = { x, y };
    }
    
    requestAnimationFrame(renderObjects); // Redraw immediately for local feedback
  };

  const handleUp = () => {
    if (isPanning.current) {
      isPanning.current = false;
      return;
    }

    if (!isDrawing.current) return;
    isDrawing.current = false;
    
    // Finalize object and push to server
    if (currentPoints.current.length > 0) {
       let payload = null;
       if (tool === 'PEN') {
          payload = { id: activeObjId.current, type: 'path', points: currentPoints.current, color };
       } else if (tool !== 'ERASER') {
          payload = { id: activeObjId.current, type: tool, start: currentPoints.current[0], end: currentPoints.current[1] || currentPoints.current[0], color };
       }

       if (payload) {
          emitWhiteboardEvent('upsert_object', payload);
       }
    }
    
    activeObjId.current = null;
    currentPoints.current = [];
    renderObjects();
  };

  const commitText = () => {
    if (textState.val.trim()) {
      const uuid = crypto.randomUUID();
      emitWhiteboardEvent('upsert_object', { id: uuid, type: 'TEXT', x: textState.worldX, y: textState.worldY, text: textState.val, color });
    }
    setTextState({ active: false, x: 0, y: 0, val: '' });
  };

  return (
    <div className="absolute inset-0 z-40 bg-slate-900/50 backdrop-blur-sm pointer-events-auto overflow-hidden">
      
      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 bg-slate-800 border border-slate-700 p-1.5 rounded-lg shadow-xl flex items-center gap-1 z-50">
        <button onClick={() => setZoom(z => Math.max(0.1, z - 0.2))} className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded">-</button>
        <button onClick={() => { setZoom(1); setPan({x:0, y:0}); }} className="px-3 py-1 text-xs text-slate-300 font-mono hover:text-white hover:bg-slate-700 rounded">{Math.round(zoom * 100)}%</button>
        <button onClick={() => setZoom(z => Math.min(5, z + 0.2))} className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded">+</button>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 p-2 rounded-xl shadow-2xl flex gap-2 z-50 overflow-x-auto max-w-[95%]">
        
        {/* Mode Selector */}
        <div className="flex bg-slate-900 rounded-lg p-1 mr-2 border border-slate-700 shrink-0">
          <button onClick={() => { setMode('DRAW'); setTool('PEN'); }} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${mode === 'DRAW' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>DRAW</button>
          <button onClick={() => { setMode('ER'); setTool('ENTITY_BOX'); }} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${mode === 'ER' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>ER DIAGRAM</button>
        </div>

        {/* Tools */}
        <div className="flex shrink-0">
          {mode === 'ER' && (
            <>
              <button onClick={() => setTool('ENTITY_BOX')} className={`px-2 py-1 text-xs rounded-md ${tool === 'ENTITY_BOX' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Entity Box</button>
              <button onClick={() => setTool('RELATION_LINE')} className={`px-2 py-1 text-xs rounded-md ${tool === 'RELATION_LINE' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Connector</button>
            </>
          )}
          {mode === 'DRAW' && (
            <>
              <button onClick={() => setTool('PAN')} className={`px-2 py-1 text-xs rounded-md ${tool === 'PAN' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`} title="Pan (Hold Space)">Hand</button>
              <button onClick={() => setTool('PEN')} className={`px-2 py-1 text-xs rounded-md ${tool === 'PEN' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Pen</button>
              <button onClick={() => setTool('LINE')} className={`px-2 py-1 text-xs rounded-md ${tool === 'LINE' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Line</button>
              <button onClick={() => setTool('RECTANGLE')} className={`px-2 py-1 text-xs rounded-md ${tool === 'RECTANGLE' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Rectangle</button>
              <button onClick={() => setTool('CIRCLE')} className={`px-2 py-1 text-xs rounded-md ${tool === 'CIRCLE' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Circle</button>
              <button onClick={() => setTool('TEXT')} className={`px-2 py-1 text-xs rounded-md ${tool === 'TEXT' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Text</button>
              <button onClick={() => setTool('ERASER')} className={`px-2 py-1 text-xs rounded-md ${tool === 'ERASER' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Eraser</button>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex gap-1 items-center ml-2 border-l border-slate-700 pl-2 shrink-0">
          <button onClick={() => emitWhiteboardEvent('clear_canvas', {})} className="px-2 py-1 text-xs rounded-md text-red-400 hover:text-red-300">Clear</button>
        </div>

        {/* Color Picker */}
        <div className="flex gap-1 items-center ml-2 border-l border-slate-700 pl-2 shrink-0">
          <button onClick={() => setColor('#000000')} className={`w-5 h-5 rounded-full bg-black border ${color === '#000000' ? 'border-white' : 'border-slate-700'}`} />
          <button onClick={() => setColor('#2563eb')} className={`w-5 h-5 rounded-full bg-blue-600 border ${color === '#2563eb' ? 'border-white' : 'border-slate-700'}`} />
          <button onClick={() => setColor('#dc2626')} className={`w-5 h-5 rounded-full bg-red-600 border ${color === '#dc2626' ? 'border-white' : 'border-slate-700'}`} />
          <button onClick={() => setColor('#16a34a')} className={`w-5 h-5 rounded-full bg-green-600 border ${color === '#16a34a' ? 'border-white' : 'border-slate-700'}`} />
        </div>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={handleDown}
        onMouseMove={handleMove}
        onMouseUp={handleUp}
        onMouseOut={handleUp}
        className={`block w-full h-full ${tool === 'PAN' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
      />
      
      {textState.active && (
        <input 
          ref={textInputRef}
          type="text"
          className="absolute bg-transparent border border-indigo-500 outline-none px-1 shadow-lg"
          style={{ left: textState.screenX, top: textState.screenY, font: '16px sans-serif', color }}
          value={textState.val}
          onChange={e => setTextState({ ...textState, val: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter') commitText(); }}
          onBlur={commitText}
        />
      )}
    </div>
  );
}
