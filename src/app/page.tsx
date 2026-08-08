'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Check, Sparkles, TrendingUp, Users, Microscope,
  Leaf, ShoppingCart, Truck, ShieldCheck, Lock, Scale,
  Smartphone, Wallet, Menu, X, Star, Zap,
} from 'lucide-react';

/* ─── Design tokens — aligned with globals.css ─── */
const PAPER   = '#FAF9F4';
const PAPER_2 = '#F2F0E6';
const INK     = '#0F1F15';
const INK_MID = '#2D4035';
const INK_MUTE= '#5A6B5C';
const LINE    = '#E4E1D3';
const CARD    = '#FFFFFF';

const GREEN      = '#157A3D';
const GREEN_DEEP = '#0B4526';
const GREEN_SOFT = '#E7F3EB';
const FOREST     = '#0D2B18';
const FOREST_2   = '#123420';
const MINT       = '#5FE0A0';
const GOLD       = '#E7A73D';
const GOLD_SOFT  = '#FBF0DC';
const SKY        = '#2F8FCE';
const SKY_SOFT   = '#E6F3FB';
const PLUM       = '#8B5FBF';
const PLUM_SOFT  = '#F1EAFA';

const FONT = 'var(--font-poppins), var(--font-inter), system-ui, sans-serif';

