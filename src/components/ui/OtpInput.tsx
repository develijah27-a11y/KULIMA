'use client';

import { useRef, useState, useEffect } from 'react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  /** Bump this to any new value to re-trigger the shake/red flash — a plain
   *  boolean wouldn't re-fire on two consecutive identical-looking rejections
   *  (e.g. the same wrong code submitted twice in a row). */
  errorTick?: number;
  disabled?: boolean;
}

// Modern segmented code entry — one square box per digit, instead of a
// single text field with letter-spacing faking the look. Handles paste
// (splitting a full clipboard code across every box in one action) and
// per-box keyboard nav so typing/backspacing feels native.
export function OtpInput({ length = 6, value, onChange, onComplete, errorTick, disabled }: OtpInputProps) {
  const boxRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [shaking, setShaking] = useState(false);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  useEffect(() => {
    if (errorTick === undefined) return;
    setShaking(true);
    const t = setTimeout(() => setShaking(false), 500);
    return () => clearTimeout(t);
  }, [errorTick]);

  function setDigitAt(index: number, digit: string) {
    const chars = value.split('');
    chars[index] = digit;
    const next = chars.join('').slice(0, length);
    onChange(next);
    if (next.length === length && !next.includes('')) onComplete?.(next);
  }

  function handleChange(index: number, raw: string) {
    const d = raw.replace(/\D/g, '');
    if (!d) { setDigitAt(index, ''); return; }
    // Typing fast can land more than one digit in a single onChange (mobile
    // keyboards especially) — treat it as a mini-paste starting at this box
    // instead of dropping everything but the first character.
    if (d.length > 1) { handlePasteDigits(index, d); return; }
    setDigitAt(index, d);
    if (index < length - 1) boxRefs.current[index + 1]?.focus();
  }

  function handlePasteDigits(startIndex: number, digitsStr: string) {
    const chars = value.padEnd(length, ' ').split('');
    let i = startIndex;
    for (const ch of digitsStr) {
      if (i >= length) break;
      chars[i] = ch;
      i++;
    }
    const next = chars.slice(0, length).join('').replace(/\s+$/, '');
    onChange(next);
    boxRefs.current[Math.min(i, length - 1)]?.focus();
    if (next.length === length && !next.includes(' ')) onComplete?.(next);
  }

  function handlePaste(index: number, e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!text) return;
    e.preventDefault();
    handlePasteDigits(index, text);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      boxRefs.current[index - 1]?.focus();
      setDigitAt(index - 1, '');
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      boxRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      boxRefs.current[index + 1]?.focus();
    }
  }

  return (
    <div
      className={shaking ? 'otp-group-shake' : undefined}
      style={{
        display: 'flex', gap: 8, justifyContent: 'center',
        padding: 10, borderRadius: 14,
        background: shaking ? 'rgba(239,68,68,0.14)' : 'transparent',
        transition: 'background 0.25s ease',
      }}
      role="group"
      aria-label="Verification code"
    >
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { boxRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={e => handlePaste(i, e)}
          onFocus={e => e.target.select()}
          aria-label={`Digit ${i + 1} of ${length}`}
          style={{
            width: 44, height: 52, textAlign: 'center',
            fontSize: 22, fontWeight: 800,
            borderRadius: 12,
            border: `1.5px solid ${shaking ? 'var(--color-danger)' : d ? 'var(--color-primary)' : 'rgba(255,255,255,0.18)'}`,
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--color-text-on-dark)',
            outline: 'none',
            transition: 'border-color 0.15s ease',
          }}
        />
      ))}
    </div>
  );
}
