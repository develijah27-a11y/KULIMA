'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, ArrowUpRight, Check,
  CloudRain, TrendingUp, Users, Microscope, Package, BarChart3,
  Leaf, ShoppingCart, Truck, ShieldCheck, Zap, Lock, Scale, Smartphone,
} from 'lucide-react';

/* ─── Dark-only landing tokens — warm, soil-and-harvest palette, tied to the
   app's real primary green (#166B3A) rather than an arbitrary neon accent ─── */
const BG     = '#0B0F09';
const BG2    = '#10150D';
const CARD   = '#161C12';
const BORDER = 'rgba(196,169,90,0.14)';
const TEXT   = '#F5F1E6';
const MUTED  = 'rgba(245,241,230,0.56)';
const GREEN       = '#2F8F5B';
const GREEN_LIGHT = '#7ED9A3';
const GOLD   = '#D9A441';
const CLAY   = '#C1653B';
const SKY    = '#4FA8D8';
const FONT   = 'var(--font-poppins), var(--font-inter), system-ui, sans-serif';

const FEATURES = [
  { icon: <CloudRain size={22} />,  title: 'Live Weather',   sub: 'District forecasts, planting windows, rain alerts',    color: SKY,       bg: 'rgba(79,168,216,0.10)'  },
  { icon: <TrendingUp size={22} />, title: 'Crop Prices',    sub: 'Real market rates for maize, beans, coffee and more, updated daily', color: GOLD, bg: 'rgba(217,164,65,0.10)'  },
  { icon: <Users size={22} />,      title: 'Farmer Groups',  sub: 'Pool harvests, sell as one lot, apply for group loans', color: GREEN,     bg: 'rgba(47,143,91,0.12)'  },
  { icon: <Microscope size={22} />, title: 'Crop Doctor',    sub: 'Photograph a sick plant, get an instant AI read plus a licensed pathologist on call', color: '#C084FC', bg: 'rgba(192,132,252,0.09)' },
  { icon: <Package size={22} />,    title: 'Farm Inputs',    sub: 'Order seed, fertiliser and tools from verified suppliers, delivered to your gate',   color: CLAY,      bg: 'rgba(193,101,59,0.10)' },
  { icon: <BarChart3 size={22} />,  title: 'Farm Finance',   sub: 'Track income and expenses, apply for a loan, cash out to mobile money anytime',    color: GREEN_LIGHT, bg: 'rgba(126,217,163,0.09)'  },
];

const TRUST = [
  {
    icon: <Lock size={20} />, color: GREEN_LIGHT, bg: 'rgba(47,143,91,0.12)',
    title: 'Money held in escrow',
    sub: "A buyer's payment sits safely with AgriNova, not the seller, until you confirm the goods arrived. No delivery, no release.",
  },
  {
    icon: <ShieldCheck size={20} />, color: GOLD, bg: 'rgba(217,164,65,0.10)',
    title: 'Verified identities',
    sub: 'Farmers, buyers and transporters can verify with a national ID and get a trust badge — you can see who you’re really dealing with.',
  },
  {
    icon: <Scale size={20} />, color: SKY, bg: 'rgba(79,168,216,0.10)',
    title: 'Disputes reviewed by a person',
    sub: "If something's wrong, raise it within 48 hours of delivery — a real AgriNova admin reviews the case before any money moves.",
  },
];

