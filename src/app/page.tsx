'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Check, Sparkles,
  CloudRain, TrendingUp, Users, Microscope, Package, BarChart3,
  Leaf, ShoppingCart, Truck, ShieldCheck, Lock, Scale, Smartphone, Wallet,
} from 'lucide-react';

/* ─── Modern fintech tokens — light, warm-paper base with a bold brand
   green and a harvest-gold accent. Alternates light/dark-green sections
   for rhythm, the way Stripe/Wise/Wave-style fintech sites do. ─── */
const PAPER    = '#FAF9F4';
const PAPER_2  = '#F2F0E6';
const INK      = '#0F1F15';
const INK_MUTE = '#5A6B5C';
const LINE     = '#E4E1D3';
const CARD     = '#FFFFFF';

const GREEN       = '#157A3D';
const GREEN_DEEP  = '#0B4526';
const GREEN_SOFT  = '#E7F3EB';
const FOREST      = '#0D2B18'; // dark section background
const FOREST_2    = '#123420';
const MINT         = '#5FE0A0'; // bright accent for dark sections
const GOLD        = '#E7A73D';
const GOLD_SOFT   = '#FBF0DC';
const SKY         = '#2F8FCE';
const SKY_SOFT    = '#E6F3FB';
const PLUM        = '#8B5FBF';
const PLUM_SOFT   = '#F1EAFA';
const CLAY        = '#C1653B';
const CLAY_SOFT   = '#F6E9E2';

const FONT = 'var(--font-poppins), var(--font-inter), system-ui, sans-serif';

const FEATURES = [
  { icon: <Wallet size={22} />,     title: 'Escrow-protected pay', sub: 'Buyer money is held safely until you confirm delivery — never released blind.', color: GREEN, bg: GREEN_SOFT, big: true },
  { icon: <TrendingUp size={22} />, title: 'Live crop prices',     sub: 'Maize, beans, coffee and more — real district rates, daily.', color: GOLD, bg: GOLD_SOFT },
  { icon: <CloudRain size={22} />,  title: 'Weather forecasts',    sub: 'Rain alerts and planting windows for your district.', color: SKY, bg: SKY_SOFT },
  { icon: <Microscope size={22} />, title: 'AI Crop Doctor',       sub: 'Photo-diagnose disease in 30 seconds, escalate to a pathologist.', color: PLUM, bg: PLUM_SOFT },
  { icon: <Users size={22} />,      title: 'Farmer groups',        sub: 'Pool harvests, sell as one lot, apply for group loans.', color: GREEN, bg: GREEN_SOFT },
  { icon: <Package size={22} />,    title: 'Input marketplace',    sub: 'Seed, fertiliser and tools delivered to your gate.', color: CLAY, bg: CLAY_SOFT },
];

const TRUST = [
  { icon: <Lock size={20} />, title: 'Money held in escrow', sub: "A buyer's payment sits with AgriNova, not the seller, until you confirm the goods arrived. No delivery, no release." },
  { icon: <ShieldCheck size={20} />, title: 'Verified identities', sub: 'Farmers, buyers and transporters verify with a national ID and earn a trust badge you can actually see.' },
  { icon: <Scale size={20} />, title: 'Disputes reviewed by a person', sub: "Something wrong? Raise it within 48 hours — a real admin reviews the case before any money moves." },
];

const ROLES = [
  {
    icon: <Leaf size={22} />, role: 'Farmers', color: GREEN, bg: GREEN_SOFT,
    tagline: 'From field to payment — all in one free app.',
    points: ['See live prices before you harvest', 'Sell direct to verified buyers', 'AI crop disease diagnosis in 30 seconds', 'Join a group, access group loans'],
  },
  {
    icon: <ShoppingCart size={22} />, role: 'Buyers', color: GOLD, bg: GOLD_SOFT,
    tagline: 'Source fresh produce directly from farms.',
    points: ['Browse verified farmer listings', 'Negotiate price directly with farmers', 'Payments held in escrow until delivery', 'Full delivery tracking, farm to gate'],
  },
  {
    icon: <Truck size={22} />, role: 'Transporters', color: SKY, bg: SKY_SOFT,
    tagline: 'More trips. Faster payment. Better reputation.',
    points: ['See delivery requests in your area', 'Verified badge builds trust with clients', 'Live map, turn-by-turn to pickup and drop-off', 'Instant payment on confirmed delivery'],
  },
];

