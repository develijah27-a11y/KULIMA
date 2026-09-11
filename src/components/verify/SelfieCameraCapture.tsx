'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCcw, AlertTriangle, Camera, Upload, CheckCircle2, Sun, Eye, RefreshCw, SwitchCamera, ShieldCheck } from 'lucide-react';

const C = {
  text: 'var(--d-text)',
  muted: 'var(--d-muted)',
  border: 'var(--d-border)',
  cardBg: 'var(--d-card)',
  green: 'var(--color-primary)',
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

  // Callback ref for the video element to guarantee stream attachment on mount
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

  // Start camera with resilient fallback constraints
  const startCamera = useCallback(async (targetFacing: 'user' | 'environment' = facingMode) => {
    setError('');
    setStarting(true);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStarting(false);
      setError('Live camera streaming is not supported on this browser or insecure connection. Please use the camera app / upload button below.');
      return;
    }

    // Stop any existing stream before requesting a new one
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    let stream: MediaStream | null = null;

    // Cascade 1: Requested facing mode with standard dimensions
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: targetFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (err1) {
      console.warn('[Cropify Selfie] Preferred resolution failed, trying basic facingMode:', err1);
      // Cascade 2: Basic requested facing mode
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: targetFacing },
          audio: false,
        });
      } catch (err2) {
        console.warn('[Cropify Selfie] Facing mode failed, falling back to any available video track:', err2);
        // Cascade 3: Any video device
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (err3: any) {
          console.error('[Cropify Selfie] All video constraints failed:', err3);
          setStarting(false);
          const isDenied =
            err3?.name === 'NotAllowedError' ||
            err3?.name === 'PermissionDeniedError' ||
            String(err3).includes('denied');
          setError(
            isDenied
              ? 'Camera permission was denied. Please allow camera access in your browser settings, or use the camera button below.'
              : 'Could not access the camera. Make sure no other application is using it, or take a photo with your phone camera.'
          );
          return;
        }
      }
    }

    if (!stream) {
      setStarting(false);
      setError('Failed to acquire camera stream. Please use the photo button below.');
      return;
    }

    streamRef.current = stream;
    setFacingMode(targetFacing);
    setActive(true);
    setStarting(false);

    // If video element already mounted, attach immediately
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [facingMode]);

  // Flip / Switch Camera
  const toggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    startCamera(nextMode);
  };

  // Capture frame from video stream
  function capture() {
    const video = videoRef.current;
    if (!video || capturing) return;

    // Ensure video is ready
    if (video.readyState < 2) {
      setError('Camera is still initializing, please wait a moment and tap capture again.');
      return;
    }

    setCapturing(true);

    try {
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // If front camera, mirror image so selfie matches preview
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          setCapturing(false);
          if (blob) {
            const capturedFile = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(capturedFile);
            stopCamera();
          } else {
            // Fallback via dataURL
            try {
              const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
              const arr = dataUrl.split(',');
              const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
              const bstr = atob(arr[1]);
              let n = bstr.length;
              const u8arr = new Uint8Array(n);
              while (n--) u8arr[n] = bstr.charCodeAt(n);
              const fallbackFile = new File([u8arr], `selfie-${Date.now()}.jpg`, { type: mime });
              onCapture(fallbackFile);
              stopCamera();
            } catch {
              setError('Failed to process photo frame. Please use the camera app button below.');
            }
          }
        },
        'image/jpeg',
        0.92
      );
    } catch (err: any) {
      console.error('[Cropify Selfie] Capture error:', err);
      setCapturing(false);
      setError('Could not capture frame. Please tap the photo button below.');
    }
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
        <div
          style={{
            width: '100%',
            maxWidth: 240,
            aspectRatio: '3/4',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 4px 14px rgba(15,23,42,0.14)',
            border: `2.5px solid var(--color-success)`,
            position: 'relative',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Captured selfie preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-success)', fontSize: 13, fontWeight: 700 }}>
            <CheckCircle2 size={16} /> Photo ready
          </span>
          <button
            type="button"
            onClick={retake}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 10,
              border: `1.5px solid ${C.border}`,
              background: C.cardBg,
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: 700,
              color: C.text,
            }}
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
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 280,
            aspectRatio: '3/4',
            borderRadius: 18,
            overflow: 'hidden',
            background: '#0F172A',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}
        >
          <video
            ref={setVideoElement}
            playsInline
            muted
            autoPlay
            onLoadedMetadata={() => {
              if (videoRef.current) {
                videoRef.current.play().catch(() => {});
              }
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
            }}
          />

          {/* Biometric Head & Vest / Shoulders Viewfinder Overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 240 320"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                filter: 'drop-shadow(0 0 4px rgba(34, 197, 94, 0.4))',
              }}
            >
              {/* Viewfinder 4 Corner Brackets */}
              <path
                d="M 18 42 L 18 18 L 42 18"
                fill="none"
                stroke="#22C55E"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d="M 198 18 L 222 18 L 222 42"
                fill="none"
                stroke="#22C55E"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d="M 18 278 L 18 302 L 42 302"
                fill="none"
                stroke="#22C55E"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d="M 198 302 L 222 302 L 222 278"
                fill="none"
                stroke="#22C55E"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Head & Face Contour Oval */}
              <ellipse
                cx="120"
                cy="92"
                rx="44"
                ry="56"
                fill="rgba(34, 197, 94, 0.04)"
                stroke="#22C55E"
                strokeWidth="2.5"
                strokeDasharray="6 4"
              />

              {/* Eye Alignment Crosshairs */}
              <line x1="90" y1="88" x2="106" y2="88" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
              <line x1="134" y1="88" x2="150" y2="88" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" opacity="0.8" />

              {/* Neck Guide Lines */}
              <path d="M 104 144 L 102 165" fill="none" stroke="#22C55E" strokeWidth="2" opacity="0.8" />
              <path d="M 136 144 L 138 165" fill="none" stroke="#22C55E" strokeWidth="2" opacity="0.8" />

              {/* Vest / Shoulders / Torso Silhouette Outline */}
              {/* Vest V-Neck Collar */}
              <path
                d="M 102 165 Q 120 200 138 165"
                fill="none"
                stroke="#22C55E"
                strokeWidth="2.5"
              />

              {/* Left Shoulder & Outer Vest Arm */}
              <path
                d="M 102 165 C 80 170 50 188 26 220 L 20 315"
                fill="none"
                stroke="#22C55E"
                strokeWidth="2.5"
                strokeDasharray="7 5"
              />

              {/* Right Shoulder & Outer Vest Arm */}
              <path
                d="M 138 165 C 160 170 190 188 214 220 L 220 315"
                fill="none"
                stroke="#22C55E"
                strokeWidth="2.5"
                strokeDasharray="7 5"
              />

              {/* Central Vest Zipper / Button Placket Seam */}
              <line
                x1="120"
                y1="200"
                x2="120"
                y2="315"
                stroke="#22C55E"
                strokeWidth="2"
                strokeDasharray="5 4"
                opacity="0.75"
              />

              {/* Vest Armhole / Lapel Cut Contours */}
              <path
                d="M 44 235 C 56 260 58 285 60 315"
                fill="none"
                stroke="#22C55E"
                strokeWidth="1.8"
                opacity="0.6"
              />
              <path
                d="M 196 235 C 184 260 182 285 180 315"
                fill="none"
                stroke="#22C55E"
                strokeWidth="1.8"
                opacity="0.6"
              />
            </svg>

            {/* Subtle animated scanning laser line */}
            <div
              style={{
                position: 'absolute',
                left: '12%',
                right: '12%',
                height: 2,
                background: 'linear-gradient(90deg, transparent 0%, #22C55E 50%, transparent 100%)',
                boxShadow: '0 0 8px #22C55E',
                animation: 'pulse 1.8s ease-in-out infinite',
                top: '42%',
              }}
            />
          </div>

          {/* Camera switch toggle button */}
          <button
            type="button"
            onClick={toggleCamera}
            title="Switch Camera (Front/Back)"
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(15,23,42,0.75)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(6px)',
              zIndex: 5,
            }}
          >
            <SwitchCamera size={18} />
          </button>

          {/* Live Instruction Pill */}
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(15,23,42,0.88)',
              backdropFilter: 'blur(8px)',
              padding: '6px 14px',
              borderRadius: 999,
              whiteSpace: 'nowrap',
              border: '1px solid rgba(34,197,94,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              zIndex: 5,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', animation: 'pulse 1s infinite' }} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#FFFFFF' }}>
              Align face & shoulders (vest) in frame
            </span>
          </div>
        </div>

        {/* Capture Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            type="button"
            onClick={capture}
            disabled={capturing}
            aria-label="Take selfie photo"
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#FFFFFF',
              border: `4px solid ${C.green}`,
              cursor: capturing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }}
          >
            <span
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: capturing ? 'var(--d-muted)' : C.green,
                display: 'block',
              }}
            />
          </button>

          <button
            type="button"
            onClick={stopCamera}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: C.cardBg,
              color: C.muted,
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // 3. Initial start camera / fallback state
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: '20px 16px',
        background: 'var(--color-primary-bg)',
        borderRadius: 14,
        border: `1.5px dashed var(--color-primary-muted)`,
      }}
    >
      {/* Biometric Vest & Head Silhouette Preview Badge */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(34, 197, 94, 0.12)',
          border: '1.5px solid rgba(34, 197, 94, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
          {/* Head */}
          <ellipse cx="20" cy="13" rx="6.5" ry="8.5" stroke="#16A34A" strokeWidth="1.8" />
          {/* Vest Collar */}
          <path d="M 16 23 Q 20 28 24 23" stroke="#16A34A" strokeWidth="1.8" />
          {/* Vest Shoulders */}
          <path d="M 16 23 C 12 24 7 27 4 32" stroke="#16A34A" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 24 23 C 28 24 33 27 36 32" stroke="#16A34A" strokeWidth="1.8" strokeLinecap="round" />
          {/* Vest Seam */}
          <line x1="20" y1="28" x2="20" y2="36" stroke="#16A34A" strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
      </div>

      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: '0 0 4px' }}>
          Take a selfie for identity verification
        </p>
        <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.45 }}>
          Align your face and shoulders (vest) inside the biometric outline.
        </p>
      </div>

      {/* Guidance chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color-primary-dark)',
            background: '#FFFFFF',
            padding: '3px 8px',
            borderRadius: 6,
            border: '1px solid var(--color-border)',
          }}
        >
          <ShieldCheck size={12} /> Biometric vest guide
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color-primary-dark)',
            background: '#FFFFFF',
            padding: '3px 8px',
            borderRadius: 6,
            border: '1px solid var(--color-border)',
          }}
        >
          <Sun size={12} /> Good lighting
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color-primary-dark)',
            background: '#FFFFFF',
            padding: '3px 8px',
            borderRadius: 6,
            border: '1px solid var(--color-border)',
          }}
        >
          <Eye size={12} /> Look straight ahead
        </span>
      </div>

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 6,
            color: 'var(--color-danger)',
            fontSize: 12,
            textAlign: 'left',
            background: 'var(--color-danger-bg)',
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid var(--color-danger-border)',
            maxWidth: 320,
          }}
        >
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Hidden file input for native camera snapshot / gallery upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Option A: Open live webcam stream */}
        <button
          type="button"
          onClick={() => startCamera('user')}
          disabled={starting}
          style={{
            padding: '10px 18px',
            borderRadius: 10,
            border: 'none',
            background: C.green,
            color: '#FFFFFF',
            cursor: starting ? 'not-allowed' : 'pointer',
            fontSize: 13,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 2px 8px rgba(22, 107, 58, 0.25)',
          }}
        >
          {starting ? <RefreshCw size={15} className="animate-spin" /> : <Camera size={15} />}
          {starting ? 'Opening camera…' : 'Start live camera'}
        </button>

        {/* Option B: Direct phone camera app / upload (100% reliable fallback) */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: `1.5px solid ${C.border}`,
            background: C.cardBg,
            color: C.text,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Upload size={14} /> Snap with camera app
        </button>
      </div>
    </div>
  );
}
