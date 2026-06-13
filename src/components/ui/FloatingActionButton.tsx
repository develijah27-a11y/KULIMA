'use client';

import { type ReactNode, type ButtonHTMLAttributes } from 'react';

interface FABProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label?: string;
  variant?: 'primary' | 'harvest' | 'white';
}

export function FloatingActionButton({
  icon,
  label,
  variant = 'primary',
  className = '',
  ...props
}: FABProps) {
  const colorClass =
    variant === 'harvest' ? 'fab-harvest' : variant === 'white' ? 'fab-white' : 'fab-primary';

  return (
    <button
      className={`fab ${colorClass}${label ? ' fab-extended' : ''} no-min-touch${className ? ' ' + className : ''}`}
      aria-label={props['aria-label'] ?? (typeof label === 'string' ? label : 'Action')}
      {...props}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}
