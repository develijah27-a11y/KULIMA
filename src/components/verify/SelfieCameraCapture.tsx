'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCcw, AlertTriangle, Camera } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', green: 'var(--color-primary)',
};

interface Props {
  onCapture: (file: File | null) => void;
  capturedFile: File | null;
}

// Verification previously accepted any uploaded image for the "selfie"
// step — a photo of a photo defeats the point of the check entirely. This
// requires a live front-camera capture instead: no file picker for this
// one step, so what gets submitted is a frame actually taken through the
// browser just now. Deliberately NOT full liveness/face detection (blink
// prompts, anti-spoofing) — that's a real feature with its own SDK, this
// is the lighter, faster-to-ship version: camera-required, no upload.
export function SelfieCameraCapture({ onCapture, capturedFile }: Props) {
  const videoRef  = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError]   = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (!capturedFile) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(capturedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [capturedFile]);

  async function startCamera() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
    } catch (err: any) {
      setError(
        err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
          ? 'Camera access was denied. Enable camera permission for this site in your browser settings and try again.'
          : 'Could not access your front camera. Make sure no other app is using it, then try again.'
      );
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Mirror the frame so the saved photo matches what the person saw in
    // the live preview, not a flipped version of it.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) return;
      onCapture(new File([blob], 'selfie.jpg', { type: 'image/jpeg' }));
      stopCamera();
    }, 'image/jpeg', 0.9);
  }

  function retake() {
    onCapture(null);
    startCamera();
  }

  if (previewUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: '100%', maxWidth: 220, aspectRatio: '3/4', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 2px rgba(15,23,42,.08)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Captured selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <button
          type="button" onClick={retake}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.cardBg, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: C.text }}
        >
          <RotateCcw size={14} /> Retake
        </button>
      </div>
    );
  }

  if (active) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 220, aspectRatio: '3/4', borderRadius: 16, overflow: 'hidden', background: '#0F172A' }}>
          <video
            ref={videoRef} playsInline muted autoPlay
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
          <svg width="62%" height="62%" viewBox="0 0 180 230" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
            <ellipse cx="90" cy="115" rx="76" ry="103" fill="none" stroke="#7CC576" strokeWidth="3" strokeDasharray="10 8" />
          </svg>
          <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(15,23,42,0.7)', padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>Position your face in the frame</span>
          </div>
        </div>
        <button
          type="button" onClick={capture} aria-label="Capture selfie"
          style={{ width: 58, height: 58, borderRadius: '50%', background: '#fff', border: `3px solid ${C.green}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
        >
          <span style={{ width: 44, height: 44, borderRadius: '50%', background: C.green, display: 'block' }} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 16px', background: 'var(--color-primary-bg)', borderRadius: 14, border: `1px dashed var(--color-primary-muted)` }}>
      <Camera size={26} style={{ color: C.green }} />
      <p style={{ fontSize: 12.5, color: C.muted, textAlign: 'center', margin: 0, maxWidth: 240 }}>
        We use your front camera only — uploaded photos aren't accepted for this step, to confirm it's really you.
      </p>
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-danger)', fontSize: 12 }}>
          <AlertTriangle size={13} />{error}
        </div>
      )}
      <button
        type="button" onClick={startCamera}
        style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
      >
        Start camera
      </button>
    </div>
  );
}
