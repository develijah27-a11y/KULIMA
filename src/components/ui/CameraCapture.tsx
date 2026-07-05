'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw, Check, X, AlertTriangle, Loader2 } from 'lucide-react';

interface Props {
  onCaptured: (url: string) => void;
  onCancel?: () => void;
  label?: string;
}

// Deliberately camera-only, no file picker: farmers/suppliers can only
// submit a photo taken live with the rear camera right now, not an
// uploaded image. This can't detect an AI image re-photographed off
// another screen, but it does close off the far more common problem —
// grabbing an unrelated stock/AI photo straight from a gallery or the web.
export function CameraCapture({ onCaptured, onCancel, label = 'Take a photo' }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase]     = useState<'idle' | 'live' | 'preview' | 'uploading'>('idle');
  const [error, setError]     = useState('');
  const [capturedDataUrl, setCapturedDataUrl] = useState('');

  async function openCamera() {
    setError('');
    if (!('mediaDevices' in navigator) || !navigator.mediaDevices.getUserMedia) {
      setError('Camera access isn’t available in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setPhase('live');
      // Video element mounts on next render — attach once it exists
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setError('Camera access was blocked. Allow camera permission for this site to take a photo.');
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  useEffect(() => () => stopStream(), []);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Burn in a timestamp — a small extra authenticity signal showing
    // exactly when the photo was actually taken.
    const stamp = new Date().toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' });
    const fontSize = Math.max(14, Math.round(canvas.width / 40));
    ctx.font = `600 ${fontSize}px sans-serif`;
    const textWidth = ctx.measureText(stamp).width;
    const pad = fontSize * 0.6;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, canvas.height - fontSize - pad * 2, textWidth + pad * 2, fontSize + pad * 2);
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(stamp, pad, canvas.height - pad - fontSize / 2);

    setCapturedDataUrl(canvas.toDataURL('image/jpeg', 0.85));
    stopStream();
    setPhase('preview');
  }

  function retake() {
    setCapturedDataUrl('');
    openCamera();
  }

  async function useCaptured() {
    setPhase('uploading');
    setError('');
    try {
      const res = await fetch('/api/upload/listing-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: capturedDataUrl }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Upload failed');
      onCaptured(json.url);
      setPhase('idle');
      setCapturedDataUrl('');
    } catch (err: any) {
      setError(err.message);
      setPhase('preview');
    }
  }

  function cancel() {
    stopStream();
    setPhase('idle');
    setCapturedDataUrl('');
    setError('');
    onCancel?.();
  }

  if (phase === 'idle') {
    return (
      <div>
        <button
          type="button"
          onClick={openCamera}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', padding: '14px', borderRadius: 12, border: '1.5px dashed var(--d-border)',
            background: 'var(--d-input-bg)', color: 'var(--color-primary)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}
        >
          <Camera size={18} /> {label}
        </button>
        <p style={{ fontSize: 11, color: 'var(--d-muted)', marginTop: 6, textAlign: 'center' }}>
          Live photo only — no uploading from your gallery, to keep listings honest.
        </p>
        {error && (
          <p style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <AlertTriangle size={13} /> {error}
          </p>
        )}
      </div>
    );
  }

  if (phase === 'live') {
    return (
      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#000' }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block', aspectRatio: '4/3', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 16 }}>
          <button type="button" onClick={cancel} aria-label="Cancel"
            style={{ width: 42, height: 42, borderRadius: 999, border: 'none', background: 'rgba(0,0,0,0.5)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
          <button type="button" onClick={capture} aria-label="Capture photo"
            style={{ width: 60, height: 60, borderRadius: 999, border: '4px solid #fff', background: 'var(--color-primary)', cursor: 'pointer' }} />
        </div>
      </div>
    );
  }

  if (phase === 'preview' || phase === 'uploading') {
    return (
      <div>
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
          <img src={capturedDataUrl} alt="Captured preview" style={{ width: '100%', display: 'block' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button type="button" disabled={phase === 'uploading'} onClick={retake}
            style={{ flex: 1, padding: '11px', borderRadius: 10, border: `1px solid var(--d-border)`, background: 'var(--color-surface-2)', color: 'var(--d-muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <RotateCcw size={14} /> Retake
          </button>
          <button type="button" disabled={phase === 'uploading'} onClick={useCaptured}
            style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {phase === 'uploading' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {phase === 'uploading' ? 'Uploading…' : 'Use this photo'}
          </button>
        </div>
        {error && (
          <p style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <AlertTriangle size={13} /> {error}
          </p>
        )}
      </div>
    );
  }

  return null;
}
