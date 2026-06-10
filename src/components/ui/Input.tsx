'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium" style={{ color: 'var(--color-text)' }}>{label}</label>
        <input
          ref={ref}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${error ? 'border-green-800' : 'border-green-200'} ${className}`}
          style={{ background: 'var(--color-surface)', color: 'var(--color-text)', borderColor: error ? 'var(--color-primary-hover)' : 'var(--color-border-mid)' }}
          {...props}
        />
        {error && <p className="text-sm" style={{ color: 'var(--color-text)' }}>{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';