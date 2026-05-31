'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eraser, Pen, Undo2, Trash2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrawingCanvasProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

const COLORS = [
  { label: 'Black',  value: '#1a1a1a' },
  { label: 'White',  value: '#ffffff' },
  { label: 'Red',    value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Green',  value: '#22c55e' },
  { label: 'Blue',   value: '#3b82f6' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Pink',   value: '#ec4899' },
];

const SIZES = [2, 4, 8, 16];
const CANVAS_W = 1200;
const CANVAS_H = 800;
const MAX_HISTORY = 20;

export default function DrawingCanvas({ isOpen, onClose, onSave }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#1a1a1a');
  const [size, setSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const historyRef = useRef<ImageData[]>([]);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const getCtx = () => canvasRef.current?.getContext('2d') ?? null;

  // Initialize canvas with white background when opened
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    historyRef.current = [];
  }, [isOpen]);

  const saveHistory = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    historyRef.current = [...historyRef.current.slice(-MAX_HISTORY + 1), imageData];
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;
    saveHistory();
    setIsDrawing(true);
    lastPosRef.current = pos;

    const ctx = getCtx();
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, (tool === 'eraser' ? size * 2 : size) / 2, 0, Math.PI * 2);
    ctx.fillStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.fill();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const pos = getPos(e);
    if (!pos || !lastPosRef.current) return;

    const ctx = getCtx();
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? size * 3 : size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPosRef.current = pos;
  };

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(false);
    lastPosRef.current = null;
  };

  const handleUndo = () => {
    if (historyRef.current.length === 0) return;
    const ctx = getCtx();
    if (!ctx) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    ctx.putImageData(prev, 0, 0);
  };

  const handleClear = () => {
    const ctx = getCtx();
    if (!ctx) return;
    saveHistory();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  };

  const handleInsert = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/png'));
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-2 md:inset-6 z-50 flex flex-col bg-white dark:bg-surface-900 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header toolbar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 flex-shrink-0 flex-wrap">
              {/* Tool buttons */}
              <div className="flex items-center gap-1 bg-surface-100 dark:bg-surface-700 rounded-lg p-0.5">
                <button
                  onClick={() => setTool('pen')}
                  className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors', tool === 'pen' ? 'bg-white dark:bg-surface-600 text-brand-600 shadow-sm' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-200')}
                >
                  <Pen size={12} /> Pen
                </button>
                <button
                  onClick={() => setTool('eraser')}
                  className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors', tool === 'eraser' ? 'bg-white dark:bg-surface-600 text-brand-600 shadow-sm' : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-200')}
                >
                  <Eraser size={12} /> Eraser
                </button>
              </div>

              {/* Color picker */}
              <div className="flex items-center gap-1">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => { setColor(c.value); setTool('pen'); }}
                    title={c.label}
                    className={cn('w-5 h-5 rounded-full border-2 transition-all hover:scale-110', color === c.value && tool === 'pen' ? 'border-brand-500 scale-110' : 'border-surface-300 dark:border-surface-600')}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>

              {/* Size picker */}
              <div className="flex items-center gap-1">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={cn('flex items-center justify-center w-7 h-7 rounded-lg transition-colors', size === s ? 'bg-brand-500/10 ring-1 ring-brand-500' : 'hover:bg-surface-100 dark:hover:bg-surface-700')}
                    title={`${s}px`}
                  >
                    <div className="rounded-full bg-surface-700 dark:bg-surface-300" style={{ width: s, height: s }} />
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              {/* Actions */}
              <button onClick={handleUndo} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors" title="Undo">
                <Undo2 size={13} /> Undo
              </button>
              <button onClick={handleClear} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors" title="Clear">
                <Trash2 size={13} /> Clear
              </button>
              <button onClick={handleInsert} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 transition-colors">
                <Download size={13} /> Insert
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Canvas */}
            <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-surface-950 flex items-center justify-center p-2">
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                className="max-w-full max-h-full bg-white shadow-md rounded"
                style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair', touchAction: 'none' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
