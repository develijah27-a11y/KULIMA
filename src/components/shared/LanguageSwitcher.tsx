'use client';

import { cn } from '@/lib/utils';

const LANGUAGES = [
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'lg', label: 'LG', full: 'Luganda' },
  { code: 'sw', label: 'SW', full: 'Swahili' },
] as const;

export function LanguageSwitcher({
  current,
  onChange,
  className,
}: {
  current: string;
  onChange: (code: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex rounded-xl bg-surface2 p-0.5 gap-0.5 border border-surface2',
        className
      )}
      role="radiogroup"
      aria-label="Language"
    >
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          role="radio"
          aria-checked={current === lang.code}
          onClick={() => onChange(lang.code)}
          className={cn(
            'px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors',
            current === lang.code
              ? 'bg-sprout text-white dark:text-soil'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          )}
          title={lang.full}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
