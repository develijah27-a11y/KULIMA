'use client';

import { useEffect, useRef, useState } from 'react';
import { ScanLine, X, AlertTriangle } from 'lucide-react';

interface Props {
  onScanned: (code: string) => void;
  onCancel?: () => void;
  label?: string;
}

// Deliberately camera-only, no free-text fallback: barcode entry in POS
// (both registering a product and ringing up a sale) must come from an
// actual scan, never typed — typos here would either misprice a sale or
// silently create duplicate SKUs. Uses the browser-native BarcodeDetector
// API (Chrome/Edge/Android WebView) so no extra scanning library is needed;
// on browsers without it we tell the user plainly rather than falling back
// to a text input.
export function BarcodeScanner({ onScanned, onCancel, label = 'Scan Barcode' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<any>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && !('BarcodeDetector' in window)) {
      setSupported(false);
    }
  }, []);

  function stopStream() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  useEffect(() => () => stopStream(), []);

  async function openScanner() {
    setError('');
    if (!supported) {
      setError('Barcode scanning isn’t supported in this browser. Try the latest Chrome on Android.');
      return;
    }
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
      setOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });

      const DetectorCtor = (window as any).BarcodeDetector;
      detectorRef.current = new DetectorCtor({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'itf'],
      });

      const scanFrame = async () => {
        if (!videoRef.current || !detectorRef.current) return;
        try {
          const codes = await detectorRef.current.detect(videoRef.current);
          if (codes && codes.length > 0) {
            const value = codes[0].rawValue;
            stopStream();
            setOpen(false);
            onScanned(value);
            return;
          }
        } catch {
          // transient decode errors are normal between frames — keep scanning
        }
        rafRef.current = requestAnimationFrame(scanFrame);
      };
      rafRef.current = requestAnimationFrame(scanFrame);
    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('No camera was found on this device.');
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setError('Your camera is already in use by another app or tab. Close it and try again.');
      } else if (!window.isSecureContext) {
        setError('Camera access requires a secure (https://) connection.');
      } else if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError('Camera permission is blocked for this site. Allow Camera in your browser settings and try again.');
      } else {
        setError('Could not start the camera. Please try again.');
      }
    }
  }

  function close() {
    stopStream();
    setOpen(false);
    onCancel?.();
  }

  return (
    <div>
      <button
        type="button"
        onClick={openScanner}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', padding: '12px', borderRadius: 12, border: '1.5px solid var(--d-border)',
          background: 'var(--d-input-bg)', color: 'var(--color-primary)', fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
        }}
      >
        <ScanLine size={17} /> {label}
      </button>
      {error && (
        <p style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
          <AlertTriangle size={13} /> {error}
        </p>
      )}

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 420, borderRadius: 14, overflow: 'hidden', background: '#000' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block', aspectRatio: '4/3', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 24, border: '2px solid rgba(255,255,255,0.7)', borderRadius: 10, pointerEvents: 'none' }} />
            <p style={{ position: 'absolute', top: 10, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 12.5, fontWeight: 600, margin: 0 }}>
              Point the camera at the barcode
            </p>
            <button type="button" onClick={close} aria-label="Cancel scan"
              style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', width: 42, height: 42, borderRadius: 999, border: 'none', background: 'rgba(0,0,0,0.55)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
