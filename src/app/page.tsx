'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, ArrowUpRight, Check,
  CloudRain, TrendingUp, Users, Microscope, Package, BarChart3,
  Leaf, ShoppingCart, Truck, ShieldCheck, Zap,
} from 'lucide-react';

/* ─── Dark-only landing tokens ─────────────────────────────────────────────── */
const BG     = '#020D05';
const BG2    = '#060F08';
const CARD   = '#0A1C10';
const BORDER = 'rgba(74,222,128,0.10)';
const TEXT   = '#F0FDF4';
const MUTED  = 'rgba(240,253,244,0.50)';
const GREEN  = '#4ADE80';
const GOLD   = '#FBBF24';
const BLUE   = '#38BDF8';

const FEATURES = [
  { icon: <CloudRain size={22} />,  title: 'Live Weather',   sub: 'District forecasts, planting windows, rain alerts',    color: BLUE,     bg: 'rgba(56,189,248,0.08)'  },
  { icon: <TrendingUp size={22} />, title: 'Crop Prices',    sub: 'Real market rates updated daily across 30+ districts', color: GOLD,     bg: 'rgba(251,191,36,0.08)'  },
  { icon: <Users size={22} />,      title: 'Farmer Groups',  sub: 'Pool harvests, apply for loans together',              color: GREEN,    bg: 'rgba(74,222,128,0.08)'  },
  { icon: <Microscope size={22} />, title: 'Crop Doctor',    sub: 'AI disease scan + certified pathologist review',       color: '#C084FC', bg: 'rgba(192,132,252,0.08)' },
  { icon: <Package size={22} />,    title: 'Farm Inputs',    sub: 'Order seeds, tools, fertiliser — delivered to you',   color: '#F472B6', bg: 'rgba(244,114,182,0.08)' },
  { icon: <BarChart3 size={22} />,  title: 'Farm Finance',   sub: 'Track income, expenses, loans and wallet payouts',    color: '#34D399', bg: 'rgba(52,211,153,0.08)'  },
];

const ROLES = [
  {
    icon: <Leaf size={22} />, role: 'Farmers', color: GREEN, bg: 'rgba(74,222,128,0.08)',
    tagline: 'From field to payment — all in one free app.',
    points: [
      'See live prices before you harvest',
      'Sell direct to verified buyers',
      'AI crop disease diagnosis in 30 seconds',
      'Join a group, access group loans',
    ],
  },
  {
    icon: <ShoppingCart size={22} />, role: 'Buyers', color: GOLD, bg: 'rgba(251,191,36,0.08)',
    tagline: 'Source fresh produce directly from farms.',
    points: [
      'Browse verified farmer listings',
      'Negotiate price directly with farmers',
      'Payments held in escrow until delivery',
      'Full delivery tracking, farm to gate',
    ],
  },
  {
    icon: <Truck size={22} />, role: 'Transporters', color: BLUE, bg: 'rgba(56,189,248,0.08)',
    tagline: 'More trips. Faster payment. Better reputation.',
    points: [
      'See delivery requests in your area',
      'Verified badge builds trust with clients',
      'In-app route management',
      'Instant payment on confirmed delivery',
    ],
  },
];

const STEPS = [
  { n: '01', title: 'Create your free account', sub: 'Sign up in under 2 minutes. Pick your role — farmer, buyer, transporter, or supplier.' },
  { n: '02', title: 'Complete your profile',    sub: 'Add your location, crop, and phone. Get a trust badge that unlocks every feature.' },
  { n: '03', title: 'Start farming smarter',    sub: 'Check prices, list your harvest, connect with buyers — and get paid straight to your wallet.' },
];

