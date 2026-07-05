'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CloudRain, TrendingUp, Users, Microscope, Package, BarChart3,
  Leaf, ShoppingCart, Store, Check, ChevronDown, ArrowRight,
  Wifi, Signal, BatteryFull, Bell, Wallet as WalletIcon,
} from 'lucide-react';

const FEATURES = [
  { icon: <CloudRain size={20} />,   title: 'Weather forecasts',   sub: 'District-level rain & planting alerts', color: 'var(--color-sky)',      bg: 'var(--color-sky-bg)' },
  { icon: <TrendingUp size={20} />,  title: 'Live crop prices',    sub: 'Real market rates, updated daily',      color: 'var(--color-harvest)',  bg: 'var(--color-harvest-bg)' },
  { icon: <Users size={20} />,       title: 'Marketplace',         sub: 'Sell direct to verified buyers',        color: 'var(--color-primary)',  bg: 'var(--color-primary-bg)' },
  { icon: <Microscope size={20} />,  title: 'Crop Doctor',         sub: 'AI disease scans + expert consults',    color: 'var(--color-purple)',   bg: 'var(--color-purple-bg)' },
  { icon: <Package size={20} />,     title: 'Farm inputs',         sub: 'Order seeds, tools & supplies',         color: 'var(--color-cyan)',     bg: 'var(--color-cyan-bg)' },
  { icon: <BarChart3 size={20} />,   title: 'Farm finances',       sub: 'Track spend, income & loans',           color: 'var(--color-lime)',     bg: 'var(--color-lime-bg)' },
];

const ROLES = [
  { icon: <Leaf size={26} />, role: 'Farmers', color: 'var(--color-primary)', bg: 'var(--color-primary-bg)',
    points: ['Weather & live prices', 'Sell to verified buyers', 'AI crop disease scans', 'Join a farmer group'] },
  { icon: <ShoppingCart size={26} />, role: 'Buyers', color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)',
    points: ['Browse verified listings', 'Negotiate direct offers', 'Money held safely in escrow', 'Track every delivery'] },
  { icon: <Store size={26} />, role: 'Suppliers & Transporters', color: 'var(--color-sky)', bg: 'var(--color-sky-bg)',
    points: ['Reach farmers nearby', 'Manage orders in one place', 'Verified profile badge', 'Get paid on delivery'] },
];

function fade(delayMs: number) {
  return { animationDelay: `${delayMs}ms` } as const;
}