const ROLES = [
  {
    icon: <Leaf size={22} />, role: 'Farmers', color: GREEN_LIGHT, bg: 'rgba(47,143,91,0.12)',
    tagline: 'From field to payment — all in one free app.',
    points: [
      'See live prices before you harvest',
      'Sell direct to verified buyers',
      'AI crop disease diagnosis in 30 seconds',
      'Join a group, access group loans',
    ],
  },
  {
    icon: <ShoppingCart size={22} />, role: 'Buyers', color: GOLD, bg: 'rgba(217,164,65,0.10)',
    tagline: 'Source fresh produce directly from farms.',
    points: [
      'Browse verified farmer listings',
      'Negotiate price directly with farmers',
      'Payments held in escrow until delivery',
      'Full delivery tracking, farm to gate',
    ],
  },
  {
    icon: <Truck size={22} />, role: 'Transporters', color: SKY, bg: 'rgba(79,168,216,0.10)',
    tagline: 'More trips. Faster payment. Better reputation.',
    points: [
      'See delivery requests in your area',
      'Verified badge builds trust with clients',
      'Live map, turn-by-turn to pickup and drop-off',
      'Instant payment on confirmed delivery',
    ],
  },
];

const STEPS = [
  { n: '01', title: 'Create your free account', sub: 'Sign up in under 2 minutes. Pick your role — farmer, buyer, transporter, or supplier.' },
  { n: '02', title: 'Complete your profile',    sub: 'Add your location, crop, and phone. Verify to unlock a trust badge and higher order limits.' },
  { n: '03', title: 'Start farming smarter',    sub: 'Check prices, list your harvest, connect with buyers — get paid straight to your wallet, cash out with MTN or Airtel Mobile Money.' },
];

