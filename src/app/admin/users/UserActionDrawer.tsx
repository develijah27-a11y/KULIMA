'use client';

import React, { useState } from 'react';
import {
  X, Phone, MessageSquare, ExternalLink, ShieldAlert,
  ShieldCheck, CheckCircle2, AlertTriangle, RotateCcw,
  Ban, Check, Copy, User, MapPin, Calendar, Clock,
} from 'lucide-react';
import { getTelUri, openPhoneDialer, formatPhoneDisplay } from '@/lib/phone-dialer';

export interface AdminUser {
  id: string;
  user_id: string;
  full_name: string | null;
  phone_number: string | null;
  location: string | null;
  role: string;
  created_at: string;
  primary_crop?: string | null;
  verification_level?: string | null;
  is_suspended?: boolean;
  quality_strikes?: number;
  suspension_reason?: string | null;
}

interface Props {
  user: AdminUser | null;
  onClose: () => void;
  onUpdated: () => void;
}

const ROLE_CFG: Record<string, { color: string; bg: string; label: string }> = {
  farmer:      { color: 'var(--color-success)',  bg: 'var(--color-success-bg)',  label: 'Farmer' },
  buyer:       { color: 'var(--color-harvest)',  bg: 'var(--color-harvest-bg)',  label: 'Buyer' },
  transporter: { color: 'var(--color-sky)',      bg: 'var(--color-sky-bg)',      label: 'Transporter' },
  supplier:    { color: 'var(--color-purple)',   bg: 'var(--color-purple-bg)',   label: 'Supplier' },
  pathologist: { color: 'var(--color-danger)',   bg: 'var(--color-danger-bg)',   label: 'Pathologist' },
  offtaker:    { color: 'var(--color-cyan)',     bg: 'var(--color-cyan-bg)',     label: 'Offtaker' },
  groups:      { color: 'var(--color-lime)',     bg: 'var(--color-lime-bg)',     label: 'Group Admin' },
  admin:       { color: 'var(--d-muted)',         bg: 'var(--color-surface-2)',   label: 'Admin' },
};

