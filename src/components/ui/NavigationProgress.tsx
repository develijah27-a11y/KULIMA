'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export function NavigationProgress() {
  const pathname  = usePathname();
  const prevPath  = useRef(pathname);
  const crawlRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  // width 0-100, visible true/false
  const [w,   setW]   = useState(0);
  const [show, setShow] = useState(false);

  function clearAll() {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
    if (crawlRef.current) { clearInterval(crawlRef.current); crawlRef.current = null; }
  }

  function start() {
    clearAll();
    setShow(true);
    setW(8);
    let p = 8;
    crawlRef.current = setInterval(() => {
      p = p + (88 - p) * 0.10; // asymptotically approaches 88, never quite gets there
      setW(p);
    }, 280);
  }

  function finish() {
    clearAll();
    setW(100);
    // Keep bar visible briefly at 100% so user sees the snap-to-complete
    timerRefs.current.push(setTimeout(() => setShow(false), 280));
    timerRefs.current.push(setTimeout(() => setW(0),        580));
  }

  // Pathname changed → navigation completed
  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;
    finish();
  }, [pathname]);

  // Click capture on entire document — start bar on any internal link click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest<HTMLAnchorElement>('a[href]');
      if (!a) return;
      // Skip external links and same-page anchors
      try {
        const url = new URL(a.href, location.origin);
        if (url.origin !== location.origin) return;
        if (url.pathname === location.pathname && !url.search) return;
      } catch { return; }
      start();
    };
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      clearAll();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!show && w === 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 99999,
        pointerEvents: 'none',
        transformOrigin: 'left center',
        transform: `scaleX(${w / 100})`,
        opacity: show ? 1 : 0,
        background: 'var(--color-primary, #22C55E)',
        boxShadow: '0 0 12px 0 var(--color-primary, #22C55E)',
        transition: [
          `transform ${w === 100 ? 150 : 280}ms ease-out`,
          `opacity 200ms ease ${w === 100 ? 120 : 0}ms`,
        ].join(', '),
      }}
    />
  );
}
