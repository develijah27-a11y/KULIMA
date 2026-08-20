'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  formatter?: (n: number) => string;
  durationMs?: number;
}

// Smoothly counts from the previous value to a new one instead of the
// number just snapping — used for money figures where the value can
// genuinely change while the component stays mounted (e.g. a wallet
// balance after router.refresh() following a deposit/withdrawal). Never
// animates the very first render — only a value that *changes* while
// already on screen reads as a "confirmation," counting up from zero on
// initial load would read as a loading flourish instead. Skips the
// animation entirely under prefers-reduced-motion, jumping straight to
// the new value.
export function AnimatedNumber({ value, formatter = (n) => Math.round(n).toLocaleString(), durationMs = 600 }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      prevValue.current = value;
      return;
    }
    if (value === prevValue.current) return;

    const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setDisplay(value);
      prevValue.current = value;
      return;
    }

    const from = prevValue.current;
    const to = value;
    const start = performance.now();
    let raf: number;

    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prevValue.current = to;
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return <>{formatter(display)}</>;
}
