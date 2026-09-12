'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RotateCcw, CheckCircle2, SwitchCamera, AlertCircle, Sparkles, Sun, Eye } from 'lucide-react';

interface Props {
  onCapture: (file: File | null) => void;
  capturedFile: File | null;
}

export function SelfieCameraCapture({ onCapture, capturedFile }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturing, setCapturing] = useState(false);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActive(false);
    setStarting(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Sync preview url when capturedFile changes
  useEffect(() => {
    if (!capturedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(capturedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [capturedFile]);

  // Callback ref for video element
  const setVideoElement = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.muted = true;
      node.playsInline = true;
      node.setAttribute('playsinline', 'true');
      node.setAttribute('muted', 'true');
      node.srcObject = streamRef.current;
      node.play().catch((err) => {
        console.warn('[Cropify Selfie] Play attempt:', err);
      });
    }
  }, []);

  // Start live camera
  const startCamera = useCallback(async (targetFacing: 'user' | 'environment' = facingMode) => {
    setError('');
    setStarting(true);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStarting(false);
      setError('Live camera streaming is not supported on this browser. Please use the device camera button below.');
      return;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    let stream: MediaStream | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: targetFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: targetFacing },
          audio: false,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (err: any) {
          setStarting(false);
          setError(
            err.name === 'NotAllowedError'
              ? 'Camera permission was denied. Please allow camera access in browser settings or use the phone camera option.'
              : 'Unable to start camera. Please use the phone camera option below.'
          );
          return;
        }
      }
    }

    if (stream) {
      streamRef.current = stream;
      setFacingMode(targetFacing);
      setActive(true);
      setStarting(false);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [facingMode]);

  // Flip between front and rear cameras
  const toggleCamera = useCallback(async () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    await startCamera(next);
  }, [facingMode, startCamera]);

  // Capture frame from video stream
  const capture = useCallback(() => {
    if (!videoRef.current || capturing) return;
    setCapturing(true);

    try {
      const v = videoRef.current;
      const w = v.videoWidth || 640;
      const h = v.videoHeight || 480;

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      // Mirror front-facing camera for natural orientation
      if (facingMode === 'user') {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(v, 0, 0, w, h);

      canvas.toBlob((blob) => {
        if (!blob) {
          setError('Failed to capture photo frame. Please try again.');
          setCapturing(false);
          return;
        }
        const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
        stopCamera();
        onCapture(file);
        setCapturing(false);
      }, 'image/jpeg', 0.92);
    } catch {
      setError('Could not capture frame. Please try taking photo via phone camera.');
      setCapturing(false);
    }
  }, [capturing, facingMode, onCapture, stopCamera]);

  // Native phone camera or file upload
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      stopCamera();
      onCapture(file);
    }
  };

  // 1. Captured State — shows photo with clear actions
  if (previewUrl) {
    return (
      <div className="space-y-4">
        <div className="relative w-full max-w-xs mx-auto aspect-[3/4] rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-md bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Captured verification selfie"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 right-3 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg">
            <CheckCircle2 size={18} />
          </div>
          <div className="absolute bottom-3 inset-x-3 bg-slate-900/80 backdrop-blur-sm py-1.5 px-3 rounded-xl text-center">
            <p className="text-xs font-bold text-white">Selfie Ready for Submission</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              onCapture(null);
              startCamera();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border-mid)',
            }}
          >
            <RotateCcw size={14} />
            <span>Retake Photo</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Active Camera Viewfinder — FaceID style oval HUD
  if (active) {
    return (
      <div className="space-y-4">
        <div className="relative w-full max-w-xs mx-auto aspect-[3/4] rounded-2xl overflow-hidden bg-slate-950 border-2 border-emerald-500 shadow-xl">
          <video
            ref={setVideoElement}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
          />

          {/* Biometric Face Oval Guide Overlay */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
            {/* Oval HUD Frame */}
            <div className="relative w-44 h-60 rounded-[50%] border-2 border-dashed border-emerald-400/90 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
            </div>

            {/* Instruction pill */}
            <div className="absolute bottom-4 bg-slate-900/85 backdrop-blur-md px-4 py-1.5 rounded-full border border-emerald-500/40 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-white">Center your face inside the frame</span>
            </div>
          </div>

          {/* Camera Flip button */}
          <button
            type="button"
            onClick={toggleCamera}
            title="Switch camera"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-slate-900/80 text-white flex items-center justify-center border border-white/20 backdrop-blur-md transition-transform hover:scale-105 active:scale-95 z-10"
          >
            <SwitchCamera size={16} />
          </button>
        </div>

        {/* Capture Control Row */}
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={capture}
            disabled={capturing}
            aria-label="Capture verification photo"
            className="w-16 h-16 rounded-full bg-white border-4 border-emerald-600 flex items-center justify-center p-0 shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <span className="w-12 h-12 rounded-full bg-emerald-600 block" />
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              fileInputRef.current?.click();
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 flex items-center gap-1.5"
          >
            <Camera size={14} />
            <span>Phone App</span>
          </button>

          <button
            type="button"
            onClick={stopCamera}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // 3. Initial Idle State — Professional invitation card
  return (
    <div
      className="p-5 rounded-2xl border-2 border-dashed transition-all text-center space-y-4"
      style={{
        background: 'var(--color-primary-bg)',
        borderColor: 'var(--color-primary-muted)',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={onFileChange}
        className="hidden"
      />

      {/* Biometric Shield Icon Badge */}
      <div
        className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center shadow-sm"
        style={{
          background: 'var(--color-surface)',
          color: 'var(--color-primary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <Camera size={26} strokeWidth={2} />
      </div>

      <div className="max-w-xs mx-auto">
        <h4 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
          Face Identity Verification
        </h4>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
          Take a live photo to confirm your identity matches your legal document.
        </p>
      </div>

      {/* Guidance Badges */}
      <div className="flex items-center justify-center gap-2 flex-wrap text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
          <Sun size={12} className="text-amber-500" /> Good lighting
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
          <Eye size={12} className="text-sky-500" /> Face forward
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
          <Sparkles size={12} className="text-emerald-500" /> Clear background
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-600 dark:text-red-400 flex items-start gap-2 text-left">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Trigger Buttons */}
      <div className="flex items-center justify-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => startCamera('user')}
          disabled={starting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
          }}
        >
          <Camera size={16} />
          <span>{starting ? 'Opening Camera…' : 'Take Selfie'}</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border-mid)',
          }}
        >
          <span>Use Phone Camera</span>
        </button>
      </div>
    </div>
  );
}
