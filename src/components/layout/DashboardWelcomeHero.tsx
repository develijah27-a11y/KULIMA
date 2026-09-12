'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar, MapPin, Sun, Moon,
  Sprout, ShoppingBag, Truck, Store, Users, Building2, FlaskConical, ShieldCheck,
  ArrowRight, CheckCircle2,
} from 'lucide-react';

export interface DashboardWelcomeHeroProps {
  name: string;
  role: 'farmer' | 'buyer' | 'transporter' | 'supplier' | 'groups' | 'offtaker' | 'pathologist' | 'admin' | string;
  location?: string;
  actionHref?: string;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  secondaryAction?: {
    href: string;
    label: string;
    icon?: React.ReactNode;
  };
}

const ROLE_DISPLAY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  farmer:      { label: 'Verified Farmer',      icon: <Sprout size={13} />,       color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
  buyer:       { label: 'Commercial Buyer',    icon: <ShoppingBag size={13} />,  color: 'var(--color-sky)',     bg: 'var(--color-sky-bg)' },
  transporter: { label: 'Logistics Driver',    icon: <Truck size={13} />,        color: 'var(--color-purple)',  bg: 'var(--color-purple-bg)' },
  supplier:    { label: 'Input Supplier',      icon: <Store size={13} />,        color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
  groups:      { label: 'Farmer Group Leader', icon: <Users size={13} />,        color: 'var(--color-lime)',    bg: 'var(--color-lime-bg)' },
  offtaker:    { label: 'Offtaker Partner',    icon: <Building2 size={13} />,    color: 'var(--color-cyan)',    bg: 'var(--color-cyan-bg)' },
  pathologist: { label: 'Plant Pathologist',   icon: <FlaskConical size={13} />, color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
  admin:       { label: 'System Admin',        icon: <ShieldCheck size={13} />,  color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)' },
};

function getGreetingData(hour: number) {
  if (hour >= 5 && hour < 12) {
    return {
      greeting: 'Good morning',
      icon: <Sun size={18} className="text-amber-500" />,
      iconBg: 'rgba(245, 158, 11, 0.12)',
    };
  }
  if (hour >= 12 && hour < 17) {
    return {
      greeting: 'Good afternoon',
      icon: <Sun size={18} className="text-amber-500" />,
      iconBg: 'rgba(245, 158, 11, 0.15)',
    };
  }
  return {
    greeting: 'Good evening',
    icon: <Moon size={18} className="text-indigo-400" />,
    iconBg: 'rgba(99, 102, 241, 0.15)',
  };
}

export function DashboardWelcomeHero({
  name,
  role,
  location,
  actionHref,
  actionLabel,
  actionIcon,
  secondaryAction,
}: DashboardWelcomeHeroProps) {
  const [dateString, setDateString] = useState(() => {
    try {
      return new Date().toLocaleDateString('en-UG', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  });

  const [hour, setHour] = useState(() => new Date().getHours());

  useEffect(() => {
    try {
      const d = new Date();
      setHour(d.getHours());
      setDateString(
        d.toLocaleDateString('en-UG', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
    } catch {}
  }, []);

  const { greeting, icon, iconBg } = getGreetingData(hour);
  const roleCfg = ROLE_DISPLAY_CONFIG[role] ?? {
    label: role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member',
    icon: <CheckCircle2 size={13} />,
    color: 'var(--color-primary)',
    bg: 'var(--color-primary-bg)',
  };

  const cleanLocation = location ? (location.toLowerCase().includes('uganda') ? location : `${location}, Uganda`) : 'Uganda';

  return (
    <div
      className="relative overflow-hidden rounded-2xl border transition-all"
      style={{
        background: 'linear-gradient(135deg, rgba(22, 107, 58, 0.07) 0%, var(--d-card) 52%, rgba(14, 165, 233, 0.05) 100%)',
        borderColor: 'var(--color-border-mid)',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
        padding: 'clamp(18px, 4vw, 26px)',
      }}
    >
      {/* Subtle organic decorative background shape */}
      <svg
        aria-hidden="true"
        className="absolute top-0 right-0 opacity-[0.04] pointer-events-none transform translate-x-8 -translate-y-8"
        width="260"
        height="260"
        viewBox="0 0 200 200"
        fill="none"
      >
        <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="30" />
        <path d="M40 100 Q100 40 160 100" stroke="currentColor" strokeWidth="20" />
      </svg>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Left column: Greeting, Name, Meta chips */}
        <div className="space-y-3 min-w-0 flex-1">
          {/* Top badges: Day-phase greeting & Role pill */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: iconBg, color: 'var(--color-text)' }}
            >
              <span className="shrink-0">{icon}</span>
              <span>{greeting}</span>
            </div>

            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide"
              style={{ background: roleCfg.bg, color: roleCfg.color, border: '1px solid rgba(0,0,0,0.06)' }}
            >
              <span className="shrink-0">{roleCfg.icon}</span>
              <span>{roleCfg.label}</span>
            </div>
          </div>

          {/* User Welcome Title */}
          <div>
            <h1
              className="text-2xl sm:text-3xl font-black tracking-tight"
              style={{ color: 'var(--color-text)', letterSpacing: '-0.03em', fontFamily: 'var(--font-heading)' }}
            >
              Welcome back, <span style={{ color: 'var(--color-primary)' }}>{name}</span>
            </h1>
            <p className="text-xs sm:text-sm mt-1 font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Cropify {roleCfg.label} Command Center
            </p>
          </div>

          {/* Meta Details: Live Date & Live Location beacon */}
          <div className="flex items-center gap-3 text-xs flex-wrap pt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {dateString && (
              <span
                suppressHydrationWarning
                className="inline-flex items-center gap-1.5 font-semibold px-2.5 py-1 rounded-lg"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text)' }}
              >
                <Calendar size={13} className="shrink-0 text-sky-500" />
                {dateString}
              </span>
            )}

            <span
              className="inline-flex items-center gap-1.5 font-semibold px-2.5 py-1 rounded-lg"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text)' }}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <MapPin size={13} className="shrink-0 text-emerald-600" />
              <span>{cleanLocation}</span>
            </span>
          </div>
        </div>

        {/* Right column: Action buttons */}
        <div className="flex items-center gap-3 shrink-0 self-start md:self-center flex-wrap">
          {secondaryAction && (
            <Link
              href={secondaryAction.href}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border-mid)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                textDecoration: 'none',
              }}
            >
              {secondaryAction.icon}
              <span>{secondaryAction.label}</span>
            </Link>
          )}

          {actionHref && actionLabel && (
            <Link
              href={actionHref}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
                boxShadow: '0 4px 14px rgba(22, 107, 58, 0.3)',
                textDecoration: 'none',
              }}
            >
              {actionIcon ?? <ArrowRight size={15} />}
              <span>{actionLabel}</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