export function UserActionDrawer({ user, onClose, onUpdated }: Props) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspendInput, setShowSuspendInput] = useState(false);
  const [verLevel, setVerLevel] = useState<string>(user?.verification_level || 'grey');

  if (!user) return null;

  const cfg = ROLE_CFG[user.role] ?? ROLE_CFG.farmer;
  const phone = user.phone_number ?? '';
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${user.full_name || 'there'}, this is Kwagala Elijah from Cropify Administration regarding your account.`)}`
    : null;

  async function executeAction(action: string, payload: Record<string, unknown> = {}) {
    setLoadingAction(action);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.user_id,
          action,
          ...payload,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Action failed');

      setSuccess(json.message ?? 'Action completed successfully');
      setShowSuspendInput(false);
      onUpdated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setLoadingAction(null);
    }
  }

  function handleCopyPhone(p: string) {
    navigator.clipboard.writeText(p);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  }

  const C = {
    text: 'var(--d-text)',
    muted: 'var(--d-muted)',
    border: 'var(--d-border)',
    card: 'var(--d-card)',
    green: 'var(--color-primary)',
    red: 'var(--color-danger)',
    amber: 'var(--color-harvest)',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.card, width: '100%', maxWidth: 540, height: '100vh',
          overflow: 'auto', boxShadow: '-8px 0 40px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-surface-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, background: cfg.bg, color: cfg.color }}>
              {(user.full_name ?? '?')[0].toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: 0 }}>{user.full_name ?? 'Unknown User'}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: cfg.bg, color: cfg.color }}>
                  {cfg.label}
                </span>
                <span style={{ fontSize: 11, color: C.muted }}>ID: #{user.user_id?.slice(0, 8)}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 6 }}>
            <X size={20} />
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div style={{ padding: '12px 20px', background: 'var(--color-danger-bg)', borderBottom: `1px solid var(--color-danger-border)` }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.red, margin: 0 }}>{error}</p>
          </div>
        )}
        {success && (
          <div style={{ padding: '12px 20px', background: 'var(--color-success-bg)', borderBottom: `1px solid var(--color-success-border)` }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-success)', margin: 0 }}>{success}</p>
          </div>
        )}

        {/* Content Body */}
        <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Quick Contact Bar */}
          <div style={{ background: 'var(--color-primary-bg)', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--color-primary-muted)' }}>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.green, margin: '0 0 8px' }}>
              Direct Customer Contact
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone size={15} style={{ color: C.green }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                  {phone ? formatPhoneDisplay(phone) : 'No phone registered'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {waUrl && (
                  <a
                    href={waUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: '#25D366', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
                  >
                    <ExternalLink size={12} /> WhatsApp
                  </a>
                )}
                {phone && (
                  <a
                    href={getTelUri(phone)}
                    onClick={(e) => openPhoneDialer(phone, e)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'var(--d-card)', border: `1px solid ${C.border}`, color: C.text, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
                  >
                    <Phone size={12} /> Call
                  </a>
                )}
                {phone && (
                  <button
                    onClick={() => handleCopyPhone(phone)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: 12, cursor: 'pointer' }}
                  >
                    {copiedPhone ? <Check size={12} style={{ color: 'var(--color-success)' }} /> : <Copy size={12} />}
                    {copiedPhone ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Account Status Card */}
          <div style={{ background: 'var(--color-surface-2)', borderRadius: 14, padding: '14px 16px', border: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '0 0 10px' }}>
              Account Trust & Quality Status
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <p style={{ fontSize: 11, color: C.muted, margin: '0 0 2px' }}>Standing</p>
                {user.is_suspended ? (
                  <span style={{ fontSize: 11, fontWeight: 900, padding: '3px 9px', borderRadius: 999, background: 'var(--color-danger-bg)', color: C.red, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Ban size={12} /> SUSPENDED
                  </span>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: 'var(--color-success-bg)', color: 'var(--color-success)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={12} /> ACTIVE
                  </span>
                )}
              </div>
              <div>
                <p style={{ fontSize: 11, color: C.muted, margin: '0 0 2px' }}>Quality Strikes</p>
                <p style={{ fontSize: 14, fontWeight: 900, color: (user.quality_strikes ?? 0) >= 3 ? C.red : (user.quality_strikes ?? 0) > 0 ? C.amber : C.text, margin: 0 }}>
                  {user.quality_strikes ?? 0} / 3 Strikes
                </p>
              </div>
            </div>

            {user.suspension_reason && (
              <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)' }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: C.red, textTransform: 'uppercase', margin: '0 0 3px' }}>Suspension Reason:</p>
                <p style={{ fontSize: 12, color: C.red, margin: 0, lineHeight: 1.5 }}>{user.suspension_reason}</p>
              </div>
            )}
          </div>

          {/* Profile Details */}
          <div style={{ background: 'var(--color-surface-2)', borderRadius: 14, padding: '14px 16px', border: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '0 0 10px' }}>
              Profile Details
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <span style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> District</span>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '2px 0 0' }}>{user.location || 'Not set'}</p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> Member Since</span>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '2px 0 0' }}>{new Date(user.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              {user.primary_crop && (
                <div>
                  <span style={{ fontSize: 11, color: C.muted }}>Primary Crop</span>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '2px 0 0', textTransform: 'capitalize' }}>{user.primary_crop}</p>
                </div>
              )}
            </div>
          </div>

          {/* Admin Moderation Actions */}
          <div style={{ background: 'var(--color-surface-2)', borderRadius: 14, padding: '16px', border: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, margin: '0 0 12px' }}>
              Account Actions
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Reinstate or Suspend button */}
              {user.is_suspended ? (
                <button
                  onClick={() => executeAction('reinstate')}
                  disabled={loadingAction === 'reinstate'}
                  style={{
                    padding: '10px 16px', borderRadius: 10, background: 'var(--color-success)', color: '#fff',
                    fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <RotateCcw size={14} /> {loadingAction === 'reinstate' ? 'Reinstating…' : 'Reinstate Account'}
                </button>
              ) : (
                <>
                  {!showSuspendInput ? (
                    <button
                      onClick={() => setShowSuspendInput(true)}
                      style={{
                        padding: '10px 16px', borderRadius: 10, background: 'var(--color-danger-bg)', color: C.red,
                        fontWeight: 700, fontSize: 13, border: `1px solid var(--color-danger-border)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      <Ban size={14} /> Temporarily Suspend Account
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'var(--d-card)', borderRadius: 10, border: `1px solid ${C.border}` }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: C.red, margin: 0 }}>Reason for suspension:</p>
                      <input
                        type="text"
                        value={suspendReason}
                        onChange={e => setSuspendReason(e.target.value)}
                        placeholder="e.g. Repeated substandard produce delivery..."
                        className="app-input"
                        style={{ fontSize: 12 }}
                      />
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button onClick={() => setShowSuspendInput(false)} className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>Cancel</button>
                        <button
                          onClick={() => executeAction('suspend', { reason: suspendReason })}
                          disabled={loadingAction === 'suspend'}
                          style={{ padding: '6px 14px', borderRadius: 8, background: C.red, color: '#fff', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}
                        >
                          {loadingAction === 'suspend' ? 'Suspending…' : 'Confirm Suspension'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Reset Strikes button */}
              {(user.quality_strikes ?? 0) > 0 && (
                <button
                  onClick={() => executeAction('reset_strikes')}
                  disabled={loadingAction === 'reset_strikes'}
                  style={{
                    padding: '9px 16px', borderRadius: 10, background: 'var(--d-card)', border: `1px solid ${C.border}`,
                    color: C.text, fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <RotateCcw size={13} /> {loadingAction === 'reset_strikes' ? 'Resetting…' : `Reset ${user.quality_strikes} Quality Strikes to 0`}
                </button>
              )}

              {/* KYC Verification Level Adjuster */}
              <div style={{ paddingTop: 8, borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Verification Tier:</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select
                    value={verLevel}
                    onChange={e => setVerLevel(e.target.value)}
                    className="app-input"
                    style={{ width: 'auto', fontSize: 11, padding: '4px 8px', minHeight: 'unset' }}
                  >
                    <option value="grey">Grey (Unverified)</option>
                    <option value="green">Green (Basic)</option>
                    <option value="blue">Blue (Standard)</option>
                    <option value="gold">Gold (Premium)</option>
                  </select>
                  <button
                    onClick={() => executeAction('update_verification', { verificationLevel: verLevel })}
                    disabled={loadingAction === 'update_verification' || verLevel === user.verification_level}
                    style={{
                      padding: '4px 10px', borderRadius: 8, background: C.green, color: '#fff',
                      fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
                      opacity: verLevel === user.verification_level ? 0.5 : 1,
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Cross Navigation Shortcuts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <a
              href={`/admin/support?q=${encodeURIComponent(user.full_name || '')}`}
              style={{
                padding: '10px', borderRadius: 10, background: 'var(--d-card)', border: `1px solid ${C.border}`,
                textAlign: 'center', fontSize: 12, fontWeight: 700, color: C.text, textDecoration: 'none',
              }}
            >
              Support Tickets →
            </a>
            <a
              href={`/admin/deliveries`}
              style={{
                padding: '10px', borderRadius: 10, background: 'var(--d-card)', border: `1px solid ${C.border}`,
                textAlign: 'center', fontSize: 12, fontWeight: 700, color: C.text, textDecoration: 'none',
              }}
            >
              Deliveries / Orders →
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
