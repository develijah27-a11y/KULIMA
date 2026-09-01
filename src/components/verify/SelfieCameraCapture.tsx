'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCcw, AlertTriangle, Camera, Upload, CheckCircle2, Sun, Eye, RefreshCw } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', green: 'var(--color-primary)',
};

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
  const [showUploadFallback, setShowUploadFallback] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
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

  // CRITICAL FIX: Ensure the video element attaches the media stream when mounted in DOM
  useEffect(() => {
    if (active && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.play().catch(err => {
        console.warn('[Cropify Selfie] Autoplay error, waiting for user touch:', err);
      });
    }
  }, [active]);

  async function startCamera() {
    setError('');
    setShowUploadFallback(false);
    setStarting(true);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setShowUploadFallback(true);
      setStarting(false);
      setError('Live camera streaming is not supported on this browser or insecure connection. Please upload a selfie photo below.');
      return;
    }

    try {
      let stream: MediaStream | null = null;

      // Tier 1: Front camera with ideal resolution
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
          audio: false,
        });
      } catch (err1) {
        console.warn('[Cropify Selfie] High-res facingMode constraint failed, trying basic user constraint:', err1);
        // Tier 2: Basic front camera
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false,
          });
        } catch (err2) {
          console.warn('[Cropify Selfie] Basic user constraint failed, falling back to any available video:', err2);
          // Tier 3: Any available camera
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (!stream) throw new Error('Could not acquire video stream.');

      streamRef.current = stream;
      setActive(true);
      setStarting(false);
    } catch (err: any) {
      console.error('[Cropify Selfie] Camera initialization error:', err);
      setShowUploadFallback(true);
      setStarting(false);
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      setError(
        isDenied
          ? 'Camera permission was denied. You can enable camera access in your browser settings or tap "Upload photo instead" below.'
          : 'Could not access your camera. Make sure no other application is using it, or upload a selfie photo below.'
      );
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;

    const width = video.videoWidth || video.clientWidth || 640;
    const height = video.videoHeight || video.clientHeight || 480;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror image so selfie matches the preview screen
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      if (blob) {
        onCapture(new File([blob], 'selfie.jpg', { type: 'image/jpeg' }));
        stopCamera();
      } else {
        // Fallback for older browsers
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          const arr = dataUrl.split(',');
          const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) u8arr[n] = bstr.charCodeAt(n);
          onCapture(new File([u8arr], 'selfie.jpg', { type: mime }));
          stopCamera();
        } catch (dataUrlErr) {
          console.error('[Cropify Selfie] Blob creation failed:', dataUrlErr);
          setError('Failed to capture frame. Please try again or upload a photo.');
          setShowUploadFallback(true);
        }
      }
    }, 'image/jpeg', 0.9);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onCapture(file);
    stopCamera();
  }

  function retake() {
    onCapture(null);
    startCamera();
  }

  // 1. Captured photo preview state
  if (previewUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: '100%', maxWidth: 220, aspectRatio: '3/4', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,.12)', border: `2px solid var(--color-success)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Captured selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-success)', fontSize: 12.5, fontWeight: 700 }}>
            <CheckCircle2 size={15} /> Photo ready
          </span>
          <button
            type="button" onClick={retake}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.cardBg, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: C.text }}
          >
            <RotateCcw size={14} /> Retake
          </button>
        </div>
      </div>
    );
  }

  // 2. Live camera streaming state
  if (active) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 260, aspectRatio: '3/4', borderRadius: 18, overflow: 'hidden', background: '#0F172A', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            onLoadedMetadata={() => {
              videoRef.current?.play().catch(() => {});
            }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
          {/* Face oval guide */}
          <svg width="68%" height="68%" viewBox="0 0 180 230" style={{ position: 'absolute', top: '48%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
            <ellipse cx="90" cy="115" rx="74" ry="98" fill="none" stroke="#4ADE80" strokeWidth="2.5" strokeDasharray="8 6" />
          </svg>
          {/* Real-time instruction badge */}
          <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(15,23,42,0.82)', backdropFilter: 'blur(8px)', padding: '5px 12px', borderRadius: 999, whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.15)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#FFFFFF' }}>Look directly at the camera</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button" onClick={capture} aria-label="Take selfie photo"
            style={{ width: 62, height: 62, borderRadius: '50%', background: '#FFFFFF', border: `3.5px solid ${C.green}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }}
          >
            <span style={{ width: 46, height: 46, borderRadius: '50%', background: C.green, display: 'block' }} />
          </button>
          <button
            type="button" onClick={stopCamera}
            style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.cardBg, color: C.muted, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // 3. Initial start camera / fallback state
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 16px', background: 'var(--color-primary-bg)', borderRadius: 14, border: `1.5px dashed var(--color-primary-muted)` }}>
      <Camera size={28} style={{ color: C.green }} />
      <div style={{ textAlign: 'center', maxWidth: 280 }}>
        <p style={{ fontSize: 13.5, fontWeight: 800, color: C.text, margin: '0 0 4px' }}>
          Take a selfie with your front camera
        </p>
        <p style={{ fontSize: 11.5, color: C.muted, margin: 0, lineHeight: 1.45 }}>
          Make sure your face is in good light and look directly at the screen.
        </p>
      </div>

      {/* Lighting & guidance chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--color-primary-dark)', background: '#FFFFFF', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
          <Sun size={12} /> Good lighting
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--color-primary-dark)', background: '#FFFFFF', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
          <Eye size={12} /> Look straight ahead
        </span>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, color: 'var(--color-danger)', fontSize: 12, textAlign: 'left', background: 'var(--color-danger-bg)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-danger-border)', maxWidth: 300 }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button" onClick={startCamera} disabled={starting}
          style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: C.green, color: '#FFFFFF', cursor: starting ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          {starting ? <RefreshCw size={15} className="animate-spin" /> : <Camera size={15} />}
          {starting ? 'Opening camera…' : 'Start front camera'}
        </button>

        {/* File upload fallback */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{ padding: '10px 16px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.cardBg, color: C.text, cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Upload size={14} /> Upload photo instead
        </button>
      </div>
    </div>
  );
}
