'use client';

import React, { useState } from 'react';
import { Mail, CheckCircle2, AlertTriangle, Send, BellRing, ShieldAlert, Sparkles, Check } from 'lucide-react';

interface Props {
  userEmail?: string | null;
  userName?: string | null;
}

export function AutomatedRiskAlertsCard({ userEmail = '', userName = 'Offtaker Partner' }: Props) {
  const [email, setEmail] = useState(userEmail || '');
  const [channels, setChannels] = useState({
    weather: true,
    pests: true,
    logistics: true,
    price: true,
  });
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function toggleChannel(key: keyof typeof channels) {
    setChannels(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function triggerTestAlert(type: 'weather' | 'pests' | 'logistics' = 'weather') {
    if (!email || !email.includes('@')) {
      setStatusMsg({ text: 'Please enter a valid email address.', ok: false });
      setTimeout(() => setStatusMsg(null), 4000);
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    const payload = type === 'weather' ? {
      email,
      recipientName: userName || 'Procurement Partner',
      alertTitle: 'Heavy Rainfall & Flash Flood Warning in Northern Uganda',
      riskType: 'Weather & Climate Disruption',
      severity: 'High',
      affectedDistricts: ['Gulu', 'Lira', 'Kitgum', 'Amuru'],
      summary: 'Meteorological telemetry indicates severe localized downpours exceeding 85mm over 48 hours. Standing water threatens low-lying sorghum and maize fields, with unpaved logistics access roads temporarily compromised.',
      recommendedActions: [
        'Inspect moisture barrier tarpaulins on all contracted farm storage depots.',
        'Prioritize collection from elevated clusters before feeder roads become impassable.',
        'Request satellite moisture reports before accepting wet grain bags.',
      ],
    } : type === 'pests' ? {
      email,
      recipientName: userName || 'Procurement Partner',
      alertTitle: 'Fall Armyworm (FAW) Early Surge Detected in Eastern Uganda',
      riskType: 'Pest & Disease Outbreak',
      severity: 'High',
      affectedDistricts: ['Tororo', 'Mbale', 'Iganga', 'Bugiri'],
      summary: 'Agronomist reports show a 24% rise in leaf whorl damage among vegetative maize crops across Eastern Uganda districts. Immediate localized spraying is advised to safeguard contracted yields.',
      recommendedActions: [
        'Issue Emamectin Benzoate application advisories to contracted cooperatives.',
        'Schedule agronomist field scouting in boundary contract clusters within 48h.',
        'Check grain quality reports from supplier agronomists.',
      ],
    } : {
      email,
      recipientName: userName || 'Procurement Partner',
      alertTitle: 'Transit Corridor Delay: Kampala — Masaka Highway Bottleneck',
      riskType: 'Logistics Risk',
      severity: 'Medium',
      affectedDistricts: ['Mpigi', 'Masaka', 'Kalungu'],
      summary: 'Heavy culvert repair work near Mpigi is causing 3 to 4 hour delivery delays for heavy grain trucks traveling to central processing facilities.',
      recommendedActions: [
        'Instruct contracted transporters to stage early morning departures.',
        'Monitor driver live GPS routes via the Cropify Transporter dashboard.',
      ],
    };

    try {
      const res = await fetch('/api/alerts/email-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({
          text: `Risk alert successfully sent to ${email}! Check your inbox.`,
          ok: true,
        });
      } else {
        setStatusMsg({ text: data.error || 'Failed to dispatch alert email', ok: false });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Connection error dispatching alert', ok: false });
    } finally {
      setLoading(false);
      setTimeout(() => setStatusMsg(null), 6000);
    }
  }

  return (
    <div
      style={{
        background: 'var(--d-card)',
        borderRadius: 20,
        boxShadow: 'var(--d-shadow-card)',
        padding: '24px 26px',
        border: '1.5px solid var(--d-border)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'var(--color-primary-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
              }}
            >
              <BellRing size={17} />
            </span>
            <h2 style={{ fontSize: 16, fontWeight: 900, color: 'var(--d-text)', margin: 0, letterSpacing: '-0.02em' }}>
              Automated Email Risk Alerts
            </h2>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--d-muted)', margin: 0, maxWidth: 520, lineHeight: 1.5 }}>
            Early warnings are automatically delivered to your inbox whenever severe weather, pest outbreaks, or logistics bottlenecks threaten your contract districts.
          </p>
        </div>

        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: 999,
            background: 'var(--color-primary-bg)',
            color: 'var(--color-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', display: 'inline-block' }} />
          LIVE DISPATCH ACTIVE
        </span>
      </div>

      {/* Notification Category Toggles */}
      <div style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--d-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
          Monitored Risk Categories
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
          {[
            { key: 'weather' as const, label: '⛈️ Weather & Floods', desc: 'Droughts, heavy rain' },
            { key: 'pests' as const, label: '🐛 Pest & Disease', desc: 'Armyworm, fungal wilt' },
            { key: 'logistics' as const, label: '🚚 Logistics Delays', desc: 'Flooded roads, bottlenecks' },
            { key: 'price' as const, label: '📉 Price Volatility', desc: 'Spot rate deviations' },
          ].map(item => {
            const active = channels[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => toggleChannel(item.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: `1.5px solid ${active ? 'var(--color-primary)' : 'var(--d-border)'}`,
                  background: active ? 'var(--color-primary-bg)' : 'var(--color-surface-2)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--d-text)', margin: 0 }}>
                    {item.label}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--d-muted)', margin: '1px 0 0' }}>
                    {item.desc}
                  </p>
                </div>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    background: active ? 'var(--color-primary)' : 'transparent',
                    border: `1.5px solid ${active ? 'var(--color-primary)' : 'var(--d-border)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  {active && <Check size={13} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recipient Email & Test Dispatcher */}
      <div
        style={{
          background: 'var(--color-surface-2)',
          borderRadius: 14,
          padding: '16px 18px',
          border: '1px solid var(--d-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <label htmlFor="risk-email-input" style={{ fontSize: 12, fontWeight: 700, color: 'var(--d-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Mail size={14} style={{ color: 'var(--color-primary)' }} />
            Recipient Alert Email
          </label>
          <span style={{ fontSize: 11, color: 'var(--d-muted)' }}>
            Instant alerts trigger immediately upon high-severity detection
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            id="risk-email-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter procurement/alert email"
            style={{
              flex: '1 1 220px',
              padding: '11px 14px',
              borderRadius: 10,
              border: '1.5px solid var(--d-border)',
              background: 'var(--d-input-bg)',
              color: 'var(--d-text)',
              fontSize: 13,
              fontWeight: 600,
              outline: 'none',
            }}
          />

          <button
            type="button"
            disabled={loading}
            onClick={() => triggerTestAlert('weather')}
            style={{
              padding: '11px 18px',
              borderRadius: 10,
              border: 'none',
              background: loading ? 'var(--color-primary-hover)' : 'var(--color-primary)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 800,
              cursor: loading ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(34,197,94,0.3)',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            {loading ? (
              'Dispatching...'
            ) : (
              <>
                <Send size={13} />
                Send Test Alert to Email
              </>
            )}
          </button>
        </div>

        {/* Quick Simulation Options */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 2 }}>
          <span style={{ fontSize: 11, color: 'var(--d-muted)', fontWeight: 600 }}>Simulate live scenarios:</span>
          <button
            type="button"
            disabled={loading}
            onClick={() => triggerTestAlert('pests')}
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid var(--d-border)',
              background: 'var(--d-card)',
              color: 'var(--d-text)',
              cursor: 'pointer',
            }}
          >
            🐛 Test Pest Outbreak Alert
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => triggerTestAlert('logistics')}
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid var(--d-border)',
              background: 'var(--d-card)',
              color: 'var(--d-text)',
              cursor: 'pointer',
            }}
          >
            🚚 Test Road Bottleneck Alert
          </button>
        </div>

        {/* Status Feedback Toast */}
        {statusMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: statusMsg.ok ? 'var(--color-primary-bg)' : 'var(--color-danger-bg)',
              color: statusMsg.ok ? 'var(--color-primary)' : 'var(--color-danger)',
              border: `1px solid ${statusMsg.ok ? 'var(--color-primary)' : 'var(--color-danger)'}`,
            }}
          >
            {statusMsg.ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            <span>{statusMsg.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}
