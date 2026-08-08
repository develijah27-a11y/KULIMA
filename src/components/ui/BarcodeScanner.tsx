'use client';

import { useEffect, useRef, useState } from 'react';
import { X, AlertTriangle, ScanLine } from 'lucide-react';

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
}

// Full-screen live camera overlay that decodes barcodes/QR codes from the
// rear camera in real time via ZXing (pure-JS, no native BarcodeDetector
// dependency — that API isn't available on iOS Safari, which a meaningful
// share of the phones this app runs on will be using).
export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  const detectedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let controls: { stop: () => void } | null = null;

    async function start() {
      if (!('mediaDevices' in navigator) || !navigator.mediaDevices.getUserMedia) {
        setError('Camera access isn’t available in this browser.');
        return;
      }
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const { DecodeHintType, BarcodeFormat } = await import('@zxing/library');
        if (cancelled) return;

        // Narrowing to the formats actually printed on retail/farm-input
        // packaging (vs. every format ZXing supports) means each frame is
        // decoded against a handful of candidates instead of a dozen+ —
        // that's most of the "feels slow" gap, not the camera itself.
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
          BarcodeFormat.ITF, BarcodeFormat.QR_CODE,
        ]);
        // TRY_HARDER trades a little per-frame speed for correctly reading
        // small/low-resolution barcodes — the ones that were failing
        // outright before, not just scanning slower.
        hints.set(DecodeHintType.TRY_HARDER, true);

        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 80 });
        controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: 'environment' },
              // Higher resolution = more pixels across a tiny barcode, which
              // matters more for small codes than for large ones (large
              // codes already had enough resolution to decode before).
              width: { ideal: 1920 }, height: { ideal: 1080 },
              // Not in the standard TS lib.dom constraint types, but
              // supported by most Android/Chrome cameras — continuous
              // autofocus instead of a single fixed focus at stream start.
              advanced: [{ focusMode: 'continuous' } as unknown as MediaTrackConstraintSet],
            },
            audio: false,
          },
          videoRef.current!,
          (result, err) => {
            if (detectedRef.current) return;
            if (result) {
              detectedRef.current = true;
              const text = result.getText();
              if (navigator.vibrate) navigator.vibrate(80);
              controls?.stop();
              onDetected(text);
            }
            // NotFoundException fires continuously between frames while
            // nothing is in view — that's the normal idle state, not an error.
          },
        );
      } catch (err: unknown) {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setError('Camera permission is blocked. Allow camera access in your browser settings and try again.');
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setError('No camera was found on this device.');
        } else if (!window.isSecureContext) {
          setError('Camera scanning requires a secure (https://) connection.');
        } else {
          setError('Could not start the camera. Please try again.');
        }
      }
    }

    start();
    return () => { cancelled = true; controls?.stop(); };
  }, [onDetected]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: '#000', display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {/* Scan-area frame */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: '78%', maxWidth: 340, aspectRatio: '5/3', border: '2.5px solid rgba(255,255,255,0.85)', borderRadius: 16, boxShadow: '0 0 0 2000px rgba(0,0,0,0.45)' }} />
        </div>
        {!error && (
          <div style={{ position: 'absolute', top: 18, left: 0, right: 0, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#fff', fontSize: 13, fontWeight: 700 }}>
            <ScanLine size={16} /> Point the camera at a barcode
          </div>
        )}
        {error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: 'rgba(20,20,20,0.92)', borderRadius: 16, padding: '20px 22px', maxWidth: 320, textAlign: 'center' }}>
              <AlertTriangle size={22} style={{ color: '#FFA726', marginBottom: 10 }} />
              <p style={{ color: '#fff', fontSize: 13.5, fontWeight: 600, margin: 0, lineHeight: 1.5 }}>{error}</p>
            </div>
          </div>
        )}
      </div>
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 14, right: 14,
          width: 40, height: 40, borderRadius: 999, border: 'none',
          background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)',
        }}
        aria-label="Close scanner"
      >
        <X size={20} />
      </button>
      <div style={{ padding: '16px 20px', background: '#000' }}>
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '13px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.25)',
            background: 'transparent', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
