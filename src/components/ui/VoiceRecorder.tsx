'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Play, Pause, Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onSave: (dataUrl: string, duration: number) => void;
  onCancel: () => void;
}

type RecorderState = 'idle' | 'recording' | 'done' | 'error';

export default function VoiceRecorder({ onSave, onCancel }: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setDuration(elapsed);
        setState('done');
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(100);
      setState('recording');
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((v) => v + 1), 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('denied') || msg.includes('NotAllowed')) {
        setErrorMsg('Microphone access denied. Please allow microphone permissions.');
      } else {
        setErrorMsg(`Could not start recording: ${msg}`);
      }
      setState('error');
    }
  }, [elapsed]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
  }, []);

  const togglePlay = () => {
    if (!audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleInsert = useCallback(async () => {
    if (!audioBlob) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onSave(dataUrl, duration);
    };
    reader.readAsDataURL(audioBlob);
  }, [audioBlob, duration, onSave]);

  const handleDiscard = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setIsPlaying(false);
    setState('idle');
    setElapsed(0);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl my-2">
      {state === 'error' && (
        <>
          <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
          <p className="flex-1 text-xs text-red-500">{errorMsg}</p>
          <button onClick={onCancel} className="p-1 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700">
            <X size={16} />
          </button>
        </>
      )}

      {state === 'idle' && (
        <>
          <div className="w-8 h-8 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center flex-shrink-0">
            <Mic size={16} className="text-surface-500" />
          </div>
          <span className="flex-1 text-sm text-surface-500 dark:text-surface-400">Ready to record</span>
          <button
            onClick={startRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Mic size={13} />
            Start Recording
          </button>
          <button onClick={onCancel} className="p-1 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700">
            <X size={16} />
          </button>
        </>
      )}

      {state === 'recording' && (
        <>
          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 flex-shrink-0">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          </div>
          <span className="flex-1 text-sm font-mono text-red-500 font-medium">{formatTime(elapsed)}</span>
          <button
            onClick={stopRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-200 dark:bg-surface-700 hover:bg-surface-300 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 text-xs font-medium rounded-lg transition-colors"
          >
            <Square size={13} />
            Stop
          </button>
        </>
      )}

      {state === 'done' && (
        <>
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center flex-shrink-0 transition-colors"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-surface-700 dark:text-surface-300">Voice recording</p>
            <p className="text-xs text-surface-400">{formatTime(duration)}</p>
          </div>
          <button
            onClick={handleInsert}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Check size={13} />
            Insert
          </button>
          <button
            onClick={handleDiscard}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-600 dark:text-surface-300 text-xs font-medium rounded-lg transition-colors"
          >
            Discard
          </button>
          <button onClick={onCancel} className="p-1 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700">
            <X size={16} />
          </button>
        </>
      )}
    </div>
  );
}
