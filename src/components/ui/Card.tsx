'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  const baseClasses = 'bg-white rounded-xl border border-gray-200 p-6';
  const clickableClasses = onClick ? 'cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all' : '';
  
  return (
    <div 
      className={`${baseClasses} ${clickableClasses} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
}

export function CardHeader({ title, description }: CardHeaderProps) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
    </div>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={className}>{children}</div>;
}