export default function Home() {
  const [activeRole, setActiveRole] = useState(0);

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: FONT, overflowX: 'hidden' }}>

      {/* ════════════════════ NAV ════════════════════ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(18px, 5vw, 64px)',
        height: 60,
        background: 'rgba(11,15,9,0.90)',
        backdropFilter: 'blur(18px)',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Leaf size={15} color="#031A08" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.03em', color: TEXT }}>AgriNova</span>
        </div>

        <div className="hidden md:flex" style={{ gap: 28, alignItems: 'center' }}>
          {[['Features','#features'],['How it works','#how-it-works'],['Trust & safety','#trust'],['For buyers','#for-buyers']].map(([l,h]) => (
            <a key={l} href={h} style={{ fontSize: 13.5, fontWeight: 600, color: MUTED, textDecoration: 'none' }}>{l}</a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/auth/signin" style={{ fontSize: 13, fontWeight: 700, color: MUTED, textDecoration: 'none', padding: '7px 12px' }}>
            Sign in
          </Link>
          <Link href="/auth/signup" style={{
            fontSize: 13, fontWeight: 800, color: '#052012', textDecoration: 'none',
            padding: '8px 18px', borderRadius: 10,
            background: GREEN_LIGHT,
            boxShadow: '0 4px 18px rgba(126,217,163,0.28)',
          }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* ════════════════════ HERO ════════════════════ */}
      <section style={{
        minHeight: '88vh', display: 'flex', alignItems: 'center',
        padding: 'clamp(48px, 8vh, 80px) clamp(18px, 5vw, 64px)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Contour-line texture — evokes district/farmland maps rather than a
            generic tech-product glow blob */}
        <svg
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5, pointerEvents: 'none' }}
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <pattern id="contours" width="220" height="220" patternUnits="userSpaceOnUse">
              <circle cx="110" cy="110" r="30" fill="none" stroke={GREEN} strokeOpacity="0.10" strokeWidth="1" />
              <circle cx="110" cy="110" r="60" fill="none" stroke={GREEN} strokeOpacity="0.08" strokeWidth="1" />
              <circle cx="110" cy="110" r="90" fill="none" stroke={GREEN} strokeOpacity="0.06" strokeWidth="1" />
            </pattern>
            <radialGradient id="heroFade" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor={BG} stopOpacity="0" />
              <stop offset="75%" stopColor={BG} stopOpacity="0.6" />
              <stop offset="100%" stopColor={BG} stopOpacity="1" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#contours)" />
          <rect width="100%" height="100%" fill="url(#heroFade)" />
        </svg>

        <div style={{ width: '100%', maxWidth: 1180, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 'clamp(40px, 7vw, 100px)', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>

          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <div className="landing-fade-up" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 13px', borderRadius: 99,
              background: 'rgba(217,164,65,0.08)',
              border: '1px solid rgba(217,164,65,0.24)',
              fontSize: 11.5, fontWeight: 700, color: GOLD,
              marginBottom: 26, letterSpacing: '0.01em',
              animationDelay: '0ms',
            }}>
              <ShieldCheck size={12} strokeWidth={2.5} />
              Built for Ugandan farmers — escrow-protected payments
              <ArrowUpRight size={11} />
            </div>

            <h1 className="landing-fade-up" style={{
              fontSize: 'clamp(2.7rem, 6.5vw, 4.2rem)',
              fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1.03,
              margin: '0 0 22px', animationDelay: '70ms',
            }}>
              Farm smarter.<br />
              <span style={{
                background: `linear-gradient(120deg, ${GREEN_LIGHT} 15%, ${GOLD} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Earn more.
              </span>
            </h1>

            <p className="landing-fade-up" style={{
              fontSize: 'clamp(14.5px, 2vw, 17px)', color: MUTED, fontWeight: 500,
              lineHeight: 1.7, margin: '0 0 36px', maxWidth: 460,
              animationDelay: '150ms',
            }}>
              Live maize, bean and coffee prices, direct buyer connections, AI crop disease detection,
              and group loans — everything Uganda&rsquo;s farmers need, paid out straight to MTN or
              Airtel Mobile Money.
            </p>

            <div className="landing-fade-up" style={{ display: 'flex', gap: 11, flexWrap: 'wrap', animationDelay: '230ms' }}>
              <Link href="/auth/signup" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', borderRadius: 14,
                background: GREEN_LIGHT, color: '#052012',
                fontWeight: 800, fontSize: 15, textDecoration: 'none',
                boxShadow: '0 8px 32px rgba(126,217,163,0.30)',
              }}>
                Create free account <ArrowRight size={16} strokeWidth={2.5} />
              </Link>
              <Link href="/auth/signin" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 24px', borderRadius: 14,
                background: 'rgba(245,241,230,0.04)',
                border: `1px solid ${BORDER}`,
                color: TEXT, fontWeight: 700, fontSize: 15, textDecoration: 'none',
              }}>
                Sign in
              </Link>
            </div>

            <div className="landing-fade-up" style={{ display: 'flex', gap: 32, marginTop: 44, animationDelay: '320ms', flexWrap: 'wrap' }}>
              {[
                { v: '30+',     l: 'Districts covered' },
                { v: '7',       l: 'Roles on one platform' },
                { v: 'Free',    l: 'Always free to join' },
              ].map(({ v, l }) => (
                <div key={l}>
                  <p style={{ fontSize: 22, fontWeight: 900, color: GREEN_LIGHT, margin: 0, letterSpacing: '-0.04em' }}>{v}</p>
                  <p style={{ fontSize: 11.5, color: MUTED, margin: '2px 0 0', fontWeight: 600 }}>{l}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-fade-up landing-float" style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center', animationDelay: '180ms' }}>
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* ════════════════════ FEATURES ════════════════════ */}
      <section id="features" style={{ padding: 'clamp(64px, 9vh, 100px) clamp(18px, 5vw, 64px)', background: BG2 }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <p style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, textAlign: 'center', marginBottom: 10 }}>
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
          <p style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, textAlign: 'center', marginBottom: 10 }}>
            Simple to start
          </p>
          <h2 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.7rem)', fontWeight: 900, letterSpacing: '-0.04em', textAlign: 'center', margin: '0 0 60px', lineHeight: 1.1 }}>
            Up and running in minutes
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {STEPS.map(({ n, title, sub }, i) => (
              <div key={n} style={{ display: 'flex', gap: 22, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 52 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                    background: i === 0 ? GREEN_LIGHT : CARD,
                    border: i === 0 ? 'none' : `1.5px solid ${BORDER}`,
                    color: i === 0 ? '#052012' : GREEN_LIGHT,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 900, letterSpacing: '-0.02em',
                    boxShadow: i === 0 ? '0 8px 28px rgba(126,217,163,0.26)' : 'none',
                  }}>
                    {n}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{
                      width: 1.5, flex: 1, minHeight: 40, marginTop: 6,
                      background: `linear-gradient(to bottom, rgba(126,217,163,0.24), transparent)`,
                    }} />
                  )}
                </div>

                <div style={{ paddingBottom: i < STEPS.length - 1 ? 44 : 0, paddingTop: 12, flex: 1 }}>
                  <p style={{ fontSize: 17, fontWeight: 800, color: TEXT, margin: '0 0 7px', letterSpacing: '-0.02em' }}>{title}</p>
                  <p style={{ fontSize: 14, color: MUTED, margin: 0, lineHeight: 1.7 }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ TRUST & SAFETY ════════════════════ */}
      <section id="trust" style={{ padding: 'clamp(64px, 9vh, 100px) clamp(18px, 5vw, 64px)', background: BG2, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 700, height: 400, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, rgba(217,164,65,0.08) 0%, transparent 70%)',
        }} />
        <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, textAlign: 'center', marginBottom: 10 }}>
            No middleman you can&rsquo;t see
          </p>
          <h2 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.7rem)', fontWeight: 900, letterSpacing: '-0.04em', textAlign: 'center', margin: '0 0 16px', lineHeight: 1.1 }}>
            Real money protection, not a promise
          </h2>
          <p style={{ fontSize: 15, color: MUTED, textAlign: 'center', maxWidth: 560, margin: '0 auto 52px', lineHeight: 1.7 }}>
            Every naira, shilling and cent that moves through AgriNova follows the same three rules —
            whether you&rsquo;re a farmer waiting to get paid or a buyer sending money for the first time.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {TRUST.map(({ icon, color, bg, title, sub }) => (
              <div key={title} style={{ padding: '26px 24px', borderRadius: 18, background: CARD, border: `1px solid ${BORDER}` }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  {icon}
                </div>
                <p style={{ fontSize: 15.5, fontWeight: 800, color: TEXT, margin: '0 0 8px', letterSpacing: '-0.015em' }}>{title}</p>
                <p style={{ fontSize: 13.5, color: MUTED, margin: 0, lineHeight: 1.65 }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ ROLES ════════════════════ */}
      <section id="for-buyers" style={{ padding: 'clamp(64px, 9vh, 100px) clamp(18px, 5vw, 64px)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.7rem)', fontWeight: 900, letterSpacing: '-0.04em', textAlign: 'center', margin: '0 0 40px', lineHeight: 1.1 }}>
            Built for every role in the chain
          </h2>

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
                  fontFamily: FONT,
                  background: activeRole === i ? r.color : 'transparent',
                  color: activeRole === i ? '#052012' : MUTED,
                  fontWeight: 800, fontSize: 'clamp(12px, 2.5vw, 14px)',
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                {r.role}
              </button>
            ))}
          </div>

          {(() => {
            const r = ROLES[activeRole];
            return (
              <div key={activeRole} className="landing-role-card" style={{
                padding: 'clamp(20px, 4vw, 32px)', borderRadius: 20,
                background: CARD,
                border: `1px solid ${BORDER}`,
                boxShadow: `0 0 0 1px ${r.color}12, 0 20px 60px rgba(0,0,0,0.35)`,
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
                        background: `${r.color}20`, color: r.color,
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
                    background: r.color, color: '#052012',
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
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(47,143,91,0.20) 0%, transparent 70%)',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 580, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 20 }}>
            <Smartphone size={16} color={GOLD} strokeWidth={2.5} />
            <span style={{ fontSize: 11, fontWeight: 800, color: GOLD, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Free forever for farmers</span>
          </div>

          <h2 style={{ fontSize: 'clamp(2.1rem, 5.5vw, 3.2rem)', fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1.05, margin: '0 0 20px' }}>
            Ready to grow{' '}
            <span style={{
              background: `linear-gradient(120deg, ${GREEN_LIGHT} 15%, ${GOLD} 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              smarter?
            </span>
          </h2>

          <p style={{ fontSize: 16, color: MUTED, margin: '0 0 38px', lineHeight: 1.65 }}>
            Join Ugandan farmers, buyers and transporters already selling better, earning more, and
            getting paid safely with AgriNova.
          </p>

          <Link href="/auth/signup" style={{
            display: 'inline-flex', alignItems: 'center', gap: 9,
            padding: '16px 36px', borderRadius: 16,
            background: GREEN_LIGHT, color: '#052012',
            fontWeight: 900, fontSize: 17, textDecoration: 'none',
            boxShadow: '0 12px 40px rgba(126,217,163,0.32)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Leaf size={11} color="#031A08" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 13.5, fontWeight: 900, color: TEXT, letterSpacing: '-0.025em' }}>AgriNova</span>
          <span style={{ fontSize: 12, color: MUTED, marginLeft: 2 }}>© 2026 AgriNova. All rights reserved.</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {[['Privacy', '/privacy'], ['Terms', '/terms'], ['Contact', '/contact']].map(([l, href]) => (
            <Link key={l} href={href} style={{ fontSize: 13, color: MUTED, textDecoration: 'none', fontWeight: 600 }}>{l}</Link>
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
      background: '#0A140C',
      borderRadius: 40,
      border: '8px solid #131C10',
      boxShadow: [
        '0 0 0 1px rgba(217,164,65,0.10)',
        '0 32px 90px rgba(0,0,0,0.80)',
        '0 0 80px rgba(47,143,91,0.18)',
      ].join(', '),
      overflow: 'hidden',
      position: 'relative',
      flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
        width: 68, height: 10, background: '#0A140C',
        borderRadius: 99, zIndex: 10,
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
      }} />

      <div style={{ height: '100%', background: '#101A0D', display: 'flex', flexDirection: 'column' }}>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '22px 16px 6px',
          fontSize: 7.5, fontWeight: 800, color: 'rgba(245,241,230,0.40)',
          letterSpacing: '0.04em',
        }}>
          <span>9:41</span>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <svg width="12" height="9" viewBox="0 0 14 10" fill="rgba(245,241,230,0.40)">
              <rect x="0" y="4" width="2" height="6" rx="0.5"/>
              <rect x="3" y="2.5" width="2" height="7.5" rx="0.5"/>
              <rect x="6" y="1" width="2" height="9" rx="0.5"/>
              <rect x="9" y="0" width="2" height="10" rx="0.5"/>
            </svg>
            <svg width="14" height="9" viewBox="0 0 16 10" fill="none" stroke="rgba(245,241,230,0.40)" strokeWidth="1.2" strokeLinecap="round">
              <path d="M1 6.5 C4 3 12 3 15 6.5"/>
              <path d="M3.5 8.5 C5.5 6.5 10.5 6.5 12.5 8.5"/>
              <circle cx="8" cy="10" r="1" fill="rgba(245,241,230,0.40)" stroke="none"/>
            </svg>
            <span>100%</span>
          </div>
        </div>

        <div style={{ flex: 1, padding: '6px 14px 0', overflowY: 'hidden' }}>
          <p style={{ fontSize: 8, fontWeight: 800, color: '#7ED9A3', margin: '0 0 2px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Good morning
          </p>
          <p style={{ fontSize: 15, fontWeight: 900, color: '#F5F1E6', margin: '0 0 14px', letterSpacing: '-0.03em' }}>
            Namutebi Grace
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 9 }}>
            <div style={{ padding: '10px 11px', borderRadius: 12, background: '#123322', border: '1px solid rgba(126,217,163,0.16)' }}>
              <p style={{ fontSize: 7, fontWeight: 800, color: '#7ED9A3', margin: '0 0 5px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Wallet</p>
              <p style={{ fontSize: 14.5, fontWeight: 900, color: '#F5F1E6', margin: 0, letterSpacing: '-0.03em' }}>480K</p>
              <p style={{ fontSize: 7, color: 'rgba(245,241,230,0.42)', margin: '2px 0 0', fontWeight: 600 }}>UGX balance</p>
            </div>
            <div style={{ padding: '10px 11px', borderRadius: 12, background: '#2B2007', border: '1px solid rgba(217,164,65,0.16)' }}>
              <p style={{ fontSize: 7, fontWeight: 800, color: '#D9A441', margin: '0 0 5px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Maize</p>
              <p style={{ fontSize: 14.5, fontWeight: 900, color: '#F5F1E6', margin: 0, letterSpacing: '-0.03em' }}>+12%</p>
              <p style={{ fontSize: 7, color: 'rgba(245,241,230,0.42)', margin: '2px 0 0', fontWeight: 600 }}>Price this week</p>
            </div>
          </div>

          <div style={{
            padding: '9px 11px', borderRadius: 11, marginBottom: 9,
            background: '#141F10', border: '1px solid rgba(126,217,163,0.16)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#7ED9A3', flexShrink: 0, boxShadow: '0 0 6px #7ED9A399' }} />
            <p style={{ fontSize: 9, fontWeight: 600, color: '#D3EFDB', margin: 0, lineHeight: 1.3 }}>
              Buyer offer accepted · 300 kg beans
            </p>
          </div>

          <div style={{
            padding: '9px 11px', borderRadius: 11,
            background: '#0E1E28', border: '1px solid rgba(79,168,216,0.16)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
          }}>
            <div>
              <p style={{ fontSize: 7, fontWeight: 800, color: '#4FA8D8', margin: '0 0 2px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Weather · Kampala</p>
              <p style={{ fontSize: 9, fontWeight: 600, color: '#B9DEF0', margin: 0 }}>Rain expected Thursday</p>
            </div>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4FA8D8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/>
              <line x1="8" y1="19" x2="8" y2="21"/><line x1="8" y1="13" x2="8" y2="15"/>
              <line x1="16" y1="19" x2="16" y2="21"/><line x1="16" y1="13" x2="16" y2="15"/>
              <line x1="12" y1="21" x2="12" y2="23"/><line x1="12" y1="15" x2="12" y2="17"/>
            </svg>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { l: 'Sell', c: '#7ED9A3', bg: '#123322' },
              { l: 'Buy',  c: '#D9A441', bg: '#2B2007' },
              { l: 'Doctor', c: '#C084FC', bg: '#231A3D' },
            ].map(({ l, c, bg }) => (
              <div key={l} style={{ flex: 1, padding: '7px 4px', borderRadius: 9, background: bg, textAlign: 'center' }}>
                <p style={{ fontSize: 8.5, fontWeight: 800, color: c, margin: 0 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          padding: '8px 16px 14px',
          borderTop: '1px solid rgba(245,241,230,0.05)',
          background: '#0D1611',
          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        }}>
          {[
            { label: 'Home',   active: true  },
            { label: 'Market', active: false },
            { label: 'Wallet', active: false },
            { label: 'More',   active: false },
          ].map(({ label, active }) => (
            <div key={label} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ width: 20, height: 3, borderRadius: 99, background: active ? '#7ED9A3' : 'transparent', marginBottom: 1 }} />
              <div style={{ width: 22, height: 16, borderRadius: 5, background: active ? 'rgba(126,217,163,0.16)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 11, height: 9, borderRadius: 2.5, background: active ? '#7ED9A3' : 'rgba(245,241,230,0.20)' }} />
              </div>
              <p style={{ fontSize: 6.5, fontWeight: active ? 800 : 500, color: active ? '#7ED9A3' : 'rgba(245,241,230,0.30)', margin: 0 }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