const STEPS = [
  { n: '01', title: 'Create your free account', sub: 'Sign up in under 2 minutes. Pick your role — farmer, buyer, transporter, or supplier.' },
  { n: '02', title: 'Complete your profile',    sub: 'Add your location, crop, and phone. Verify to unlock a trust badge and higher order limits.' },
  { n: '03', title: 'Start farming smarter',    sub: 'Check prices, list your harvest, connect with buyers — cash out to MTN or Airtel Mobile Money.' },
];

export default function Home() {
  const [activeRole, setActiveRole] = useState(0);

  return (
    <div style={{ background: PAPER, color: INK, fontFamily: FONT, overflowX: 'hidden' }}>

      {/* ════════════════════ NAV ════════════════════ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(18px, 5vw, 64px)', height: 64,
        background: 'rgba(250,249,244,0.85)', backdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${LINE}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Leaf size={16} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.03em', color: INK }}>AgriNova</span>
        </div>

        <div className="hidden md:flex" style={{ gap: 30, alignItems: 'center' }}>
          {[['Features','#features'],['How it works','#how-it-works'],['Trust & safety','#trust'],['For buyers','#for-buyers']].map(([l,h]) => (
            <a key={l} href={h} style={{ fontSize: 13.5, fontWeight: 600, color: INK_MUTE, textDecoration: 'none' }}>{l}</a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/auth/signin" style={{ fontSize: 13.5, fontWeight: 700, color: INK, textDecoration: 'none', padding: '9px 14px' }}>
            Sign in
          </Link>
          <Link href="/auth/signup" style={{
            fontSize: 13.5, fontWeight: 800, color: '#fff', textDecoration: 'none',
            padding: '10px 20px', borderRadius: 11, background: GREEN,
            boxShadow: '0 6px 16px rgba(21,122,61,0.28)',
          }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* ════════════════════ HERO ════════════════════ */}
      <section style={{ padding: 'clamp(56px, 9vh, 100px) clamp(18px, 5vw, 64px) clamp(40px, 6vh, 64px)', position: 'relative', overflow: 'hidden' }}>
        {/* Soft gradient mesh blobs — premium fintech look, not a flat glow */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: -120, right: '8%', width: 480, height: 480, borderRadius: '50%',
          background: `radial-gradient(circle, ${GREEN_SOFT} 0%, transparent 70%)`, pointerEvents: 'none', opacity: 0.9,
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', top: 80, left: '2%', width: 360, height: 360, borderRadius: '50%',
          background: `radial-gradient(circle, ${GOLD_SOFT} 0%, transparent 70%)`, pointerEvents: 'none', opacity: 0.8,
        }} />

        <div style={{ width: '100%', maxWidth: 1180, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(40px, 6vw, 80px)', flexWrap: 'wrap' }}>

            <div style={{ flex: '1 1 380px', minWidth: 0 }}>
              <div className="landing-fade-up" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 99,
                background: '#fff', border: `1px solid ${LINE}`,
                fontSize: 12, fontWeight: 700, color: GREEN_DEEP,
                marginBottom: 24, boxShadow: '0 2px 8px rgba(15,31,21,0.05)',
                animationDelay: '0ms',
              }}>
                <Sparkles size={13} color={GOLD} /> Escrow-protected payments for Ugandan agriculture
              </div>

              <h1 className="landing-fade-up" style={{
                fontSize: 'clamp(2.6rem, 6vw, 4rem)', fontWeight: 900, letterSpacing: '-0.045em',
                lineHeight: 1.04, margin: '0 0 22px', color: INK, animationDelay: '70ms',
              }}>
                Farm smarter.<br />
                <span style={{ color: GREEN }}>Get paid, </span>
                <span style={{ color: GOLD }}>guaranteed.</span>
              </h1>

              <p className="landing-fade-up" style={{
                fontSize: 'clamp(15px, 1.8vw, 17.5px)', color: INK_MUTE, fontWeight: 500,
                lineHeight: 1.7, margin: '0 0 34px', maxWidth: 470, animationDelay: '150ms',
              }}>
                Live maize, bean and coffee prices, direct buyer connections, and AI crop disease
                detection — with every payment held safely in escrow until delivery is confirmed.
                Cash out straight to MTN or Airtel Mobile Money.
              </p>

              <div className="landing-fade-up" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40, animationDelay: '230ms' }}>
                <Link href="/auth/signup" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '15px 28px', borderRadius: 14, background: GREEN, color: '#fff',
                  fontWeight: 800, fontSize: 15.5, textDecoration: 'none',
                  boxShadow: '0 12px 28px rgba(21,122,61,0.32)',
                }}>
                  Create free account <ArrowRight size={17} strokeWidth={2.5} />
                </Link>
                <Link href="/auth/signin" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '15px 26px', borderRadius: 14, background: '#fff',
                  border: `1.5px solid ${LINE}`, color: INK, fontWeight: 700, fontSize: 15.5, textDecoration: 'none',
                }}>
                  Sign in
                </Link>
              </div>

              <div className="landing-fade-up" style={{ display: 'flex', gap: 30, flexWrap: 'wrap', animationDelay: '300ms' }}>
                {[['30+','Districts covered'],['7','Roles, one platform'],['Free','Always, for farmers']].map(([v,l]) => (
                  <div key={l}>
                    <p style={{ fontSize: 23, fontWeight: 900, color: INK, margin: 0, letterSpacing: '-0.03em' }}>{v}</p>
                    <p style={{ fontSize: 11.5, color: INK_MUTE, margin: '2px 0 0', fontWeight: 600 }}>{l}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="landing-fade-up landing-float" style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center', animationDelay: '180ms' }}>
              <PhoneMockup />
            </div>
          </div>

          {/* Payment rails trust bar */}
          <div className="landing-fade-up" style={{
            marginTop: 'clamp(48px, 7vh, 72px)', display: 'flex', alignItems: 'center', gap: 18,
            flexWrap: 'wrap', animationDelay: '340ms',
          }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: INK_MUTE, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Payments powered by
            </span>
            {['MTN Mobile Money', 'Airtel Money', 'Flutterwave'].map(p => (
              <span key={p} style={{
                fontSize: 12.5, fontWeight: 700, color: INK, background: '#fff',
                border: `1px solid ${LINE}`, borderRadius: 8, padding: '6px 12px',
              }}>{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ FEATURES — bento grid ════════════════════ */}
      <section id="features" style={{ padding: 'clamp(64px, 9vh, 100px) clamp(18px, 5vw, 64px)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: GREEN, textAlign: 'center', marginBottom: 12 }}>
            One app, everything you need
          </p>
          <h2 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.6rem)', fontWeight: 900, letterSpacing: '-0.04em', textAlign: 'center', margin: '0 0 48px', lineHeight: 1.1, color: INK }}>
            No more juggling five apps
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 16, gridAutoFlow: 'dense' }}>
            {FEATURES.map(({ icon, title, sub, color, bg, big }) => (
              <div key={title} style={{
                padding: '26px 24px', borderRadius: 20, background: CARD, border: `1px solid ${LINE}`,
                gridColumn: big ? 'span 2' : 'span 1',
                boxShadow: '0 2px 10px rgba(15,31,21,0.04)',
                display: 'flex', flexDirection: big ? 'row' : 'column', alignItems: big ? 'center' : 'flex-start', gap: big ? 20 : 0,
              }}>
                <div style={{
                  width: 50, height: 50, borderRadius: 14, background: bg, color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: big ? 0 : 16, flexShrink: 0,
                }}>
                  {icon}
                </div>
                <div>
                  <p style={{ fontSize: big ? 18 : 15.5, fontWeight: 800, color: INK, margin: '0 0 7px', letterSpacing: '-0.02em' }}>{title}</p>
                  <p style={{ fontSize: big ? 14.5 : 13.5, color: INK_MUTE, margin: 0, lineHeight: 1.6, maxWidth: big ? 420 : undefined }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ HOW IT WORKS ════════════════════ */}
      <section id="how-it-works" style={{ padding: 'clamp(64px, 9vh, 100px) clamp(18px, 5vw, 64px)', background: PAPER_2 }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: GREEN, textAlign: 'center', marginBottom: 12 }}>
            Simple to start
          </p>
          <h2 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.6rem)', fontWeight: 900, letterSpacing: '-0.04em', textAlign: 'center', margin: '0 0 56px', lineHeight: 1.1, color: INK }}>
            Up and running in minutes
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {STEPS.map(({ n, title, sub }, i) => (
              <div key={n} style={{ display: 'flex', gap: 22, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 52 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                    background: i === 0 ? GREEN : CARD,
                    border: i === 0 ? 'none' : `1.5px solid ${LINE}`,
                    color: i === 0 ? '#fff' : GREEN,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 900, letterSpacing: '-0.02em',
                    boxShadow: i === 0 ? '0 10px 24px rgba(21,122,61,0.28)' : 'none',
                  }}>
                    {n}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: 1.5, flex: 1, minHeight: 40, marginTop: 6, background: LINE }} />
                  )}
                </div>
                <div style={{ paddingBottom: i < STEPS.length - 1 ? 44 : 0, paddingTop: 12, flex: 1 }}>
                  <p style={{ fontSize: 17, fontWeight: 800, color: INK, margin: '0 0 7px', letterSpacing: '-0.02em' }}>{title}</p>
                  <p style={{ fontSize: 14, color: INK_MUTE, margin: 0, lineHeight: 1.7 }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ TRUST & SAFETY — dark contrast section ════════════════════ */}
      <section id="trust" style={{ padding: 'clamp(64px, 9vh, 100px) clamp(18px, 5vw, 64px)', background: FOREST, position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden="true" style={{
          position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
          width: 700, height: 400, pointerEvents: 'none',
          background: `radial-gradient(ellipse at center, rgba(95,224,160,0.10) 0%, transparent 70%)`,
        }} />
        <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: GOLD, textAlign: 'center', marginBottom: 12 }}>
            No middleman you can&rsquo;t see
          </p>
          <h2 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.6rem)', fontWeight: 900, letterSpacing: '-0.04em', textAlign: 'center', margin: '0 0 16px', lineHeight: 1.1, color: '#fff' }}>
            Real money protection, not a promise
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.62)', textAlign: 'center', maxWidth: 560, margin: '0 auto 52px', lineHeight: 1.7 }}>
            Every shilling that moves through AgriNova follows the same three rules — whether
            you&rsquo;re a farmer waiting to get paid or a buyer sending money for the first time.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {TRUST.map(({ icon, title, sub }) => (
              <div key={title} style={{ padding: '26px 24px', borderRadius: 18, background: FOREST_2, border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(95,224,160,0.14)', color: MINT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  {icon}
                </div>
                <p style={{ fontSize: 15.5, fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.015em' }}>{title}</p>
                <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.58)', margin: 0, lineHeight: 1.65 }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ ROLES ════════════════════ */}
      <section id="for-buyers" style={{ padding: 'clamp(64px, 9vh, 100px) clamp(18px, 5vw, 64px)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.6rem)', fontWeight: 900, letterSpacing: '-0.04em', textAlign: 'center', margin: '0 0 40px', lineHeight: 1.1, color: INK }}>
            Built for every role in the chain
          </h2>

          <div style={{
            display: 'flex', gap: 4, padding: 4, borderRadius: 14, background: PAPER_2,
            border: `1px solid ${LINE}`, marginBottom: 24, boxSizing: 'border-box',
          }}>
            {ROLES.map((r, i) => (
              <button
                key={r.role}
                onClick={() => setActiveRole(i)}
                style={{
                  flex: 1, padding: 'clamp(10px, 2vw, 12px) 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontFamily: FONT,
                  background: activeRole === i ? '#fff' : 'transparent',
                  color: activeRole === i ? r.color : INK_MUTE,
                  fontWeight: 800, fontSize: 'clamp(12px, 2.5vw, 14px)',
                  boxShadow: activeRole === i ? '0 2px 8px rgba(15,31,21,0.08)' : 'none',
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
                padding: 'clamp(20px, 4vw, 32px)', borderRadius: 20, background: CARD,
                border: `1px solid ${LINE}`, boxShadow: '0 20px 50px rgba(15,31,21,0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 13, background: r.bg, color: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {r.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 900, color: INK, letterSpacing: '-0.025em', margin: 0 }}>{r.role}</h3>
                    <p style={{ fontSize: 13, color: INK_MUTE, margin: '2px 0 0' }}>{r.tagline}</p>
                  </div>
                </div>

                <div style={{ height: 1, background: LINE, margin: '20px 0' }} />

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px 24px' }}>
                  {r.points.map(p => (
                    <li key={p} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: INK, fontWeight: 600, lineHeight: 1.45 }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: 99, background: r.bg, color: r.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
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
                    padding: '12px 22px', borderRadius: 11, background: r.color, color: '#fff',
                    fontWeight: 800, fontSize: 14, textDecoration: 'none', boxShadow: `0 8px 20px ${r.color}40`,
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
      <section style={{ padding: 'clamp(72px, 10vh, 110px) clamp(18px, 5vw, 64px)', textAlign: 'center', position: 'relative', overflow: 'hidden', background: FOREST }}>
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 80% 60% at 50% 40%, rgba(231,167,61,0.14) 0%, transparent 70%)`,
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 580, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 20 }}>
            <Smartphone size={16} color={GOLD} strokeWidth={2.5} />
            <span style={{ fontSize: 11, fontWeight: 800, color: GOLD, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Free forever for farmers</span>
          </div>

          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1.05, margin: '0 0 20px', color: '#fff' }}>
            Ready to grow <span style={{ color: MINT }}>smarter?</span>
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.62)', margin: '0 0 36px', lineHeight: 1.65 }}>
            Join Ugandan farmers, buyers and transporters already selling better, earning more, and
            getting paid safely with AgriNova.
          </p>

          <Link href="/auth/signup" style={{
            display: 'inline-flex', alignItems: 'center', gap: 9,
            padding: '16px 34px', borderRadius: 16, background: '#fff', color: GREEN_DEEP,
            fontWeight: 900, fontSize: 16.5, textDecoration: 'none',
            boxShadow: '0 16px 40px rgba(0,0,0,0.28)', letterSpacing: '-0.01em',
          }}>
            Create your free account <ArrowRight size={18} strokeWidth={2.5} />
          </Link>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 16, fontWeight: 600 }}>
            No credit card. No catch. Ready in 2 minutes.
          </p>
        </div>
      </section>

      {/* ════════════════════ FOOTER ════════════════════ */}
      <footer style={{
        padding: '24px clamp(18px, 5vw, 64px)', borderTop: `1px solid ${LINE}`, background: PAPER,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Leaf size={11} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 13.5, fontWeight: 900, color: INK, letterSpacing: '-0.025em' }}>AgriNova</span>
          <span style={{ fontSize: 12, color: INK_MUTE, marginLeft: 2 }}>© 2026 AgriNova. All rights reserved.</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {[['Privacy', '/privacy'], ['Terms', '/terms'], ['Contact', '/contact']].map(([l, href]) => (
            <Link key={l} href={href} style={{ fontSize: 13, color: INK_MUTE, textDecoration: 'none', fontWeight: 600 }}>{l}</Link>
          ))}
        </div>
      </footer>

    </div>
  );
}

/* ─── Phone mockup — dark app UI floating on the light landing page for
   contrast, matching the app's actual dark-mode dashboard ─────────────── */
function PhoneMockup() {
  return (
    <div style={{
      width: 240, height: 488, background: '#0A140C', borderRadius: 42, border: '8px solid #0F1F15',
      boxShadow: [
        '0 0 0 1px rgba(21,122,61,0.10)',
        '0 40px 80px rgba(15,31,21,0.28)',
        '0 20px 40px rgba(15,31,21,0.16)',
      ].join(', '),
      overflow: 'hidden', position: 'relative', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
        width: 70, height: 10, background: '#0A140C', borderRadius: 99, zIndex: 10,
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
      }} />

      <div style={{ height: '100%', background: '#101A0D', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 16px 6px', fontSize: 7.5, fontWeight: 800, color: 'rgba(245,241,230,0.40)', letterSpacing: '0.04em' }}>
          <span>9:41</span>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <svg width="12" height="9" viewBox="0 0 14 10" fill="rgba(245,241,230,0.40)">
              <rect x="0" y="4" width="2" height="6" rx="0.5"/><rect x="3" y="2.5" width="2" height="7.5" rx="0.5"/>
              <rect x="6" y="1" width="2" height="9" rx="0.5"/><rect x="9" y="0" width="2" height="10" rx="0.5"/>
            </svg>
            <span>100%</span>
          </div>
        </div>

        <div style={{ flex: 1, padding: '8px 15px 0', overflowY: 'hidden' }}>
          <p style={{ fontSize: 8, fontWeight: 800, color: MINT, margin: '0 0 2px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Good morning</p>
          <p style={{ fontSize: 16, fontWeight: 900, color: '#F5F1E6', margin: '0 0 14px', letterSpacing: '-0.03em' }}>Namutebi Grace</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 9 }}>
            <div style={{ padding: '11px 12px', borderRadius: 13, background: '#123322', border: '1px solid rgba(95,224,160,0.18)' }}>
              <p style={{ fontSize: 7, fontWeight: 800, color: MINT, margin: '0 0 5px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Wallet</p>
              <p style={{ fontSize: 15, fontWeight: 900, color: '#F5F1E6', margin: 0, letterSpacing: '-0.03em' }}>480K</p>
              <p style={{ fontSize: 7, color: 'rgba(245,241,230,0.42)', margin: '2px 0 0', fontWeight: 600 }}>UGX balance</p>
            </div>
            <div style={{ padding: '11px 12px', borderRadius: 13, background: '#2B2007', border: '1px solid rgba(231,167,61,0.20)' }}>
              <p style={{ fontSize: 7, fontWeight: 800, color: '#E7A73D', margin: '0 0 5px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Maize</p>
              <p style={{ fontSize: 15, fontWeight: 900, color: '#F5F1E6', margin: 0, letterSpacing: '-0.03em' }}>+12%</p>
              <p style={{ fontSize: 7, color: 'rgba(245,241,230,0.42)', margin: '2px 0 0', fontWeight: 600 }}>Price this week</p>
            </div>
          </div>

          <div style={{ padding: '10px 12px', borderRadius: 12, marginBottom: 9, background: '#141F10', border: '1px solid rgba(95,224,160,0.18)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: MINT, flexShrink: 0, boxShadow: `0 0 6px ${MINT}99` }} />
            <p style={{ fontSize: 9, fontWeight: 600, color: '#D3EFDB', margin: 0, lineHeight: 1.3 }}>Buyer offer accepted · 300 kg beans</p>
          </div>

          <div style={{ padding: '10px 12px', borderRadius: 12, background: '#0E1E28', border: '1px solid rgba(47,143,206,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
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
            {[{ l: 'Sell', c: MINT, bg: '#123322' }, { l: 'Buy', c: '#E7A73D', bg: '#2B2007' }, { l: 'Doctor', c: '#C084FC', bg: '#231A3D' }].map(({ l, c, bg }) => (
              <div key={l} style={{ flex: 1, padding: '8px 4px', borderRadius: 10, background: bg, textAlign: 'center' }}>
                <p style={{ fontSize: 8.5, fontWeight: 800, color: c, margin: 0 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '9px 16px 15px', borderTop: '1px solid rgba(245,241,230,0.05)', background: '#0D1611', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          {[{ label: 'Home', active: true }, { label: 'Market', active: false }, { label: 'Wallet', active: false }, { label: 'More', active: false }].map(({ label, active }) => (
            <div key={label} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ width: 20, height: 3, borderRadius: 99, background: active ? MINT : 'transparent', marginBottom: 1 }} />
              <div style={{ width: 22, height: 16, borderRadius: 5, background: active ? 'rgba(95,224,160,0.18)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 11, height: 9, borderRadius: 2.5, background: active ? MINT : 'rgba(245,241,230,0.20)' }} />
              </div>
              <p style={{ fontSize: 6.5, fontWeight: active ? 800 : 500, color: active ? MINT : 'rgba(245,241,230,0.30)', margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
