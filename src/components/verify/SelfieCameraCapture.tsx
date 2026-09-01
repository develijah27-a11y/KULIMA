'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCcw, AlertTriangle, Camera, Upload, CheckCircle2, Sun, Eye } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', green: 'var(--color-primary)',
};

interface Props {
  onCapture: (file: File | null) => void;
  capturedFile: File | null;
}

export function SelfieCameraCapture({ onCapture, capturedFile }: Props) {
  const videoRef  = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError]   = useState('');
  const [showUploadFallback, setShowUploadFallback] = useState(false);
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
    setShowUploadFallback(false);
    try {
      // Primary: request front-facing selfie camera
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
          audio: false,
        });
      } catch {
        // Fallback for browsers with strict facingMode matching
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
    } catch (err: any) {
      setShowUploadFallback(true);
      setError(
        err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
          ? 'Camera access was denied. You can allow permissions in your browser settings or upload a selfie photo below.'
          : 'Could not access your front camera. You can try again or upload a photo below.'
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
    // Mirror the frame so the saved photo matches what the person saw in preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) return;
      onCapture(new File([blob], 'selfie.jpg', { type: 'image/jpeg' }));
      stopCamera();
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

  if (active) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 240, aspectRatio: '3/4', borderRadius: 18, overflow: 'hidden', background: '#0F172A', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
          <video
            ref={videoRef} playsInline muted autoPlay
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
            style={{ width: 60, height: 60, borderRadius: '50%', background: '#FFFFFF', border: `3.5px solid ${C.green}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }}
          >
            <span style={{ width: 44, height: 44, borderRadius: '50%', background: C.green, display: 'block' }} />
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 16px', background: 'var(--color-primary-bg)', borderRadius: 14, border: `1.5px dashed var(--color-primary-muted)` }}>
      <Camera size={28} style={{ color: C.green }} />
      <div style={{ textAlign: 'center', maxWidth: 280 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: '0 0 4px' }}>
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
          type="button" onClick={startCamera}
          style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: C.green, color: '#FFFFFF', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Camera size={15} /> Start front camera
        </button>

        {showUploadFallback && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
