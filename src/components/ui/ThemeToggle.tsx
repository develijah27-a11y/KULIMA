'use client';

import { useState, useEffect } from 'react';
import { toggleTheme, getTheme } from '@/lib/theme';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(getTheme() === 'dark');
  }, []);

  const handleToggle = () => {
    const nowDark = toggleTheme();
    setIsDark(nowDark);
  };

  return (
    <button
      onClick={handleToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="topbar-btn"
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        border: '1px solid var(--color-border-mid)',
        background: 'var(--color-surface-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'unset',
        minWidth: 'unset',
      }}
    >
      {isDark
        ? <Sun size={15} style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
        : <Moon size={15} style={{ color: 'var(--color-text-muted)' }} aria-hidden="true" />
      }
    </button>
  );
}
