'use client';

import { useState } from 'react';
import { showToast } from '@/components/ui/NotificationToast';

const C = {
  text:      'var(--d-text)',
  muted:     'var(--d-muted)',
  border:    'var(--d-border)',
  cardBg:    'var(--d-card)',
  shadow:    'var(--d-shadow-card)',
  green:     'var(--color-primary)',
  greenMed:  'var(--color-primary-hover)',
  red:       'var(--color-danger)',
  amber:     'var(--color-harvest)',
  inputBg:   'var(--d-input-bg)',
  inputText: 'var(--d-input-text)',
} as const;

const NOTIFICATION_TYPES = [
  { value: 'system',   label: 'System',     desc: 'Platform-wide announcements'  },
  { value: 'price',    label: 'Price Alert', desc: 'Crop price movement alerts'   },
  { value: 'pest',     label: 'Pest Alert',  desc: 'Crop pest / disease warnings' },
  { value: 'rain',     label: 'Rain',        desc: 'Weather / rainfall advisory'  },
  { value: 'delivery', label: 'Delivery',    desc: 'Delivery logistics updates'   },
];

const TARGET_ROLES = [
  { value: 'all',          label: 'All Users',     desc: 'Every registered user on the platform' },
  { value: 'farmer',       label: 'Farmers',        desc: 'All farmers'        },
  { value: 'buyer',        label: 'Buyers',         desc: 'All buyers'         },
  { value: 'transporter',  label: 'Transporters',   desc: 'All transporters'   },
  { value: 'supplier',     label: 'Suppliers',      desc: 'All suppliers'      },
  { value: 'pathologist',  label: 'Pathologists',   desc: 'All pathologists'   },
  { value: 'offtaker',     label: 'Offtakers',      desc: 'All bulk buyers'    },
  { value: 'groups',       label: 'Farmer Groups',  desc: 'All group leaders'  },
];

type SendState = 'idle' | 'sending' | 'done' | 'empty' | 'error';

export default function AdminAlertPage() {
  const [notifType,   setNotifType]   = useState('system');
  const [targetRole,  setTargetRole]  = useState('all');
  const [title,       setTitle]       = useState('');
  const [body,        setBody]        = useState('');
  const [state,       setState]       = useState<SendState>('idle');
  const [sentCount,   setSentCount]   = useState(0);
  const [errorMsg,    setErrorMsg]    = useState('');

  async function send() {
    if (!title.trim() || !body.trim()) return;
    setState('sending');
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: notifType, targetRole, title: title.trim(), body: body.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Unknown error');
      const sent = json.sent ?? 0;
      setSentCount(sent);
      if (sent === 0) {
        setState('empty');
        showToast({ title: 'No one to notify', body: `No ${TARGET_ROLES.find(r => r.value === targetRole)?.label.toLowerCase() ?? 'users'} found — nothing was sent.`, type: 'system' });
      } else {
        setState('done');
        showToast({ title: 'Broadcast sent', body: `Delivered to ${sent} ${sent === 1 ? 'user' : 'users'}.`, type: 'system' });
        setTitle('');
        setBody('');
      }
    } catch (e: any) {
      const msg = e.message ?? 'Failed to send';
      setErrorMsg(msg);
      setState('error');
      showToast({ title: 'Broadcast failed', body: msg, type: 'system' });
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: `1px solid ${C.border}`, background: C.inputBg,
    color: C.inputText, fontSize: 14, outline: 'none',
    fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.05em',
    color: C.muted, marginBottom: 6,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
          Broadcast Alert
        </h1>
        <p className="text-sm mt-0.5" style={{ color: C.muted }}>Send a notification to users across the platform</p>
      </div>

      {/* Form card */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.shadow, padding: '24px' }}>
        <div className="space-y-5">

          {/* Target audience */}
          <div>
            <label style={labelStyle}>Target Audience</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TARGET_ROLES.map(({ value, label, desc }) => (
                <button
                  key={value}
                  onClick={() => setTargetRole(value)}
                  style={{
                    padding: '10px 12px', borderRadius: 10, border: `2px solid`,
                    borderColor: targetRole === value ? C.greenMed : C.border,
                    background: targetRole === value ? 'var(--color-primary-bg)' : C.inputBg,
                    textAlign: 'left', cursor: 'pointer',
                  }}
                >
                  <p style={{ fontSize: 12, fontWeight: 700, color: targetRole === value ? C.greenMed : C.text, marginBottom: 2 }}>{label}</p>
                  <p style={{ fontSize: 10, color: C.muted }}>{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Notification type */}
          <div>
            <label style={labelStyle}>Notification Type</label>
            <div className="flex flex-wrap gap-2">
              {NOTIFICATION_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setNotifType(value)}
                  style={{
                    padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                    border: 'none', cursor: 'pointer',
                    background: notifType === value ? C.greenMed : 'var(--color-surface-2)',
                    color: notifType === value ? '#fff' : C.muted,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={labelStyle}>Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="E.g. Maize prices up 15% in Kampala"
              style={inputStyle}
              maxLength={120}
            />
            <p style={{ fontSize: 10, color: C.muted, marginTop: 4, textAlign: 'right' }}>{title.length}/120</p>
          </div>

          {/* Body */}
          <div>
            <label style={labelStyle}>Message</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write the full alert message here…"
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              maxLength={500}
            />
            <p style={{ fontSize: 10, color: C.muted, marginTop: 4, textAlign: 'right' }}>{body.length}/500</p>
          </div>

          {/* Send button */}
          <button
            onClick={send}
            disabled={state === 'sending' || !title.trim() || !body.trim()}
            style={{
              width: '100%', padding: '12px', borderRadius: 12, border: 'none',
              background: (state === 'sending' || !title.trim() || !body.trim()) ? 'var(--color-surface-2)' : C.greenMed,
              color: (state === 'sending' || !title.trim() || !body.trim()) ? C.muted : '#fff',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
              transition: 'background 0.15s ease',
            }}
          >
            {state === 'sending' ? 'Sending…' : 'Send Broadcast'}
          </button>

          {/* Feedback */}
          {state === 'done' && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--color-success-bg)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-success)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 5 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Sent to {sentCount} {sentCount === 1 ? 'user' : 'users'}
              </p>
            </div>
          )}
          {state === 'empty' && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--color-harvest-bg)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-harvest)' }}>
                No {TARGET_ROLES.find(r => r.value === targetRole)?.label.toLowerCase()} were found — nothing was sent. Try a different audience.
              </p>
            </div>
          )}
          {state === 'error' && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--color-danger-bg)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.red }}>{errorMsg}</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview card */}
      {(title || body) && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.shadow }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: C.muted }}>Preview</p>
          </div>
          <div className="px-5 py-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></div>
            <div>
              <p className="text-sm font-bold" style={{ color: C.text }}>{title || 'Untitled alert'}</p>
              <p className="text-xs mt-1" style={{ color: C.muted }}>{body || 'No message yet'}</p>
              <p className="text-[10px] mt-2" style={{ color: C.muted }}>
                To: {TARGET_ROLES.find(r => r.value === targetRole)?.label} · Type: {NOTIFICATION_TYPES.find(t => t.value === notifType)?.label}
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
