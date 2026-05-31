'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { X, Eraser, Pen, Undo2, Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageAnnotatorProps {
  imageSrc: string;
  onSave: (newSrc: string) => void;
  onClose: () => void;
}

const COLORS = [
  { label: 'Red',    value: '#ef4444' },
  { label: 'Blue',   value: '#3b82f6' },
  { label: 'Yellow', value: '#fbbf24' },
  { label: 'Green',  value: '#22c55e' },
  { label: 'Black',  value: '#111111' },
  { label: 'White',  value: '#ffffff' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Orange', value: '#f97316' },
];

const SIZES = [2, 5, 10, 20];

export default function ImageAnnotator({ imageSrc, onSave, onClose }: ImageAnnotatorProps) {
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef     = useRef<HTMLCanvasElement>(null); // original image, never drawn on
  const annotCanvasRef  = useRef<HTMLCanvasElement>(null); // transparent annotation layer

  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#ef4444');
  const [size, setSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const historyRef  = useRef<ImageData[]>([]);
  const lastPosRef  = useRef<{ x: number; y: number } | null>(null);

  // Composite bg + annotation → display canvas
  const composite = useCallback(() => {
    const display = displayCanvasRef.current;
    const bg      = bgCanvasRef.current;
    const annot   = annotCanvasRef.current;
    if (!display || !bg || !annot) return;
    const ctx = display.getContext('2d')!;
    ctx.clearRect(0, 0, display.width, display.height);
    ctx.drawImage(bg, 0, 0);
    ctx.drawImage(annot, 0, 0);
  }, []);

  // Load image into bg canvas and size all canvases
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      for (const ref of [displayCanvasRef, bgCanvasRef, annotCanvasRef]) {
        if (ref.current) { ref.current.width = w; ref.current.height = h; }
      }
      // Draw image into bg canvas
      const bgCtx = bgCanvasRef.current!.getContext('2d')!;
      bgCtx.drawImage(img, 0, 0);
      // Also draw into display initially
      const dispCtx = displayCanvasRef.current!.getContext('2d')!;
      dispCtx.drawImage(img, 0, 0);
      setLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Map pointer position to canvas coordinates
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return null;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      if (!t) return null;
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const saveHistory = () => {
    const annot = annotCanvasRef.current;
    if (!annot) return;
    const d = annot.getContext('2d')!.getImageData(0, 0, annot.width, annot.height);
    historyRef.current = [...historyRef.current.slice(-29), d];
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;
    saveHistory();
    setIsDrawing(true);
    lastPosRef.current = pos;

    const annotCtx = annotCanvasRef.current?.getContext('2d');
    if (!annotCtx) return;

    if (tool === 'eraser') {
      annotCtx.globalCompositeOperation = 'destination-out';
      annotCtx.beginPath();
      annotCtx.arc(pos.x, pos.y, size * 2, 0, Math.PI * 2);
      annotCtx.fillStyle = 'rgba(0,0,0,1)';
      annotCtx.fill();
      annotCtx.globalCompositeOperation = 'source-over';
    } else {
      annotCtx.beginPath();
      annotCtx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2);
      annotCtx.fillStyle = color;
      annotCtx.fill();
    }
    composite();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !lastPosRef.current) return;
    const pos = getPos(e);
    if (!pos) return;
    const annotCtx = annotCanvasRef.current?.getContext('2d');
    if (!annotCtx) return;

    if (tool === 'eraser') {
      annotCtx.globalCompositeOperation = 'destination-out';
      annotCtx.beginPath();
      annotCtx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      annotCtx.lineTo(pos.x, pos.y);
      annotCtx.strokeStyle = 'rgba(0,0,0,1)';
      annotCtx.lineWidth = size * 4;
      annotCtx.lineCap = 'round';
      annotCtx.lineJoin = 'round';
      annotCtx.stroke();
      annotCtx.globalCompositeOperation = 'source-over';
    } else {
      annotCtx.beginPath();
      annotCtx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      annotCtx.lineTo(pos.x, pos.y);
      annotCtx.strokeStyle = color;
      annotCtx.lineWidth = size;
      annotCtx.lineCap = 'round';
      annotCtx.lineJoin = 'round';
      annotCtx.stroke();
    }
    lastPosRef.current = pos;
    composite();
  };

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(false);
    lastPosRef.current = null;
  };

  const handleUndo = () => {
    const annot = annotCanvasRef.current;
    if (!annot || historyRef.current.length === 0) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    annot.getContext('2d')!.putImageData(prev, 0, 0);
    composite();
  };

  const handleSave = () => {
    const bg    = bgCanvasRef.current;
    const annot = annotCanvasRef.current;
    if (!bg || !annot) return;
    const final  = document.createElement('canvas');
    final.width  = bg.width;
    final.height = bg.height;
    const ctx = final.getContext('2d')!;
    ctx.drawImage(bg, 0, 0);
    ctx.drawImage(annot, 0, 0);
    onSave(final.toDataURL('image/jpeg', 0.93));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black"
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0 flex-wrap gap-y-2">
        {/* Tool */}
        <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg p-0.5">
          <button onClick={() => setTool('pen')}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              tool === 'pen' ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white')}>
            <Pen size={12} /> Pen
          </button>
          <button onClick={() => setTool('eraser')}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              tool === 'eraser' ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white')}>
            <Eraser size={12} /> Eraser
          </button>
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {COLORS.map((c) => (
            <button key={c.value} onClick={() => { setColor(c.value); setTool('pen'); }}
              title={c.label}
              style={{ backgroundColor: c.value }}
              className={cn(
                'w-6 h-6 rounded-full border-2 transition-all hover:scale-110 flex-shrink-0',
                color === c.value && tool === 'pen'
                  ? 'border-white scale-125 shadow-[0_0_0_2px_#6366f1]'
                  : 'border-gray-600'
              )}
            />
          ))}
        </div>

        {/* Stroke size */}
        <div className="flex items-center gap-1">
          {SIZES.map((s) => (
            <button key={s} onClick={() => setSize(s)} title={`${s}px`}
              className={cn('flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                size === s ? 'bg-brand-500/30 ring-1 ring-brand-500' : 'hover:bg-gray-700')}>
              <div className="rounded-full bg-white flex-shrink-0" style={{ width: Math.min(s, 16), height: Math.min(s, 16) }} />
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <button onClick={handleUndo}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-300 hover:bg-gray-700 transition-colors">
          <Undo2 size={13} /> Undo
        </button>
        <button onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-colors">
          <Check size={13} /> Save
        </button>
        <button onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* ── Canvas area ── */}
      <div className="flex-1 overflow-auto bg-gray-950 flex items-start justify-center p-3">
        {!loaded && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading…</div>
        )}

        {/* Hidden canvases */}
        <canvas ref={bgCanvasRef}    className="hidden" />
        <canvas ref={annotCanvasRef} className="hidden" />

        {/* Visible display canvas */}
        <canvas
          ref={displayCanvasRef}
          style={{
            cursor: tool === 'eraser' ? 'cell' : 'crosshair',
            touchAction: 'none',
            display: loaded ? 'block' : 'none',
            maxWidth: '100%',
            height: 'auto',
          }}
          onMouseDown={startDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      <p className="text-center py-1.5 text-[11px] text-gray-600 flex-shrink-0">
        Draw on the image · Eraser removes annotations · Save to embed back into note
      </p>
    </div>
  );
}