/* ─── Nav ─────────────────────────────────────────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const links = [
    ['Features',     '#features'],
    ['How it works', '#how-it-works'],
    ['Trust',        '#trust'],
    ['Pricing',      '/premium'],
  ];

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 64, display: 'flex', alignItems: 'center',
        padding: '0 clamp(16px,5vw,60px)',
        background: scrolled ? 'rgba(250,249,244,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
        borderBottom: scrolled ? `1px solid ${LINE}` : 'none',
        transition: 'background 0.25s, backdrop-filter 0.25s, border-color 0.25s',
        fontFamily: FONT,
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: 33, height: 33, borderRadius: 10, background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Leaf size={15} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.03em', color: INK }}>AgriNova</span>
        </Link>

        {/* Desktop links */}
        <div style={{ flex: 1, justifyContent: 'center', gap: 4 }} className="nav-desktop-only">
          {links.map(([l, h]) => (
            <a key={l} href={h} style={{ fontSize: 13.5, fontWeight: 600, color: INK_MUTE, textDecoration: 'none', padding: '8px 14px', borderRadius: 8, transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = INK)}
              onMouseLeave={e => (e.currentTarget.style.color = INK_MUTE)}>{l}</a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div style={{ alignItems: 'center', gap: 8 }} className="nav-desktop-only">
          <Link href="/auth/signin" style={{ fontSize: 13.5, fontWeight: 700, color: INK_MID, textDecoration: 'none', padding: '9px 16px' }}>Sign in</Link>
          <Link href="/auth/signup" style={{ fontSize: 13.5, fontWeight: 800, color: '#fff', textDecoration: 'none', padding: '10px 22px', borderRadius: 11, background: GREEN, boxShadow: '0 4px 14px rgba(21,122,61,0.30)' }}>
            Create free account
          </Link>
        </div>

        {/* Mobile menu btn */}
        <button onClick={() => setMenuOpen(v => !v)} className="nav-mobile-only" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: INK, padding: 6, minHeight: 'unset', minWidth: 'unset' }}>
          {menuOpen ? <X size={22}/> : <Menu size={22}/>}
        </button>
      </nav>

      {/* Mobile overlay menu */}
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99, background: PAPER, paddingTop: 64, flexDirection: 'column', fontFamily: FONT }} className="nav-mobile-only">
          <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {links.map(([l, h]) => (
              <a key={l} href={h} onClick={() => setMenuOpen(false)} style={{ fontSize: 18, fontWeight: 700, color: INK, textDecoration: 'none', padding: '15px 0', borderBottom: `1px solid ${LINE}` }}>{l}</a>
            ))}
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link href="/auth/signin" onClick={() => setMenuOpen(false)} style={{ fontSize: 15, fontWeight: 700, color: INK_MID, textDecoration: 'none', padding: '14px', textAlign: 'center', border: `1.5px solid ${LINE}`, borderRadius: 12 }}>Sign in</Link>
            <Link href="/auth/signup" onClick={() => setMenuOpen(false)} style={{ fontSize: 15, fontWeight: 800, color: '#fff', textDecoration: 'none', padding: '14px', textAlign: 'center', background: GREEN, borderRadius: 12 }}>Create free account</Link>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Hero ───────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section style={{ background: PAPER, padding: 'clamp(96px,14vh,128px) clamp(16px,5vw,60px) clamp(56px,8vh,80px)', position: 'relative', overflow: 'hidden', fontFamily: FONT }}>
      {/* Fine dot-grid texture — the kind of quiet detail that reads as
          "designed," not just "styled." Faded via a radial mask so it
          never competes with the copy. */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `radial-gradient(${INK} 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
        opacity: 0.035,
        maskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, black 0%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, black 0%, transparent 75%)',
      }} />
      {/* Ambient blobs */}
      <div aria-hidden style={{ position: 'absolute', top: -100, right: '6%', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${GREEN_SOFT} 0%, transparent 68%)`, pointerEvents: 'none', opacity: 0.85 }} />
      <div aria-hidden style={{ position: 'absolute', top: 60, left: '-4%', width: 380, height: 380, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD_SOFT} 0%, transparent 68%)`, pointerEvents: 'none', opacity: 0.7 }} />

      <div style={{ maxWidth: 1180, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(40px,6vw,80px)', flexWrap: 'wrap' }}>

          {/* Left — copy */}
          <div style={{ flex: '1 1 400px', minWidth: 0 }}>

            {/* Eyebrow pill */}
            <div className="landing-fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 99, background: CARD, border: `1px solid ${LINE}`, fontSize: 12, fontWeight: 700, color: GREEN_DEEP, marginBottom: 26, boxShadow: '0 2px 8px rgba(15,31,21,0.05)', animationDelay: '0ms' }}>
              <Sparkles size={13} color={GOLD} strokeWidth={2} /> Uganda&rsquo;s escrow-protected farm marketplace
            </div>

            {/* Headline */}
            <h1 className="landing-fade-up" style={{ fontSize: 'clamp(2.6rem,6.2vw,4.2rem)', fontWeight: 900, letterSpacing: '-0.048em', lineHeight: 1.03, margin: '0 0 22px', color: INK, animationDelay: '65ms' }}>
              Farm smarter.<br />
              <span style={{ color: GREEN }}>Get paid,&nbsp;</span>
              <span style={{ color: GOLD }}>guaranteed.</span>
            </h1>

            {/* Body */}
            <p className="landing-fade-up" style={{ fontSize: 'clamp(15px,1.8vw,17.5px)', color: INK_MUTE, fontWeight: 400, lineHeight: 1.72, margin: '0 0 34px', maxWidth: 480, animationDelay: '140ms' }}>
              Connect directly with buyers, diagnose crop disease in seconds, and receive every shilling — held safely in escrow until you confirm delivery.
            </p>

            {/* CTAs */}
            <div className="landing-fade-up" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28, animationDelay: '215ms' }}>
              <Link href="/auth/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 14, background: GREEN, color: '#fff', fontWeight: 800, fontSize: 15.5, textDecoration: 'none', boxShadow: '0 12px 28px rgba(21,122,61,0.32)', letterSpacing: '-0.01em' }}>
                Create free account <ArrowRight size={17} strokeWidth={2.5} />
              </Link>
              <a href="#how-it-works" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 26px', borderRadius: 14, background: CARD, border: `1.5px solid ${LINE}`, color: INK_MID, fontWeight: 700, fontSize: 15.5, textDecoration: 'none' }}>
                See how it works
              </a>
            </div>

            {/* Trust signal row — concrete, checkable claims (payment rails,
                escrow, verification) read as more credible this close to
                the fold than another adjective in the headline would. */}
            <div className="landing-fade-up" style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginBottom: 38, animationDelay: '250ms' }}>
              {[
                { icon: <Lock size={13} />, label: 'Escrow-protected' },
                { icon: <Smartphone size={13} />, label: 'MTN & Airtel Money' },
                { icon: <ShieldCheck size={13} />, label: 'ID-verified users' },
              ].map(({ icon, label }) => (
                <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: INK_MUTE }}>
                  <span style={{ color: GREEN, display: 'flex' }}>{icon}</span>{label}
                </span>
              ))}
            </div>

            {/* Stats row */}
            <div className="landing-fade-up" style={{ display: 'flex', gap: 32, flexWrap: 'wrap', animationDelay: '290ms' }}>
              {[['30+', 'Districts covered'], ['3 min', 'To sign up'], ['Free', 'Always for farmers']].map(([v, l]) => (
                <div key={l}>
                  <p style={{ fontSize: 22, fontWeight: 900, color: INK, margin: 0, letterSpacing: '-0.04em' }}>{v}</p>
                  <p style={{ fontSize: 11.5, color: INK_MUTE, margin: '3px 0 0', fontWeight: 600 }}>{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — phone, with a floating proof card for depth */}
          <div style={{ flex: '0 0 auto', position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <div className="landing-fade-up landing-float phone-mockup-slot" style={{ animationDelay: '175ms' }}>
              <PhoneMockup />
            </div>
            <div
              aria-hidden
              className="landing-fade-up landing-badge-float hero-escrow-badge"
              style={{
                position: 'absolute', left: -34, bottom: 64, zIndex: 2, animationDelay: '420ms',
                display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px 11px 12px',
                borderRadius: 16, background: CARD, border: `1px solid ${LINE}`,
                boxShadow: '0 18px 40px rgba(15,31,21,0.16)',
              }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 11, background: GREEN_SOFT, color: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lock size={16} strokeWidth={2.3} />
              </div>
              <div>
                <p style={{ fontSize: 12.5, fontWeight: 900, color: INK, margin: 0, letterSpacing: '-0.02em' }}>UGX 480,000</p>
                <p style={{ fontSize: 10, color: INK_MUTE, margin: '1px 0 0', fontWeight: 700 }}>held safely in escrow</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Social proof bar ────────────────────────────────────────────────────── */
function ProofBar() {
  return (
    <div style={{ background: CARD, borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, padding: '16px clamp(16px,5vw,60px)', fontFamily: FONT }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(20px,5vw,52px)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: INK_MUTE, textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>Works with</span>
        {['MTN Mobile Money', 'Airtel Money', 'Google Cloud AI', 'Stanbic Bank'].map(n => (
          <span key={n} style={{ fontSize: 13, fontWeight: 700, color: INK_MUTE, whiteSpace: 'nowrap' }}>{n}</span>
        ))}
      </div>
    </div>
  );
}

/* ─── Stats band ──────────────────────────────────────────────────────────── */
function StatsBand() {
  const stats = [
    { icon: <Users size={18}/>, value: '30+', label: 'Districts covered', color: GREEN, bg: GREEN_SOFT },
    { icon: <Wallet size={18}/>, value: '0%', label: 'Fee to list your harvest', color: GOLD, bg: GOLD_SOFT },
    { icon: <Lock size={18}/>, value: '100%', label: 'Payments escrow-protected', color: SKY, bg: SKY_SOFT },
    { icon: <Microscope size={18}/>, value: '<30s', label: 'AI crop disease diagnosis', color: PLUM, bg: PLUM_SOFT },
  ];
  return (
    <section style={{ padding: 'clamp(48px,7vh,64px) clamp(16px,5vw,60px)', background: PAPER, fontFamily: FONT }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 16 }}>
        {stats.map(({ icon, value, label, color, bg }) => (
          <div key={label} className="landing-card-hover" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', borderRadius: 18, background: CARD, border: `1px solid ${LINE}` }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
            <div>
              <p style={{ fontSize: 21, fontWeight: 900, color: INK, margin: 0, letterSpacing: '-0.035em' }}>{value}</p>
              <p style={{ fontSize: 11.5, color: INK_MUTE, margin: '2px 0 0', fontWeight: 700 }}>{label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Why AgriNova (old way vs new way) ──────────────────────────────────── */
function WhyDifferent() {
  const rows = [
    { old: 'Sell at whatever price shows up at your gate', now: 'See live district prices before you harvest' },
    { old: 'Trust a stranger to pay after you hand over the goods', now: 'Payment sits in escrow until you confirm delivery' },
    { old: 'Wait days for a diagnosis on a sick crop', now: 'AI diagnosis with treatment advice in under 30 seconds' },
    { old: 'No record if a buyer or transporter disappears', now: 'Every user verified, every deal has a paper trail' },
  ];
  return (
    <section style={{ padding: 'clamp(72px,10vh,100px) clamp(16px,5vw,60px)', background: PAPER, fontFamily: FONT }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN, margin: '0 0 12px' }}>The difference</p>
          <h2 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 900, letterSpacing: '-0.04em', color: INK, margin: 0, lineHeight: 1.06 }}>
            The old way, versus AgriNova.
          </h2>
        </div>

        <div className="landing-card-hover why-different" style={{ borderRadius: 22, background: CARD, border: `1px solid ${LINE}`, boxShadow: '0 20px 50px rgba(15,31,21,0.06)', overflow: 'hidden' }}>
          <div className="why-different-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${LINE}`, borderRight: `1px solid ${LINE}` }}>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: INK_MUTE, margin: 0 }}>Before</p>
            </div>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${LINE}`, background: GREEN_SOFT }}>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: GREEN_DEEP, margin: 0 }}>With AgriNova</p>
            </div>
          </div>
          {rows.map(({ old, now }, i) => (
            <div key={old} className="why-different-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: i < rows.length - 1 ? `1px solid ${LINE}` : 'none' }}>
              <div style={{ padding: '18px 20px', borderRight: `1px solid ${LINE}`, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 14, color: '#C4453A', fontWeight: 900, lineHeight: 1.4, flexShrink: 0 }}>&times;</span>
                <p style={{ fontSize: 13.5, color: INK_MID, margin: 0, lineHeight: 1.55 }}>{old}</p>
              </div>
              <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ width: 17, height: 17, borderRadius: 99, background: GREEN_SOFT, color: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <Check size={10} strokeWidth={3.2} />
                </span>
                <p style={{ fontSize: 13.5, color: INK, fontWeight: 600, margin: 0, lineHeight: 1.55 }}>{now}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features bento ─────────────────────────────────────────────────────── */
function Features() {
  const items = [
    { icon: <Wallet size={22}/>, title: 'Escrow-protected payments', body: "A buyer's money sits with AgriNova — not them, not you — until you confirm the goods arrived. Every shilling, every time.", color: GREEN, bg: GREEN_SOFT, wide: true },
    { icon: <TrendingUp size={22}/>, title: 'Live district prices', body: 'Real rates updated daily from markets across Uganda. Know what Kampala is paying before you harvest.', color: GOLD, bg: GOLD_SOFT },
    { icon: <Microscope size={22}/>, title: 'AI Crop Doctor', body: 'Photograph a sick plant. Get a diagnosis and treatment advice in under 30 seconds.', color: PLUM, bg: PLUM_SOFT },
    { icon: <Users size={22}/>, title: 'Farmer groups', body: 'Pool your harvest with neighbouring farmers and sell as one large lot — better prices, less negotiation.', color: SKY, bg: SKY_SOFT },
  ];

  return (
    <section id="features" style={{ padding: 'clamp(72px,10vh,100px) clamp(16px,5vw,60px)', background: PAPER, fontFamily: FONT }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        {/* Section header */}
        <div style={{ marginBottom: 52 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN, margin: '0 0 12px' }}>What you get</p>
          <h2 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 900, letterSpacing: '-0.04em', color: INK, margin: '0 0 14px', lineHeight: 1.06 }}>
            Everything a Ugandan farmer needs.<br />Nothing they don&rsquo;t.
          </h2>
          <p style={{ fontSize: 15.5, color: INK_MUTE, margin: 0, maxWidth: 500, lineHeight: 1.7 }}>
            Offline-tolerant, mobile-first, in the units and languages your market actually uses.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(275px,1fr))', gap: 16, gridAutoFlow: 'dense' }}>
          {items.map(({ icon, title, body, color, bg, wide }) => (
            <div key={title} className={`landing-card-hover${wide ? ' feature-wide' : ''}`} style={{ padding: '26px 24px', borderRadius: 20, background: CARD, border: `1px solid ${LINE}`, gridColumn: wide ? 'span 2' : 'span 1', boxShadow: '0 2px 10px rgba(15,31,21,0.04)', display: 'flex', flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'center' : 'flex-start', gap: wide ? 20 : 0 }}>
              <div style={{ width: 50, height: 50, borderRadius: 14, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: wide ? 0 : 18, flexShrink: 0 }}>{icon}</div>
              <div>
                <p style={{ fontSize: wide ? 18 : 15.5, fontWeight: 800, color: INK, margin: '0 0 8px', letterSpacing: '-0.02em' }}>{title}</p>
                <p style={{ fontSize: wide ? 14.5 : 13.5, color: INK_MUTE, margin: 0, lineHeight: 1.65, maxWidth: wide ? 420 : undefined }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How it works ───────────────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { n: '01', title: 'Create your free account', body: 'Sign up in under 2 minutes. Pick your role — farmer, buyer, transporter, or supplier. You can hold multiple roles on the same account.' },
    { n: '02', title: 'Complete your profile', body: 'Add your district, crop, and phone number. Upload your national ID to earn a verification badge and unlock higher order limits.' },
    { n: '03', title: 'Start trading', body: 'List your harvest, make offers, book deliveries. Every payment moves through escrow — your money only releases when both sides are satisfied.' },
  ];

  return (
    <section id="how-it-works" style={{ padding: 'clamp(72px,10vh,100px) clamp(16px,5vw,60px)', background: PAPER_2, fontFamily: FONT }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN, margin: '0 0 12px' }}>Simple to start</p>
          <h2 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 900, letterSpacing: '-0.04em', color: INK, margin: 0, lineHeight: 1.06 }}>
            Up and running in minutes.
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {steps.map(({ n, title, body }, i) => (
            <div key={n} style={{ display: 'flex', gap: 22 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 52 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, flexShrink: 0, background: i === 0 ? GREEN : CARD, border: i === 0 ? 'none' : `1.5px solid ${LINE}`, color: i === 0 ? '#fff' : GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, letterSpacing: '-0.02em', boxShadow: i === 0 ? '0 10px 24px rgba(21,122,61,0.28)' : 'none' }}>{n}</div>
                {i < steps.length - 1 && <div style={{ width: 1.5, flex: 1, minHeight: 40, marginTop: 6, background: `linear-gradient(180deg,${LINE},transparent)` }} />}
              </div>
              <div style={{ paddingBottom: i < steps.length - 1 ? 44 : 0, paddingTop: 13, flex: 1 }}>
                <p style={{ fontSize: 17.5, fontWeight: 800, color: INK, margin: '0 0 8px', letterSpacing: '-0.025em' }}>{title}</p>
                <p style={{ fontSize: 14.5, color: INK_MUTE, margin: 0, lineHeight: 1.7 }}>{body}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 52 }}>
          <Link href="/auth/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 13, background: GREEN, color: '#fff', fontWeight: 800, fontSize: 15.5, textDecoration: 'none', boxShadow: '0 12px 28px rgba(21,122,61,0.28)', letterSpacing: '-0.01em' }}>
            Create your account — it&rsquo;s free <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Trust section (dark) ────────────────────────────────────────────────── */
function TrustSection() {
  const items = [
    { icon: <Lock size={20}/>, title: 'Money held in escrow', body: "When a buyer accepts your price, their payment moves to AgriNova's escrow — not to them, not to you. It only reaches your wallet after they confirm the goods arrived in good condition." },
    { icon: <ShieldCheck size={20}/>, title: 'Every user is verified', body: "Farmers, buyers, and transporters all verify with a national ID before they can trade. You can see the verification badge on every profile before agreeing to a deal." },
    { icon: <Scale size={20}/>, title: 'Disputes reviewed by a person', body: "If something goes wrong — wrong quantity, damaged goods, no-show — raise a dispute within 48 hours. A real admin reviews the case before any money moves." },
  ];

  return (
    <section id="trust" style={{ padding: 'clamp(72px,10vh,100px) clamp(16px,5vw,60px)', background: FOREST, position: 'relative', overflow: 'hidden', fontFamily: FONT }}>
      <div aria-hidden style={{ position: 'absolute', top: '12%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 400, background: `radial-gradient(ellipse at center,rgba(95,224,160,0.09) 0%,transparent 70%)`, pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, margin: '0 0 12px', opacity: 0.9 }}>Your money is safe here</p>
          <h2 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 900, letterSpacing: '-0.04em', color: '#fff', margin: '0 0 16px', lineHeight: 1.06 }}>
            Real protection. Not a promise.
          </h2>
          <p style={{ fontSize: 15.5, color: 'rgba(255,255,255,0.58)', margin: '0 auto', maxWidth: 540, lineHeight: 1.72 }}>
            We built AgriNova after watching too many Ugandan farmers get cheated — underpaid, ignored after delivery, or paid nothing at all. These rules exist because of that.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
          {items.map(({ icon, title, body }) => (
            <div key={title} className="landing-card-hover" style={{ padding: '28px 26px', borderRadius: 20, background: FOREST_2, border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(95,224,160,0.13)', color: MINT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>{icon}</div>
              <p style={{ fontSize: 15.5, fontWeight: 800, color: '#fff', margin: '0 0 10px', letterSpacing: '-0.015em', lineHeight: 1.3 }}>{title}</p>
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.56)', margin: 0, lineHeight: 1.7 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Roles tab section ───────────────────────────────────────────────────── */
function RolesSection() {
  const [active, setActive] = useState(0);

  const roles = [
    {
      label: 'Farmers', icon: <Leaf size={22}/>, color: GREEN, bg: GREEN_SOFT,
      tagline: 'Sell direct. Get paid safely.',
      points: ['Live prices before you harvest', 'Sell to verified buyers across Uganda', 'AI disease diagnosis in 30 seconds', 'Cash out to MTN or Airtel Mobile Money'],
    },
    {
      label: 'Buyers', icon: <ShoppingCart size={22}/>, color: GOLD, bg: GOLD_SOFT,
      tagline: 'Source fresh produce directly from farms.',
      points: ['Browse verified farmer listings by district', 'Money held in escrow until you confirm delivery', 'Full tracking from farm to your gate', 'Dispute protection within 48 hours'],
    },
    {
      label: 'Transporters', icon: <Truck size={22}/>, color: SKY, bg: SKY_SOFT,
      tagline: 'More trips. Guaranteed payment.',
      points: ['Matched to delivery jobs near you', 'Paid the moment the buyer confirms delivery', 'Cold-chain and fast-delivery options', 'Build a verified driver profile over time'],
    },
  ];

  const r = roles[active];

  return (
    <section id="roles" style={{ padding: 'clamp(72px,10vh,100px) clamp(16px,5vw,60px)', background: PAPER, fontFamily: FONT }}>
      <div style={{ maxWidth: 940, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN, margin: '0 0 12px' }}>Who it&rsquo;s for</p>
          <h2 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 900, letterSpacing: '-0.04em', color: INK, margin: '0 0 12px', lineHeight: 1.06 }}>One platform for every link in the chain.</h2>
          <p style={{ fontSize: 14, color: INK_MUTE, margin: 0 }}>Also for input suppliers, cooperatives, and agribusiness — <Link href="/auth/signup" style={{ color: GREEN, fontWeight: 700 }}>pick your role on signup.</Link></p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 14, background: PAPER_2, border: `1px solid ${LINE}`, marginBottom: 22 }}>
          {roles.map((role, i) => (
            <button key={role.label} onClick={() => setActive(i)} style={{ flex: 1, minWidth: 0, padding: 'clamp(10px,2vw,12px) 6px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: FONT, fontWeight: 800, fontSize: 'clamp(11px,2.5vw,14px)', lineHeight: 1.2, whiteSpace: 'normal', wordBreak: 'break-word', transition: 'all 0.18s ease', background: active === i ? CARD : 'transparent', color: active === i ? role.color : INK_MUTE, boxShadow: active === i ? '0 2px 8px rgba(15,31,21,0.08)' : 'none' }}>
              {role.label}
            </button>
          ))}
        </div>

        {/* Role card */}
        <div key={active} className="landing-role-card" style={{ padding: 'clamp(22px,4vw,34px)', borderRadius: 22, background: CARD, border: `1px solid ${LINE}`, boxShadow: '0 20px 50px rgba(15,31,21,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: r.bg, color: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{r.icon}</div>
            <div>
              <h3 style={{ fontSize: 19, fontWeight: 900, color: INK, letterSpacing: '-0.025em', margin: 0 }}>{r.label}</h3>
              <p style={{ fontSize: 13.5, color: INK_MUTE, margin: '3px 0 0' }}>{r.tagline}</p>
            </div>
          </div>

          <div style={{ height: 1, background: LINE, margin: '20px 0' }} />

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: '12px 24px' }}>
            {r.points.map(p => (
              <li key={p} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: INK_MID, fontWeight: 600, lineHeight: 1.5 }}>
                <span style={{ width: 20, height: 20, borderRadius: 99, background: r.bg, color: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <Check size={11} strokeWidth={3} />
                </span>
                {p}
              </li>
            ))}
          </ul>

          <div style={{ marginTop: 28 }}>
            <Link href="/auth/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '12px 22px', borderRadius: 11, background: r.color, color: '#fff', fontWeight: 800, fontSize: 14, textDecoration: 'none', boxShadow: `0 8px 20px ${r.color}40`, letterSpacing: '-0.01em' }}>
              Get started as {r.label.split(' ')[0]} <ArrowRight size={15} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ────────────────────────────────────────────────────────── */
function Testimonials() {
  const quotes = [
    { quote: "I used to sell at whatever price the trader offered at my gate. Now I can see what Kampala buyers are paying and negotiate from that number.", name: 'Auma Florence', role: 'Maize farmer, Soroti', initials: 'AF', color: GREEN, bg: GREEN_SOFT },
    { quote: "The escrow means I can buy from farmers I have never met without worrying about paying for goods that never show up.", name: 'Ssemakula James', role: 'Produce buyer, Kampala', initials: 'SJ', color: GOLD, bg: GOLD_SOFT },
    { quote: "I get delivery requests straight to my phone now instead of waiting at the stage hoping someone needs a truck.", name: 'Opio Patrick', role: 'Transporter, Gulu', initials: 'OP', color: SKY, bg: SKY_SOFT },
  ];

  return (
    <section style={{ padding: 'clamp(72px,10vh,100px) clamp(16px,5vw,60px)', background: PAPER_2, fontFamily: FONT }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginBottom: 14 }}>
            {[1,2,3,4,5].map(i => <Star key={i} size={18} fill={GOLD} color={GOLD} />)}
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.4rem)', fontWeight: 900, letterSpacing: '-0.04em', color: INK, margin: '0 0 10px', lineHeight: 1.08 }}>
            From the farmers themselves.
          </h2>
          <p style={{ fontSize: 15, color: INK_MUTE, margin: 0 }}>Real people. Real districts. Real results.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
          {quotes.map(({ quote, name, role, initials, color, bg }) => (
            <div key={name} className="landing-card-hover" style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 20, padding: '28px 26px', boxShadow: '0 2px 16px rgba(15,31,21,0.05)' }}>
              <p style={{ fontSize: 42, lineHeight: 1, color: LINE, margin: '0 0 10px', fontFamily: 'Georgia, serif', fontWeight: 900 }}>&ldquo;</p>
              <p style={{ fontSize: 14.5, color: INK_MID, lineHeight: 1.78, margin: '0 0 24px', fontStyle: 'italic' }}>{quote}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{initials}</div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: INK, margin: 0 }}>{name}</p>
                  <p style={{ fontSize: 11.5, color: INK_MUTE, margin: '2px 0 0' }}>{role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Final CTA ───────────────────────────────────────────────────────────── */
function FinalCTA() {
  return (
    <section style={{ padding: 'clamp(80px,12vh,120px) clamp(16px,5vw,60px)', background: FOREST, position: 'relative', overflow: 'hidden', textAlign: 'center', fontFamily: FONT }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 70% 55% at 50% 50%,rgba(231,167,61,0.13) 0%,transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 99, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', marginBottom: 24 }}>
          <Zap size={13} color={GOLD} strokeWidth={2.5} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,247,230,0.85)', letterSpacing: '0.06em' }}>Free forever for farmers</span>
        </div>

        <h2 style={{ fontSize: 'clamp(2.2rem,5vw,3.2rem)', fontWeight: 900, letterSpacing: '-0.048em', lineHeight: 1.04, margin: '0 0 20px', color: '#fff' }}>
          Ready to grow <span style={{ color: MINT }}>smarter?</span>
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.58)', margin: '0 0 38px', lineHeight: 1.7, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
          Join Ugandan farmers, buyers, and transporters already selling better, earning more, and getting paid safely — every shilling.
        </p>

        <Link href="/auth/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '16px 34px', borderRadius: 16, background: '#fff', color: GREEN_DEEP, fontWeight: 900, fontSize: 16.5, textDecoration: 'none', boxShadow: '0 16px 40px rgba(0,0,0,0.28)', letterSpacing: '-0.02em' }}>
          Create free account <ArrowRight size={18} strokeWidth={2.5} />
        </Link>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 16, fontWeight: 600 }}>No card. No contract. Ready in 2 minutes.</p>
      </div>
    </section>
  );
}

/* ─── Footer ──────────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{ background: PAPER, borderTop: `1px solid ${LINE}`, padding: 'clamp(40px,6vh,64px) clamp(16px,5vw,60px) 32px', fontFamily: FONT }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 40, marginBottom: 48 }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Leaf size={13} color="#fff" strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 900, color: INK, letterSpacing: '-0.025em' }}>AgriNova</span>
            </div>
            <p style={{ fontSize: 13, color: INK_MUTE, lineHeight: 1.65, margin: '0 0 14px', maxWidth: 210 }}>Uganda&rsquo;s farm-to-market platform. Free for farmers, always.</p>
          </div>

          {/* Product */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: INK, textTransform: 'uppercase', letterSpacing: '0.10em', margin: '0 0 16px' }}>Product</p>
            {[['Features','#features'],['How it works','#how-it-works'],['Pricing','/premium'],['For buyers','#roles']].map(([l,h]) => (
              <a key={l} href={h} style={{ display: 'block', fontSize: 13, color: INK_MUTE, textDecoration: 'none', marginBottom: 10, fontWeight: 600 }}>{l}</a>
            ))}
          </div>

          {/* Company */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: INK, textTransform: 'uppercase', letterSpacing: '0.10em', margin: '0 0 16px' }}>Company</p>
            {[['Privacy','/privacy'],['Terms','/terms'],['Contact','/contact'],['Support','/farmer/support']].map(([l,h]) => (
              <a key={l} href={h} style={{ display: 'block', fontSize: 13, color: INK_MUTE, textDecoration: 'none', marginBottom: 10, fontWeight: 600 }}>{l}</a>
            ))}
          </div>

          {/* Get started */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: INK, textTransform: 'uppercase', letterSpacing: '0.10em', margin: '0 0 16px' }}>Get started</p>
            <p style={{ fontSize: 13, color: INK_MUTE, lineHeight: 1.6, margin: '0 0 14px' }}>Works on any smartphone browser. No download needed.</p>
            <Link href="/auth/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, padding: '9px 16px', borderRadius: 9, background: GREEN, color: '#fff', textDecoration: 'none' }}>
              Open app <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 12, color: INK_MUTE, margin: 0 }}>© 2026 AgriNova. All rights reserved.</p>
          <p style={{ fontSize: 12, color: INK_MUTE, margin: 0 }}>Built for Ugandan farmers.</p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Phone mockup ────────────────────────────────────────────────────────── */
function PhoneMockup() {
  return (
    <div className="phone-mockup" style={{ width: 244, height: 494, background: '#0A140C', borderRadius: 42, border: '8px solid #0F1F15', boxShadow: ['0 0 0 1px rgba(21,122,61,0.10)', '0 40px 80px rgba(15,31,21,0.28)', '0 20px 40px rgba(15,31,21,0.16)'].join(', '), overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)', width: 70, height: 10, background: '#0A140C', borderRadius: 99, zIndex: 10, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)' }} />

      <div style={{ height: '100%', background: '#101A0D', display: 'flex', flexDirection: 'column' }}>
        {/* Status bar */}
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
              <p style={{ fontSize: 7, fontWeight: 800, color: GOLD, margin: '0 0 5px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Maize</p>
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
            {[{ l: 'Sell', c: MINT, bg: '#123322' }, { l: 'Buy', c: GOLD, bg: '#2B2007' }, { l: 'Doctor', c: '#C084FC', bg: '#231A3D' }].map(({ l, c, bg }) => (
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

/* ─── Page root ───────────────────────────────────────────────────────────── */
export default function Home() {
  return (
    <div style={{ background: PAPER, color: INK, fontFamily: FONT, overflowX: 'hidden' }}>
      {/* Phone mockup is built from fixed pixel values so its internal
          type/spacing stays crisp — scaled as a whole unit via `transform`
          (not resized) so it never crowds or overflows the smallest real
          phone viewports (~320px CSS width). The slot around it reserves
          the already-scaled footprint so nothing collapses or leaves a gap. */}
      <style>{`
        /* Desktop nav / mobile menu-button visibility toggle, written as
           plain CSS rather than Tailwind's hidden/md: utilities — those
           utilities were unreliably resolving in this build (computed
           style stayed display:flex below the md breakpoint), which left
           the full desktop nav overlapping the mobile hamburger button and
           overflowing the viewport on real phones. Explicit rules here are
           easy to verify and don't depend on utility-class generation. */
        .nav-desktop-only { display: none; }
        .nav-mobile-only { display: flex; }
        @media (min-width: 768px) {
          .nav-desktop-only { display: flex; }
          .nav-mobile-only { display: none; }
        }
        /* The "wide" (span 2) feature card doesn't fit two 275px grid
           tracks plus gap on narrow phones — CSS Grid doesn't auto-shrink
           an explicit span, so it was overflowing the viewport instead of
           collapsing to one column. */
        @media (max-width: 600px) {
          .feature-wide { grid-column: span 1 !important; flex-direction: column !important; align-items: flex-start !important; gap: 0 !important; }
        }
        @media (max-width: 420px) {
          .phone-mockup-slot { width: 210px; height: 426px; }
          .phone-mockup { transform: scale(0.861); transform-origin: top center; }
        }
        @media (max-width: 350px) {
          .phone-mockup-slot { width: 184px; height: 373px; }
          .phone-mockup { transform: scale(0.754); transform-origin: top center; }
        }
        /* The floating escrow badge overlaps the phone's left edge by
           design (34px) — on narrow phones that would push it past the
           viewport edge and force horizontal scroll, so it tucks fully
           inside the mockup's footprint below 480px instead of hiding
           outright (still communicates the same trust signal). */
        @media (max-width: 480px) {
          .hero-escrow-badge { left: 4px !important; bottom: 40px !important; }
        }
        /* Two full-sentence columns get too tight below ~560px — stack
           "before" over "with Cropify" per row instead of side-by-side. */
        @media (max-width: 560px) {
          .why-different-row { grid-template-columns: 1fr !important; }
          .why-different-row > div:first-child { border-right: none !important; }
        }
      `}</style>
      <Nav />
      <Hero />
      <ProofBar />
      <StatsBand />
      <Features />
      <WhyDifferent />
      <HowItWorks />
      <TrustSection />
      <RolesSection />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </div>
  );
}