export default function Home() {
  const [activeRole, setActiveRole] = useState(0);

  return (
    <div style={{ background: 'var(--color-soil)', color: 'var(--color-text-on-dark)', minHeight: '100vh', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>

      {/* ── Onboarding-style hero: fills the first screen like an app splash ── */}
      <section style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '0 24px 20px' }}>

        {/* Status-bar strip — the single strongest visual cue that this is a phone screen, not a website */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 2px 0', fontSize: 12, fontWeight: 700, color: 'rgba(240,253,244,0.55)' }}>
          <span>9:41</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Signal size={13} />
            <Wifi size={13} />
            <BatteryFull size={15} />
          </div>
        </div>

        {/* Top bar — mark only, no link-heavy nav (app-like, not website-like) */}
        <div className="landing-fade-up" style={{ display: 'flex', alignItems: 'center', gap: 9, paddingTop: 18, ...fade(0) }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-primary)', color: '#06210F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16 }}>A</div>
          <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.03em' }}>AgriNova</span>
        </div>

        {/* Center content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', maxWidth: 460, margin: '0 auto', width: '100%' }}>
          <div className="landing-fade-up landing-float" style={{
            width: 84, height: 84, borderRadius: 24, background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
            boxShadow: '0 16px 40px rgba(124,197,118,0.4)', ...fade(80),
          }}>
            <Leaf size={40} color="#06210F" strokeWidth={2.2} />
          </div>

          <h1 className="landing-fade-up" style={{ fontSize: 'clamp(2.2rem,9vw,3.2rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, margin: '0 0 14px', ...fade(160) }}>
            Grow smarter.<br />
            <span style={{ color: 'var(--color-primary)' }}>Sell better.</span>
          </h1>

          <p className="landing-fade-up" style={{ fontSize: 16, color: 'rgba(240,253,244,0.68)', fontWeight: 500, lineHeight: 1.5, margin: '0 0 24px', maxWidth: 340, ...fade(240) }}>
            Weather, prices, buyers, and disease detection — everything a farmer needs, in one place.
          </p>

          {/* Mini in-app preview — a stylized peek at the real dashboard, not just marketing copy */}
          <div className="landing-fade-up" style={{
            width: '100%', maxWidth: 300, borderRadius: 20, background: 'var(--color-surface)',
            padding: '14px 16px', boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
            border: '1px solid rgba(255,255,255,0.08)', ...fade(320),
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--color-text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Good morning</p>
                <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', margin: '1px 0 0' }}>Namutebi Grace</p>
              </div>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--color-primary-bg)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bell size={13} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--color-primary-bg)', textAlign: 'left' }}>
                <span style={{ display: 'flex', color: 'var(--color-primary)', marginBottom: 6 }}><WalletIcon size={14} /></span>
                <p style={{ fontSize: 13, fontWeight: 900, color: 'var(--color-text)', margin: 0, letterSpacing: '-0.02em' }}>UGX 480K</p>
                <p style={{ fontSize: 9, color: 'var(--color-text-muted)', margin: '1px 0 0', fontWeight: 700 }}>Wallet balance</p>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--color-harvest-bg)', textAlign: 'left' }}>
                <span style={{ display: 'flex', color: 'var(--color-harvest)', marginBottom: 6 }}><TrendingUp size={14} /></span>
                <p style={{ fontSize: 13, fontWeight: 900, color: 'var(--color-text)', margin: 0, letterSpacing: '-0.02em' }}>+12%</p>
                <p style={{ fontSize: 9, color: 'var(--color-text-muted)', margin: '1px 0 0', fontWeight: 700 }}>Maize this week</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 10, background: 'var(--color-surface-2)' }}>
              <span style={{ width: 18, height: 18, borderRadius: 999, background: 'var(--color-success)', flexShrink: 0 }} />
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)', margin: 0, textAlign: 'left' }}>Buyer offer accepted — 300kg beans</p>
            </div>
          </div>
        </div>

        {/* Stats strip — solid, high-contrast tiles instead of translucent glow */}
        <div className="landing-fade-up" style={{ display: 'flex', gap: 10, marginBottom: 20, ...fade(400) }}>
          {[
            { value: '10,000+', label: 'Farmers',   color: 'var(--color-primary)' },
            { value: '50+',     label: 'Markets',   color: 'var(--color-harvest)' },
            { value: '30+',     label: 'Districts', color: 'var(--color-sky)' },
          ].map(({ value, label, color }) => (
            <div key={label} style={{ flex: 1, textAlign: 'center', padding: '10px 4px', borderRadius: 12, background: 'rgba(255,255,255,0.05)' }}>
              <p style={{ fontSize: 18, fontWeight: 900, color, letterSpacing: '-0.02em', margin: 0 }}>{value}</p>
              <p style={{ fontSize: 10, color: 'rgba(240,253,244,0.5)', fontWeight: 700, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Bottom-anchored primary action — the pattern real apps use for onboarding */}
        <div className="landing-fade-up" style={{ maxWidth: 400, margin: '0 auto', width: '100%', ...fade(460) }}>
          <Link
            href="/auth/signup"
            className="press-link"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '17px', borderRadius: 16,
              background: 'var(--color-primary)', color: '#06210F',
              fontWeight: 800, fontSize: 16.5, textDecoration: 'none',
              boxShadow: '0 10px 32px rgba(124,197,118,0.35)', boxSizing: 'border-box',
            }}
          >
            Create free account <ArrowRight size={18} />
          </Link>
          <Link
            href="/auth/signin"
            style={{
              display: 'block', textAlign: 'center', width: '100%', padding: '14px',
              color: 'rgba(240,253,244,0.75)', fontWeight: 700, fontSize: 14.5, textDecoration: 'none',
            }}
          >
            Already have an account? <span style={{ color: 'var(--color-primary)' }}>Sign in</span>
          </Link>
        </div>

        <div className="landing-bounce" style={{ display: 'flex', justifyContent: 'center', paddingTop: 4, opacity: 0.4 }}>
          <ChevronDown size={20} />
        </div>
      </section>

      {/* ── Feature list — vertical rows like a mobile settings/features list ── */}
      <section style={{ padding: '48px 24px', background: 'var(--color-soil-mid)', borderRadius: '28px 28px 0 0' }}>
        <div style={{ maxWidth: 460, margin: '0 auto' }}>
          <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-primary-muted)', textAlign: 'center', marginBottom: 8 }}>
            Everything in one app
          </p>
          <h2 style={{ fontSize: 'clamp(1.6rem,6vw,2rem)', fontWeight: 900, letterSpacing: '-0.03em', textAlign: 'center', margin: '0 0 32px' }}>
            No more juggling five apps
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FEATURES.map(({ icon, title, sub, color, bg }) => (
              <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.04)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 800, fontSize: 15, margin: 0, letterSpacing: '-0.01em' }}>{title}</p>
                  <p style={{ fontSize: 12.5, color: 'rgba(240,253,244,0.55)', margin: '2px 0 0' }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Role picker — tap-to-switch cards, like an app's "who are you" onboarding step ── */}
      <section style={{ padding: '48px 24px' }}>
        <div style={{ maxWidth: 460, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.6rem,6vw,2rem)', fontWeight: 900, textAlign: 'center', letterSpacing: '-0.03em', margin: '0 0 24px' }}>
            Built for every role
          </h2>

          {/* Segmented tab switcher */}
          <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 14, background: 'rgba(255,255,255,0.05)', marginBottom: 20 }}>
            {ROLES.map((r, i) => (
              <button
                key={r.role}
                onClick={() => setActiveRole(i)}
                style={{
                  flex: 1, padding: '10px 6px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: activeRole === i ? r.color : 'transparent',
                  color: activeRole === i ? '#06210F' : 'rgba(240,253,244,0.6)',
                  fontWeight: 800, fontSize: 12.5, transition: 'background 0.2s ease, color 0.2s ease',
                }}
              >
                {r.role.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Active role card */}
          {(() => {
            const r = ROLES[activeRole];
            return (
              <div key={activeRole} className="landing-role-card" style={{ padding: 24, borderRadius: 20, background: r.bg }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <span style={{ display: 'flex', color: r.color }}>{r.icon}</span>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0F1720', letterSpacing: '-0.02em', margin: 0 }}>{r.role}</h3>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {r.points.map(p => (
                    <li key={p} style={{ display: 'flex', gap: 9, alignItems: 'center', fontSize: 14, color: '#1F2937', fontWeight: 600 }}>
                      <span style={{ width: 20, height: 20, borderRadius: 999, background: r.color, color: '#06210F', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Check size={12} strokeWidth={3} />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ padding: '56px 24px 40px', textAlign: 'center', background: 'var(--color-soil-mid)' }}>
        <h2 style={{ fontSize: 'clamp(1.8rem,7vw,2.4rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 24px' }}>
          Ready to grow <span style={{ color: 'var(--color-primary)' }}>smarter?</span>
        </h2>
        <Link href="/auth/signup" className="press-link" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '15px 34px', borderRadius: 14,
          background: 'var(--color-primary)', color: '#06210F', fontWeight: 900, fontSize: 16,
          textDecoration: 'none', boxShadow: '0 8px 28px rgba(124,197,118,0.35)', letterSpacing: '-0.01em',
        }}>
          Get started free <ArrowRight size={17} />
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ padding: '20px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, background: 'var(--color-primary)', color: '#06210F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900 }}>A</div>
          <span style={{ color: 'rgba(240,253,244,0.4)', fontSize: 12 }}>© 2026 AgriNova</span>
        </div>
      </footer>

    </div>
  );
}