export default function Home() {
  const [activeRole, setActiveRole] = useState(0);

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: "'Poppins', 'Inter', system-ui, sans-serif", overflowX: 'hidden' }}>

      {/* ════════════════════ NAV ════════════════════ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(18px, 5vw, 64px)',
        height: 60,
        background: 'rgba(2,13,5,0.90)',
        backdropFilter: 'blur(18px)',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: GREEN,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Leaf size={15} color="#031A08" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.03em', color: TEXT }}>AgriNova</span>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex" style={{ gap: 28, alignItems: 'center' }}>
          {[['Features','#features'],['How it works','#how-it-works'],['For buyers','#for-buyers']].map(([l,h]) => (
            <a key={l} href={h} style={{ fontSize: 13.5, fontWeight: 600, color: MUTED, textDecoration: 'none' }}>{l}</a>
          ))}
        </div>

        {/* Auth CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/auth/signin" style={{ fontSize: 13, fontWeight: 700, color: MUTED, textDecoration: 'none', padding: '7px 12px' }}>
            Sign in
          </Link>
          <Link href="/auth/signup" style={{
            fontSize: 13, fontWeight: 800, color: '#031A08', textDecoration: 'none',
            padding: '8px 18px', borderRadius: 10,
            background: GREEN,
            boxShadow: '0 4px 18px rgba(74,222,128,0.32)',
          }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* ════════════════════ HERO ════════════════════ */}
      <section style={{
        minHeight: '91vh', display: 'flex', alignItems: 'center',
        padding: 'clamp(48px, 8vh, 80px) clamp(18px, 5vw, 64px)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Radial glow behind hero */}
        <div style={{
          position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 600, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, rgba(22,107,58,0.22) 0%, transparent 65%)',
        }} />

        <div style={{ width: '100%', maxWidth: 1180, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 'clamp(40px, 7vw, 100px)', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>

          {/* ── Left: copy ── */}
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            {/* Badge */}
            <div className="landing-fade-up" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 13px', borderRadius: 99,
              background: 'rgba(74,222,128,0.07)',
              border: '1px solid rgba(74,222,128,0.18)',
              fontSize: 11.5, fontWeight: 700, color: GREEN,
              marginBottom: 26, letterSpacing: '0.01em',
              animationDelay: '0ms',
            }}>
              <ShieldCheck size={12} strokeWidth={2.5} />
              Built for Ugandan farmers
              <ArrowUpRight size={11} />
            </div>

            <h1 className="landing-fade-up" style={{
              fontSize: 'clamp(2.7rem, 6.5vw, 4.2rem)',
              fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1.03,
              margin: '0 0 22px', animationDelay: '70ms',
            }}>
              Farm smarter.<br />
              <span style={{
                background: `linear-gradient(130deg, ${GREEN} 20%, #86EFAC 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Earn more.
              </span>
            </h1>

            <p className="landing-fade-up" style={{
              fontSize: 'clamp(14.5px, 2vw, 17px)', color: MUTED, fontWeight: 500,
              lineHeight: 1.7, margin: '0 0 36px', maxWidth: 430,
              animationDelay: '150ms',
            }}>
              Live crop prices, direct buyer connections, AI disease detection, and group loans — everything Uganda's farmers need in one free app.
            </p>

            <div className="landing-fade-up" style={{ display: 'flex', gap: 11, flexWrap: 'wrap', animationDelay: '230ms' }}>
              <Link href="/auth/signup" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', borderRadius: 14,
                background: GREEN, color: '#031A08',
                fontWeight: 800, fontSize: 15, textDecoration: 'none',
                boxShadow: '0 8px 32px rgba(74,222,128,0.36)',
              }}>
                Create free account <ArrowRight size={16} strokeWidth={2.5} />
              </Link>
              <Link href="/auth/signin" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 24px', borderRadius: 14,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${BORDER}`,
                color: TEXT, fontWeight: 700, fontSize: 15, textDecoration: 'none',
              }}>
                Sign in
              </Link>
            </div>

            {/* Metrics */}
            <div className="landing-fade-up" style={{ display: 'flex', gap: 32, marginTop: 44, animationDelay: '320ms', flexWrap: 'wrap' }}>
              {[
                { v: '10,000+', l: 'Active farmers' },
                { v: '30+',     l: 'Districts covered' },
                { v: 'Free',    l: 'Always free to join' },
              ].map(({ v, l }) => (
                <div key={l}>
                  <p style={{ fontSize: 22, fontWeight: 900, color: GREEN, margin: 0, letterSpacing: '-0.04em' }}>{v}</p>
                  <p style={{ fontSize: 11.5, color: MUTED, margin: '2px 0 0', fontWeight: 600 }}>{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: phone mockup ── */}
          <div className="landing-fade-up landing-float" style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center', animationDelay: '180ms' }}>
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* ════════════════════ FEATURES ════════════════════ */}
      <section id="features" style={{ padding: 'clamp(64px, 9vh, 100px) clamp(18px, 5vw, 64px)', background: BG2 }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <p style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN, textAlign: 'center', marginBottom: 10 }}>
            One app, everything you need
          </p>
          <h2 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.7rem)', fontWeight: 900, letterSpacing: '-0.04em', textAlign: 'center', margin: '0 0 56px', lineHeight: 1.1 }}>
            No more juggling five apps
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 14 }}>
            {FEATURES.map(({ icon, title, sub, color, bg }) => (
              <div key={title} style={{
                padding: '24px 22px', borderRadius: 18,
                background: CARD, border: `1px solid ${BORDER}`,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: bg, color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  {icon}
                </div>
                <p style={{ fontSize: 15.5, fontWeight: 800, color: TEXT, margin: '0 0 7px', letterSpacing: '-0.02em' }}>{title}</p>
                <p style={{ fontSize: 13.5, color: MUTED, margin: 0, lineHeight: 1.65 }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ HOW IT WORKS ════════════════════ */}
      <section id="how-it-works" style={{ padding: 'clamp(64px, 9vh, 100px) clamp(18px, 5vw, 64px)' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <p style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN, textAlign: 'center', marginBottom: 10 }}>
            Simple to start
          </p>
          <h2 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.7rem)', fontWeight: 900, letterSpacing: '-0.04em', textAlign: 'center', margin: '0 0 60px', lineHeight: 1.1 }}>
            Up and running in minutes
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {STEPS.map(({ n, title, sub }, i) => (
              <div key={n} style={{ display: 'flex', gap: 22, alignItems: 'flex-start' }}>
                {/* Step indicator column */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 52 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                    background: i === 0 ? GREEN : CARD,
                    border: i === 0 ? 'none' : `1.5px solid ${BORDER}`,
                    color: i === 0 ? '#031A08' : GREEN,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 900, letterSpacing: '-0.02em',
                    boxShadow: i === 0 ? '0 8px 28px rgba(74,222,128,0.28)' : 'none',
                  }}>
                    {n}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{
                      width: 1.5, flex: 1, minHeight: 40, marginTop: 6,
                      background: `linear-gradient(to bottom, rgba(74,222,128,0.25), transparent)`,
                    }} />
                  )}
                </div>

                {/* Content */}
                <div style={{ paddingBottom: i < STEPS.length - 1 ? 44 : 0, paddingTop: 12, flex: 1 }}>
                  <p style={{ fontSize: 17, fontWeight: 800, color: TEXT, margin: '0 0 7px', letterSpacing: '-0.02em' }}>{title}</p>
                  <p style={{ fontSize: 14, color: MUTED, margin: 0, lineHeight: 1.7 }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ ROLES ════════════════════ */}
      <section id="for-buyers" style={{ padding: 'clamp(64px, 9vh, 100px) clamp(18px, 5vw, 64px)', background: BG2 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.7rem)', fontWeight: 900, letterSpacing: '-0.04em', textAlign: 'center', margin: '0 0 40px', lineHeight: 1.1 }}>
            Built for every role in the chain
          </h2>

          {/* Tab strip */}
          <div style={{
            display: 'flex', gap: 4, padding: 4,
            borderRadius: 14, background: CARD,
            border: `1px solid ${BORDER}`,
            marginBottom: 24, boxSizing: 'border-box',
          }}>
            {ROLES.map((r, i) => (
              <button
                key={r.role}
                onClick={() => setActiveRole(i)}
                style={{
                  flex: 1, padding: 'clamp(10px, 2vw, 12px) 8px',
                  borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
                  background: activeRole === i ? r.color : 'transparent',
                  color: activeRole === i ? '#031A08' : MUTED,
                  fontWeight: 800, fontSize: 'clamp(12px, 2.5vw, 14px)',
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                {r.role}
              </button>
            ))}
          </div>

          {/* Active role card */}
          {(() => {
            const r = ROLES[activeRole];
            return (
              <div key={activeRole} className="landing-role-card" style={{
                padding: 'clamp(20px, 4vw, 32px)', borderRadius: 20,
                background: CARD,
                border: `1px solid rgba(74,222,128,0.12)`,
                boxShadow: `0 0 0 1px ${r.color}10, 0 20px 60px rgba(0,0,0,0.30)`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 13, background: r.bg, color: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {r.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 900, color: TEXT, letterSpacing: '-0.025em', margin: 0 }}>{r.role}</h3>
                    <p style={{ fontSize: 13, color: MUTED, margin: '2px 0 0' }}>{r.tagline}</p>
                  </div>
                </div>

                <div style={{ height: 1, background: BORDER, margin: '20px 0' }} />

                <ul style={{
                  listStyle: 'none', padding: 0, margin: 0,
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px 24px',
                }}>
                  {r.points.map(p => (
                    <li key={p} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: TEXT, fontWeight: 600, lineHeight: 1.45 }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: 99,
                        background: `${r.color}18`, color: r.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, marginTop: 1,
                      }}>
                        <Check size={11} strokeWidth={3} />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>

                <div style={{ marginTop: 28 }}>
                  <Link href="/auth/signup" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '11px 22px', borderRadius: 11,
                    background: r.color, color: '#031A08',
                    fontWeight: 800, fontSize: 14, textDecoration: 'none',
                    boxShadow: `0 6px 20px ${r.color}30`,
                  }}>
                    Get started as {r.role.split(' ')[0]} <ArrowRight size={15} strokeWidth={2.5} />
                  </Link>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ════════════════════ CTA ════════════════════ */}
      <section style={{ padding: 'clamp(80px, 11vh, 120px) clamp(18px, 5vw, 64px)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(22,107,58,0.24) 0%, transparent 70%)',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 580, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 20 }}>
            <Zap size={16} color={GREEN} strokeWidth={2.5} />
            <span style={{ fontSize: 11, fontWeight: 800, color: GREEN, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Free forever for farmers</span>
          </div>

          <h2 style={{ fontSize: 'clamp(2.1rem, 5.5vw, 3.2rem)', fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1.05, margin: '0 0 20px' }}>
            Ready to grow{' '}
            <span style={{
              background: `linear-gradient(130deg, ${GREEN} 20%, #86EFAC 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              smarter?
            </span>
          </h2>

          <p style={{ fontSize: 16, color: MUTED, margin: '0 0 38px', lineHeight: 1.65 }}>
            Thousands of Ugandan farmers are already selling better, earning more, and protecting their harvests with AgriNova.
          </p>

          <Link href="/auth/signup" style={{
            display: 'inline-flex', alignItems: 'center', gap: 9,
            padding: '16px 36px', borderRadius: 16,
            background: GREEN, color: '#031A08',
            fontWeight: 900, fontSize: 17, textDecoration: 'none',
            boxShadow: '0 12px 40px rgba(74,222,128,0.38)',
            letterSpacing: '-0.01em',
          }}>
            Create your free account <ArrowRight size={18} strokeWidth={2.5} />
          </Link>

          <p style={{ fontSize: 12, color: MUTED, marginTop: 14, fontWeight: 600 }}>
            No credit card. No catch. Ready in 2 minutes.
          </p>
        </div>
      </section>

      {/* ════════════════════ FOOTER ════════════════════ */}
      <footer style={{
        padding: '22px clamp(18px, 5vw, 64px)',
        borderTop: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Leaf size={11} color="#031A08" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 13.5, fontWeight: 900, color: TEXT, letterSpacing: '-0.025em' }}>AgriNova</span>
          <span style={{ fontSize: 12, color: MUTED, marginLeft: 2 }}>© 2026</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Privacy', 'Terms', 'Contact'].map(l => (
            <a key={l} href="#" style={{ fontSize: 13, color: MUTED, textDecoration: 'none', fontWeight: 600 }}>{l}</a>
          ))}
        </div>
      </footer>

    </div>
  );
}

/* ─── Phone mockup — shows a real dashboard preview ─────────────────────── */
function PhoneMockup() {
  return (
    <div style={{
      width: 228, height: 464,
      background: '#04100A',
      borderRadius: 40,
      border: '8px solid #0D2116',
      boxShadow: [
        '0 0 0 1px rgba(74,222,128,0.10)',
        '0 32px 90px rgba(0,0,0,0.80)',
        '0 0 80px rgba(22,107,58,0.20)',
      ].join(', '),
      overflow: 'hidden',
      position: 'relative',
      flexShrink: 0,
    }}>
      {/* Dynamic island notch */}
      <div style={{
        position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
        width: 68, height: 10, background: '#04100A',
        borderRadius: 99, zIndex: 10,
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
      }} />

      {/* Screen */}
      <div style={{ height: '100%', background: '#0F172A', display: 'flex', flexDirection: 'column' }}>

        {/* Status bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '22px 16px 6px',
          fontSize: 7.5, fontWeight: 800, color: 'rgba(240,253,244,0.40)',
          letterSpacing: '0.04em',
        }}>
          <span>9:41</span>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <svg width="12" height="9" viewBox="0 0 14 10" fill="rgba(240,253,244,0.40)">
              <rect x="0" y="4" width="2" height="6" rx="0.5"/>
              <rect x="3" y="2.5" width="2" height="7.5" rx="0.5"/>
              <rect x="6" y="1" width="2" height="9" rx="0.5"/>
              <rect x="9" y="0" width="2" height="10" rx="0.5"/>
            </svg>
            <svg width="14" height="9" viewBox="0 0 16 10" fill="none" stroke="rgba(240,253,244,0.40)" strokeWidth="1.2" strokeLinecap="round">
              <path d="M1 6.5 C4 3 12 3 15 6.5"/>
              <path d="M3.5 8.5 C5.5 6.5 10.5 6.5 12.5 8.5"/>
              <circle cx="8" cy="10" r="1" fill="rgba(240,253,244,0.40)" stroke="none"/>
            </svg>
            <span>100%</span>
          </div>
        </div>

        {/* App content */}
        <div style={{ flex: 1, padding: '6px 14px 0', overflowY: 'hidden' }}>
          {/* Greeting */}
          <p style={{ fontSize: 8, fontWeight: 800, color: '#4ADE80', margin: '0 0 2px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Good morning
          </p>
          <p style={{ fontSize: 15, fontWeight: 900, color: '#F0FDF4', margin: '0 0 14px', letterSpacing: '-0.03em' }}>
            Namutebi Grace
          </p>

          {/* 2-col stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 9 }}>
            {/* Wallet */}
            <div style={{ padding: '10px 11px', borderRadius: 12, background: '#0F4C2A', border: '1px solid rgba(74,222,128,0.14)' }}>
              <p style={{ fontSize: 7, fontWeight: 800, color: '#4ADE80', margin: '0 0 5px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Wallet</p>
              <p style={{ fontSize: 14.5, fontWeight: 900, color: '#F0FDF4', margin: 0, letterSpacing: '-0.03em' }}>480K</p>
              <p style={{ fontSize: 7, color: 'rgba(240,253,244,0.42)', margin: '2px 0 0', fontWeight: 600 }}>UGX balance</p>
            </div>
            {/* Price */}
            <div style={{ padding: '10px 11px', borderRadius: 12, background: '#241700', border: '1px solid rgba(251,191,36,0.12)' }}>
              <p style={{ fontSize: 7, fontWeight: 800, color: '#FBBF24', margin: '0 0 5px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Maize</p>
              <p style={{ fontSize: 14.5, fontWeight: 900, color: '#F0FDF4', margin: 0, letterSpacing: '-0.03em' }}>+12%</p>
              <p style={{ fontSize: 7, color: 'rgba(240,253,244,0.42)', margin: '2px 0 0', fontWeight: 600 }}>Price this week</p>
            </div>
          </div>

          {/* Live notification */}
          <div style={{
            padding: '9px 11px', borderRadius: 11, marginBottom: 9,
            background: '#0D2116', border: '1px solid rgba(74,222,128,0.14)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', flexShrink: 0, boxShadow: '0 0 6px #4ADE8099' }} />
            <p style={{ fontSize: 9, fontWeight: 600, color: '#BBF7D0', margin: 0, lineHeight: 1.3 }}>
              Buyer offer accepted · 300 kg beans
            </p>
          </div>

          {/* Weather */}
          <div style={{
            padding: '9px 11px', borderRadius: 11,
            background: '#0B1A24', border: '1px solid rgba(56,189,248,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
          }}>
            <div>
              <p style={{ fontSize: 7, fontWeight: 800, color: '#38BDF8', margin: '0 0 2px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Weather · Kampala</p>
              <p style={{ fontSize: 9, fontWeight: 600, color: '#BAE6FD', margin: 0 }}>Rain expected Thursday</p>
            </div>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/>
              <line x1="8" y1="19" x2="8" y2="21"/><line x1="8" y1="13" x2="8" y2="15"/>
              <line x1="16" y1="19" x2="16" y2="21"/><line x1="16" y1="13" x2="16" y2="15"/>
              <line x1="12" y1="21" x2="12" y2="23"/><line x1="12" y1="15" x2="12" y2="17"/>
            </svg>
          </div>

          {/* Quick action chips */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { l: 'Sell', c: '#4ADE80', bg: '#0F4C2A' },
              { l: 'Buy',  c: '#FBBF24', bg: '#241700' },
              { l: 'Doctor', c: '#C084FC', bg: '#1C0F3D' },
            ].map(({ l, c, bg }) => (
              <div key={l} style={{ flex: 1, padding: '7px 4px', borderRadius: 9, background: bg, textAlign: 'center' }}>
                <p style={{ fontSize: 8.5, fontWeight: 800, color: c, margin: 0 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom nav bar */}
        <div style={{
          padding: '8px 16px 14px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          background: '#0B1220',
          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        }}>
          {[
            { label: 'Home',   active: true  },
            { label: 'Market', active: false },
            { label: 'Wallet', active: false },
            { label: 'More',   active: false },
          ].map(({ label, active }) => (
            <div key={label} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ width: 20, height: 3, borderRadius: 99, background: active ? '#4ADE80' : 'transparent', marginBottom: 1 }} />
              <div style={{ width: 22, height: 16, borderRadius: 5, background: active ? 'rgba(74,222,128,0.14)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 11, height: 9, borderRadius: 2.5, background: active ? '#4ADE80' : 'rgba(255,255,255,0.18)' }} />
              </div>
              <p style={{ fontSize: 6.5, fontWeight: active ? 800 : 500, color: active ? '#4ADE80' : 'rgba(255,255,255,0.28)', margin: 0 }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
