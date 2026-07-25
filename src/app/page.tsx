'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Check, Leaf, Wallet, TrendingUp,
  Microscope, Users, ShoppingCart, Truck,
  Lock, ShieldCheck, Scale, Menu, X,
  ChevronDown, Star, Zap, Globe,
} from 'lucide-react';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  // Surfaces
  cream:   '#FAFAF7',
  cream2:  '#F2F1EC',
  white:   '#FFFFFF',
  // Ink
  ink:     '#111816',
  inkMid:  '#374840',
  inkMute: '#6B7F76',
  line:    '#E2E0D8',
  // Brand
  green:   '#16623A',
  greenHover: '#1A7845',
  greenDeep:  '#0B3D24',
  greenSoft:  '#E8F4ED',
  greenMint:  '#4DD68C',
  // Accents
  gold:    '#D4882A',
  goldSoft:'#FBF0DC',
  sky:     '#2471A3',
  skySoft: '#E8F4FB',
  plum:    '#7B4FA6',
  plumSoft:'#F3ECFA',
  // Forest (dark sections)
  forest:  '#0B2318',
  forest2: '#102C1E',
  // Font
  font: 'var(--font-poppins), var(--font-inter), system-ui, sans-serif',
};

// ─── Nav ─────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { label: 'Features',    href: '#features' },
    { label: 'How it works',href: '#how-it-works' },
    { label: 'For buyers',  href: '#roles' },
    { label: 'Pricing',     href: '/premium' },
  ];

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 64,
        display: 'flex', alignItems: 'center',
        padding: '0 clamp(16px,5vw,56px)',
        background: scrolled ? 'rgba(250,250,247,0.94)' : 'transparent',
        backdropFilter: scrolled ? 'blur(18px)' : 'none',
        borderBottom: scrolled ? `1px solid ${T.line}` : 'none',
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: T.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Leaf size={16} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 900, color: T.ink, letterSpacing: '-0.03em', fontFamily: T.font }}>AgriNova</span>
        </Link>

        {/* Desktop links */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 6 }} className="hidden md:flex">
          {links.map(l => (
            <a key={l.label} href={l.href} style={{ fontSize: 13.5, fontWeight: 600, color: T.inkMid, textDecoration: 'none', padding: '8px 14px', borderRadius: 8, transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = T.ink)}
              onMouseLeave={e => (e.currentTarget.style.color = T.inkMid)}>
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }} className="hidden md:flex">
          <Link href="/auth/signin" style={{ fontSize: 13.5, fontWeight: 700, color: T.inkMid, textDecoration: 'none', padding: '9px 16px', borderRadius: 9, transition: 'color 0.15s' }}>Sign in</Link>
          <Link href="/auth/signup" style={{ fontSize: 13.5, fontWeight: 800, color: '#fff', textDecoration: 'none', padding: '10px 22px', borderRadius: 10, background: T.green, boxShadow: '0 4px 14px rgba(22,98,58,0.30)', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = T.greenHover)}
            onMouseLeave={e => (e.currentTarget.style.background = T.green)}>
            Get started free
          </Link>
        </div>

        {/* Mobile menu button */}
        <button onClick={() => setMenuOpen(v => !v)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: T.ink, display: 'flex', padding: 4, minHeight: 'unset', minWidth: 'unset' }} className="md:hidden" aria-label="Toggle menu">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99, background: T.white, paddingTop: 64, display: 'flex', flexDirection: 'column' }} className="md:hidden">
          <div style={{ flex: 1, padding: '24px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {links.map(l => (
              <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)} style={{ fontSize: 18, fontWeight: 700, color: T.ink, textDecoration: 'none', padding: '14px 0', borderBottom: `1px solid ${T.line}` }}>{l.label}</a>
            ))}
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Link href="/auth/signin" onClick={() => setMenuOpen(false)} style={{ fontSize: 15, fontWeight: 700, color: T.inkMid, textDecoration: 'none', padding: '14px', textAlign: 'center', border: `1.5px solid ${T.line}`, borderRadius: 12 }}>Sign in</Link>
            <Link href="/auth/signup" onClick={() => setMenuOpen(false)} style={{ fontSize: 15, fontWeight: 800, color: '#fff', textDecoration: 'none', padding: '14px', textAlign: 'center', background: T.green, borderRadius: 12 }}>Create free account</Link>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ background: T.cream, paddingTop: 'clamp(100px,16vh,140px)', paddingBottom: 'clamp(64px,10vh,100px)', paddingLeft: 'clamp(16px,5vw,56px)', paddingRight: 'clamp(16px,5vw,56px)', position: 'relative', overflow: 'hidden' }}>
      {/* Subtle background texture blobs */}
      <div aria-hidden style={{ position: 'absolute', top: -80, right: '5%', width: 520, height: 520, borderRadius: '50%', background: `radial-gradient(circle, ${T.greenSoft} 0%, transparent 65%)`, pointerEvents: 'none', opacity: 0.7 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: -60, left: '-5%', width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, ${T.goldSoft} 0%, transparent 65%)`, pointerEvents: 'none', opacity: 0.6 }} />

      <div style={{ maxWidth: 1160, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(48px,6vw,88px)', flexWrap: 'wrap' }}>

          {/* Left — copy */}
          <div style={{ flex: '1 1 400px', minWidth: 0 }}>
            {/* Eyebrow */}
            <div className="landing-fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 99, background: T.white, border: `1px solid ${T.line}`, marginBottom: 28, boxShadow: '0 1px 6px rgba(17,24,22,0.06)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.greenMint, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: T.greenDeep, letterSpacing: '0.04em' }}>Uganda&rsquo;s farm-to-market platform</span>
            </div>

            {/* Headline — editorial, not AI-generic */}
            <h1 className="landing-fade-up" style={{ fontSize: 'clamp(2.8rem,6.5vw,4.4rem)', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.02, margin: '0 0 24px', color: T.ink, animationDelay: '60ms' }}>
              Your harvest.<br />
              Your price.<br />
              <em style={{ fontStyle: 'normal', color: T.green }}>Your money — safe.</em>
            </h1>

            {/* Sub — specific and honest, not hype */}
            <p className="landing-fade-up" style={{ fontSize: 'clamp(15px,1.9vw,18px)', color: T.inkMid, lineHeight: 1.75, margin: '0 0 36px', maxWidth: 460, animationDelay: '130ms', fontWeight: 400 }}>
              AgriNova connects farmers directly with buyers across Uganda.
              Every payment sits in escrow until you confirm delivery — then it lands in your mobile money wallet.
            </p>

            {/* CTAs */}
            <div className="landing-fade-up" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 44, animationDelay: '200ms' }}>
              <Link href="/auth/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 13, background: T.green, color: '#fff', fontWeight: 800, fontSize: 15, textDecoration: 'none', boxShadow: '0 10px 28px rgba(22,98,58,0.30)', letterSpacing: '-0.01em' }}>
                Start for free <ArrowRight size={16} strokeWidth={2.5} />
              </Link>
              <a href="#how-it-works" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 24px', borderRadius: 13, background: T.white, border: `1.5px solid ${T.line}`, color: T.ink, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
                See how it works <ChevronDown size={15} />
              </a>
            </div>

            {/* Social proof numbers */}
            <div className="landing-fade-up" style={{ display: 'flex', gap: 32, flexWrap: 'wrap', animationDelay: '270ms' }}>
              {[['30+', 'Districts'], ['7', 'User roles'], ['UGX 0', 'To start']].map(([v, l]) => (
                <div key={l}>
                  <p style={{ fontSize: 22, fontWeight: 900, color: T.ink, margin: 0, letterSpacing: '-0.04em', fontFamily: T.font }}>{v}</p>
                  <p style={{ fontSize: 12, color: T.inkMute, margin: '3px 0 0', fontWeight: 600 }}>{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — phone mockup */}
          <div className="landing-fade-up landing-float" style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center', animationDelay: '160ms' }}>
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Logos / trust bar ────────────────────────────────────────────────────────
function TrustBar() {
  return (
    <div style={{ background: T.white, borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}`, padding: '18px clamp(16px,5vw,56px)' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(24px,5vw,56px)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: T.inkMute, textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>Works with</span>
        {['MTN Mobile Money', 'Airtel Money', 'Stanbic Bank', 'Google Cloud AI'].map(name => (
          <span key={name} style={{ fontSize: 13, fontWeight: 700, color: T.inkMute, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{name}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
function Features() {
  const cards = [
    {
      icon: <Wallet size={20} />,
      color: T.green, bg: T.greenSoft,
      title: 'Escrow-protected payments',
      body: "Buyer pays first. Money sits with AgriNova. You get paid the moment your delivery is confirmed — not before, not late.",
      wide: true,
    },
    {
      icon: <TrendingUp size={20} />,
      color: T.gold, bg: T.goldSoft,
      title: 'Live district prices',
      body: 'Updated daily from markets across Uganda. Know what maize is fetching in Mbarara before you even harvest.',
    },
    {
      icon: <Microscope size={20} />,
      color: T.plum, bg: T.plumSoft,
      title: 'AI Crop Doctor',
      body: 'Take a photo of a sick plant. Get a diagnosis and treatment advice in under 30 seconds.',
    },
    {
      icon: <Users size={20} />,
      color: T.sky, bg: T.skySoft,
      title: 'Farmer groups',
      body: 'Pool your harvest with other farmers in your area and sell as a single large lot — better prices, less negotiation.',
    },
  ];

  return (
    <section id="features" style={{ padding: 'clamp(72px,10vh,100px) clamp(16px,5vw,56px)', background: T.cream }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div style={{ marginBottom: 52 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.green, margin: '0 0 12px' }}>What you get</p>
          <h2 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 900, letterSpacing: '-0.04em', color: T.ink, margin: '0 0 16px', lineHeight: 1.08 }}>
            Everything a smallholder needs.<br />Nothing they don&rsquo;t.
          </h2>
          <p style={{ fontSize: 16, color: T.inkMid, margin: 0, maxWidth: 520, lineHeight: 1.7 }}>
            Built specifically for Uganda — offline-tolerant, mobile-first, in languages and units people actually use.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, gridAutoFlow: 'dense' }}>
          {cards.map(({ icon, color, bg, title, body, wide }) => (
            <div key={title} style={{ padding: '28px 26px', borderRadius: 20, background: T.white, border: `1px solid ${T.line}`, gridColumn: wide ? 'span 2' : 'span 1', boxShadow: '0 1px 4px rgba(17,24,22,0.04), 0 8px 24px rgba(17,24,22,0.04)', display: 'flex', flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'center' : 'flex-start', gap: wide ? 22 : 0 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: wide ? 0 : 18 }}>{icon}</div>
              <div>
                <p style={{ fontSize: wide ? 17 : 15, fontWeight: 800, color: T.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>{title}</p>
                <p style={{ fontSize: 14, color: T.inkMid, margin: 0, lineHeight: 1.65, maxWidth: wide ? 400 : undefined }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: 1, title: 'Create your account', body: "Takes 2 minutes. Just your email and a password. Pick whether you're a farmer, buyer, transporter, or supplier — you can always add more roles later." },
    { n: 2, title: 'Add your details', body: 'Tell us your district and what you grow or buy. Add your phone number so buyers can find you. Get verified with a national ID for higher trust.' },
    { n: 3, title: 'Start trading', body: "List your harvest, make offers, book a delivery. Every payment goes through escrow — your money moves only when both sides are happy." },
  ];

  return (
    <section id="how-it-works" style={{ padding: 'clamp(72px,10vh,100px) clamp(16px,5vw,56px)', background: T.cream2 }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.green, margin: '0 0 12px' }}>Getting started</p>
          <h2 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 900, letterSpacing: '-0.04em', color: T.ink, margin: 0, lineHeight: 1.08 }}>
            Three steps,<br />then you&rsquo;re farming smarter.
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {steps.map(({ n, title, body }, i) => (
            <div key={n} style={{ display: 'flex', gap: 24 }}>
              {/* Step indicator + connector */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 56 }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, flexShrink: 0, background: n === 1 ? T.green : T.white, border: n === 1 ? 'none' : `2px solid ${T.line}`, color: n === 1 ? '#fff' : T.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, letterSpacing: '-0.02em', boxShadow: n === 1 ? '0 8px 24px rgba(22,98,58,0.28)' : 'none', fontFamily: T.font }}>
                  {String(n).padStart(2, '0')}
                </div>
                {i < steps.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 48, marginTop: 6, background: `linear-gradient(180deg, ${T.line}, transparent)` }} />}
              </div>

              {/* Content */}
              <div style={{ paddingBottom: i < steps.length - 1 ? 48 : 0, paddingTop: 12, flex: 1 }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: T.ink, margin: '0 0 8px', letterSpacing: '-0.025em' }}>{title}</p>
                <p style={{ fontSize: 14.5, color: T.inkMid, margin: 0, lineHeight: 1.7 }}>{body}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 52 }}>
          <Link href="/auth/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 13, background: T.green, color: '#fff', fontWeight: 800, fontSize: 15, textDecoration: 'none', boxShadow: '0 10px 28px rgba(22,98,58,0.25)', letterSpacing: '-0.01em' }}>
            Create your account — it&rsquo;s free <ArrowRight size={15} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Trust section (dark) ─────────────────────────────────────────────────────
function TrustSection() {
  const items = [
    {
      icon: <Lock size={20} />,
      title: 'Payment held until delivery',
      body: "When a buyer makes an offer and you accept, their money moves to escrow — not to you, not to them. It only reaches your wallet after the buyer confirms the goods arrived in good condition.",
    },
    {
      icon: <ShieldCheck size={20} />,
      title: 'Every user is verified',
      body: "Farmers, buyers, and transporters all verify with a national ID. You can see a verification badge on every profile before you agree to a deal.",
    },
    {
      icon: <Scale size={20} />,
      title: 'A real person reviews disputes',
      body: "If something goes wrong — wrong quantity, damaged goods, late delivery — you raise a dispute within 48 hours. A human admin reviews it before any money moves.",
    },
  ];

  return (
    <section id="trust" style={{ padding: 'clamp(72px,10vh,100px) clamp(16px,5vw,56px)', background: T.forest, position: 'relative', overflow: 'hidden' }}>
      <div aria-hidden style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 400, background: `radial-gradient(ellipse at center, rgba(77,214,140,0.08) 0%, transparent 70%)`, pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.goldSoft, margin: '0 0 12px', opacity: 0.85 }}>Why people trust us</p>
          <h2 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 900, letterSpacing: '-0.04em', color: '#fff', margin: '0 0 16px', lineHeight: 1.08 }}>
            Your money is protected.<br />Not just promised.
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', margin: '0 auto', maxWidth: 520, lineHeight: 1.7 }}>
            We built AgriNova after watching too many Ugandan farmers get cheated — underpaid, short-changed, or ignored after delivery. These rules exist because of that.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {items.map(({ icon, title, body }) => (
            <div key={title} style={{ padding: '28px 26px', borderRadius: 20, background: T.forest2, border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(77,214,140,0.12)', color: T.greenMint, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>{icon}</div>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: '0 0 10px', letterSpacing: '-0.02em', lineHeight: 1.3 }}>{title}</p>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.7 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Roles ────────────────────────────────────────────────────────────────────
function Roles() {
  const [active, setActive] = useState(0);

  const roles = [
    {
      label: 'Farmers',
      icon: <Leaf size={20} />,
      color: T.green, bg: T.greenSoft,
      headline: "Sell your harvest without a middleman.",
      desc: "List your produce, set your price, and let verified buyers come to you. Your money is held safe until they confirm delivery.",
      points: [
        'See live district prices before you sell',
        'AI crop disease diagnosis in 30 seconds',
        'Cash out to MTN or Airtel Mobile Money',
        'Join farmer groups to sell larger lots',
      ],
      cta: 'Start as a Farmer',
    },
    {
      label: 'Buyers',
      icon: <ShoppingCart size={20} />,
      color: T.gold, bg: T.goldSoft,
      headline: "Source directly from verified farms.",
      desc: "Browse fresh produce from farmers across Uganda. Pay once, track delivery, and receive a refund if anything goes wrong.",
      points: [
        'Browse active listings by district and crop',
        'Escrow holds your money until delivery',
        'Full delivery tracking, farm to gate',
        'See farmer trust scores and verification badges',
      ],
      cta: 'Start as a Buyer',
    },
    {
      label: 'Transporters',
      icon: <Truck size={20} />,
      color: T.sky, bg: T.skySoft,
      headline: "More trips. Guaranteed payment.",
      desc: "Get matched to delivery jobs near you. Accept or decline, set your own availability, and get paid the moment delivery is confirmed.",
      points: [
        'Delivery requests near your location',
        'Payment released when buyer confirms',
        'Cold-chain and fast-delivery options',
        'Build a verified driver profile over time',
      ],
      cta: 'Start as a Transporter',
    },
  ];

  const r = roles[active];

  return (
    <section id="roles" style={{ padding: 'clamp(72px,10vh,100px) clamp(16px,5vw,56px)', background: T.cream }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.green, margin: '0 0 12px' }}>Pick your role</p>
          <h2 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 900, letterSpacing: '-0.04em', color: T.ink, margin: 0, lineHeight: 1.08 }}>One platform for the whole supply chain.</h2>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 14, background: T.cream2, border: `1px solid ${T.line}`, marginBottom: 24 }}>
          {roles.map((role, i) => (
            <button key={role.label} onClick={() => setActive(i)} style={{ flex: 1, padding: '11px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: T.font, fontWeight: 800, fontSize: 'clamp(12px,2.5vw,14px)', transition: 'all 0.2s ease', background: active === i ? T.white : 'transparent', color: active === i ? role.color : T.inkMute, boxShadow: active === i ? '0 2px 8px rgba(17,24,22,0.08)' : 'none' }}>
              {role.label}
            </button>
          ))}
        </div>

        {/* Role card */}
        <div key={active} className="landing-role-card" style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 22, padding: 'clamp(24px,4vw,36px)', boxShadow: '0 16px 48px rgba(17,24,22,0.08)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 15, background: r.bg, color: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{r.icon}</div>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 900, color: T.ink, margin: '0 0 6px', letterSpacing: '-0.025em' }}>{r.headline}</h3>
                <p style={{ fontSize: 14.5, color: T.inkMid, margin: 0, lineHeight: 1.65, maxWidth: 560 }}>{r.desc}</p>
              </div>
            </div>

            <div style={{ height: 1, background: T.line }} />

            {/* Points */}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: '12px 28px' }}>
              {r.points.map(p => (
                <li key={p} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: T.ink, fontWeight: 600, lineHeight: 1.5 }}>
                  <span style={{ width: 20, height: 20, borderRadius: 99, background: r.bg, color: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <Check size={11} strokeWidth={3} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>

            <div>
              <Link href="/auth/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '12px 22px', borderRadius: 11, background: r.color, color: '#fff', fontWeight: 800, fontSize: 14, textDecoration: 'none', boxShadow: `0 8px 20px ${r.color}38`, letterSpacing: '-0.01em' }}>
                {r.cta} <ArrowRight size={14} strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Testimonial / social proof ───────────────────────────────────────────────
function SocialProof() {
  const quotes = [
    { quote: "I used to sell maize at whatever price the trader offered at the gate. Now I can see what Kampala buyers are paying and negotiate from that.", name: 'Auma Florence', role: 'Maize farmer, Soroti', initials: 'AF', color: T.green, bg: T.greenSoft },
    { quote: "The escrow system means I can buy from farmers I've never met before and not worry about paying for goods that never arrive.", name: 'Ssemakula James', role: 'Produce buyer, Kampala', initials: 'SJ', color: T.gold, bg: T.goldSoft },
    { quote: "I get delivery requests on my phone now instead of waiting at the market hoping someone needs a truck. It's a completely different way to work.", name: 'Opio Patrick', role: 'Transporter, Gulu', initials: 'OP', color: T.sky, bg: T.skySoft },
  ];

  return (
    <section style={{ padding: 'clamp(72px,10vh,100px) clamp(16px,5vw,56px)', background: T.cream2 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginBottom: 14 }}>
            {[1,2,3,4,5].map(i => <Star key={i} size={18} fill={T.gold} color={T.gold} />)}
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.4rem)', fontWeight: 900, letterSpacing: '-0.04em', color: T.ink, margin: '0 0 12px', lineHeight: 1.1 }}>From the farmers themselves.</h2>
          <p style={{ fontSize: 15, color: T.inkMid, margin: 0 }}>Real people, real districts, real results.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 20 }}>
          {quotes.map(({ quote, name, role, initials, color, bg }) => (
            <div key={name} style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 20, padding: '28px 26px', boxShadow: '0 2px 16px rgba(17,24,22,0.05)' }}>
              {/* Quote marks */}
              <p style={{ fontSize: 48, lineHeight: 1, color: T.line, margin: '0 0 12px', fontFamily: 'Georgia, serif', fontWeight: 900 }}>&ldquo;</p>
              <p style={{ fontSize: 14.5, color: T.ink, lineHeight: 1.75, margin: '0 0 24px', fontStyle: 'italic' }}>{quote}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{initials}</div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: T.ink, margin: 0 }}>{name}</p>
                  <p style={{ fontSize: 11.5, color: T.inkMute, margin: '2px 0 0' }}>{role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section style={{ padding: 'clamp(80px,12vh,120px) clamp(16px,5vw,56px)', background: T.forest, position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 70% 50% at 50% 50%, rgba(212,136,42,0.12) 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 620, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 99, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', marginBottom: 24 }}>
          <Zap size={13} color={T.gold} strokeWidth={2.5} />
          <span style={{ fontSize: 12, fontWeight: 700, color: T.goldSoft, letterSpacing: '0.06em' }}>Free forever for farmers</span>
        </div>

        <h2 style={{ fontSize: 'clamp(2.2rem,5vw,3.2rem)', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.04, margin: '0 0 20px', color: '#fff' }}>
          The market is moving.<br />
          <span style={{ color: T.greenMint }}>Be on the right side of it.</span>
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', margin: '0 0 38px', lineHeight: 1.7 }}>
          No middlemen taking cuts. No waiting weeks to get paid. Just your farm, your buyers, and a platform that protects both of you.
        </p>

        <Link href="/auth/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '16px 34px', borderRadius: 15, background: '#fff', color: T.greenDeep, fontWeight: 900, fontSize: 16, textDecoration: 'none', boxShadow: '0 16px 40px rgba(0,0,0,0.3)', letterSpacing: '-0.02em' }}>
          Create your free account <ArrowRight size={17} strokeWidth={2.5} />
        </Link>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 16, fontWeight: 600 }}>No card. No contract. Ready in 2 minutes.</p>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: T.cream, borderTop: `1px solid ${T.line}`, padding: 'clamp(40px,6vh,64px) clamp(16px,5vw,56px) 32px' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 40, marginBottom: 48 }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: T.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Leaf size={14} color="#fff" strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 900, color: T.ink, letterSpacing: '-0.025em' }}>AgriNova</span>
            </div>
            <p style={{ fontSize: 13, color: T.inkMute, lineHeight: 1.65, margin: '0 0 16px', maxWidth: 220 }}>Uganda&rsquo;s farm-to-market platform. Free for farmers.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Globe size={13} style={{ color: T.inkMute }} />
              <span style={{ fontSize: 12, color: T.inkMute, fontWeight: 600 }}>Uganda</span>
            </div>
          </div>

          {/* Product */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 800, color: T.ink, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px' }}>Product</p>
            {[['Features','#features'],['How it works','#how-it-works'],['Pricing','/premium'],['For buyers','#roles']].map(([l,h]) => (
              <a key={l} href={h} style={{ display: 'block', fontSize: 13, color: T.inkMid, textDecoration: 'none', marginBottom: 10, fontWeight: 600 }}>{l}</a>
            ))}
          </div>

          {/* Company */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 800, color: T.ink, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px' }}>Company</p>
            {[['Privacy Policy','/privacy'],['Terms of Use','/terms'],['Contact','/contact'],['Support','/farmer/support']].map(([l,h]) => (
              <a key={l} href={h} style={{ display: 'block', fontSize: 13, color: T.inkMid, textDecoration: 'none', marginBottom: 10, fontWeight: 600 }}>{l}</a>
            ))}
          </div>

          {/* App */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 800, color: T.ink, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px' }}>Get the app</p>
            <p style={{ fontSize: 13, color: T.inkMid, lineHeight: 1.6, margin: '0 0 14px' }}>AgriNova works on any smartphone browser — no download needed.</p>
            <Link href="/auth/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 800, padding: '10px 18px', borderRadius: 10, background: T.green, color: '#fff', textDecoration: 'none' }}>
              Open app <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 12, color: T.inkMute, margin: 0 }}>© 2026 AgriNova. Built for Ugandan farmers.</p>
          <p style={{ fontSize: 12, color: T.inkMute, margin: 0 }}>Made with care in Kampala.</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Phone mockup ─────────────────────────────────────────────────────────────
function PhoneMockup() {
  return (
    <div style={{ width: 250, height: 500, background: '#0A150D', borderRadius: 44, border: '8px solid #0F1F13', boxShadow: '0 0 0 1px rgba(22,98,58,0.10), 0 48px 90px rgba(11,35,18,0.32), 0 24px 40px rgba(11,35,18,0.18)', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
      {/* Dynamic island */}
      <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', width: 72, height: 10, background: '#0A150D', borderRadius: 99, zIndex: 10, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)' }} />

      <div style={{ height: '100%', background: '#0F1A10', display: 'flex', flexDirection: 'column' }}>
        {/* Status bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 18px 4px', fontSize: 8, fontWeight: 800, color: 'rgba(245,242,232,0.38)', letterSpacing: '0.04em' }}>
          <span>9:41</span>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <svg width="12" height="9" viewBox="0 0 14 10" fill="rgba(245,242,232,0.38)">
              <rect x="0" y="4" width="2" height="6" rx="0.5"/><rect x="3" y="2.5" width="2" height="7.5" rx="0.5"/>
              <rect x="6" y="1" width="2" height="9" rx="0.5"/><rect x="9" y="0" width="2" height="10" rx="0.5"/>
            </svg>
            <span>100%</span>
          </div>
        </div>

        {/* App content */}
        <div style={{ flex: 1, padding: '10px 16px 0', overflowY: 'hidden' }}>
          <p style={{ fontSize: 9, fontWeight: 800, color: T.greenMint, margin: '0 0 2px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Good afternoon</p>
          <p style={{ fontSize: 18, fontWeight: 900, color: '#F5F2E8', margin: '0 0 16px', letterSpacing: '-0.03em' }}>Namutebi Grace</p>

          {/* Wallet + price cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 10 }}>
            <div style={{ padding: '12px 13px', borderRadius: 14, background: '#122B1A', border: '1px solid rgba(77,214,140,0.15)' }}>
              <p style={{ fontSize: 7.5, fontWeight: 800, color: T.greenMint, margin: '0 0 5px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Wallet</p>
              <p style={{ fontSize: 16, fontWeight: 900, color: '#F5F2E8', margin: 0, letterSpacing: '-0.03em' }}>480K</p>
              <p style={{ fontSize: 7.5, color: 'rgba(245,242,232,0.40)', margin: '2px 0 0', fontWeight: 600 }}>UGX balance</p>
            </div>
            <div style={{ padding: '12px 13px', borderRadius: 14, background: '#2A1F06', border: '1px solid rgba(212,136,42,0.18)' }}>
              <p style={{ fontSize: 7.5, fontWeight: 800, color: T.gold, margin: '0 0 5px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Maize</p>
              <p style={{ fontSize: 16, fontWeight: 900, color: '#F5F2E8', margin: 0, letterSpacing: '-0.03em' }}>+12%</p>
              <p style={{ fontSize: 7.5, color: 'rgba(245,242,232,0.40)', margin: '2px 0 0', fontWeight: 600 }}>Price this week</p>
            </div>
          </div>

          {/* Notification */}
          <div style={{ padding: '10px 12px', borderRadius: 12, marginBottom: 10, background: '#141F10', border: '1px solid rgba(77,214,140,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: T.greenMint, flexShrink: 0, boxShadow: `0 0 6px ${T.greenMint}88` }} />
            <p style={{ fontSize: 9.5, fontWeight: 600, color: '#D3EFDB', margin: 0, lineHeight: 1.35 }}>Buyer offer accepted · 300 kg beans</p>
          </div>

          {/* Weather */}
          <div style={{ padding: '10px 12px', borderRadius: 12, background: '#0D1D28', border: '1px solid rgba(36,113,163,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 7.5, fontWeight: 800, color: '#5BA8D8', margin: '0 0 2px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Weather · Kampala</p>
              <p style={{ fontSize: 9.5, fontWeight: 600, color: '#B9DEF0', margin: 0 }}>Rain expected Thursday</p>
            </div>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5BA8D8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/>
              <line x1="8" y1="19" x2="8" y2="21"/><line x1="8" y1="13" x2="8" y2="15"/>
              <line x1="16" y1="19" x2="16" y2="21"/><line x1="16" y1="13" x2="16" y2="15"/>
              <line x1="12" y1="21" x2="12" y2="23"/><line x1="12" y1="15" x2="12" y2="17"/>
            </svg>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ l: 'Sell', c: T.greenMint, bg: '#122B1A' }, { l: 'Buy', c: T.gold, bg: '#2A1F06' }, { l: 'Doctor', c: '#C084FC', bg: '#211A38' }].map(({ l, c, bg }) => (
              <div key={l} style={{ flex: 1, padding: '9px 4px', borderRadius: 11, background: bg, textAlign: 'center' }}>
                <p style={{ fontSize: 9, fontWeight: 800, color: c, margin: 0 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{ padding: '10px 18px 16px', borderTop: '1px solid rgba(245,242,232,0.05)', background: '#0C1610', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          {[{ label: 'Home', active: true }, { label: 'Market', active: false }, { label: 'Wallet', active: false }, { label: 'More', active: false }].map(({ label, active }) => (
            <div key={label} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 22, height: 3, borderRadius: 99, background: active ? T.greenMint : 'transparent', marginBottom: 2 }} />
              <div style={{ width: 22, height: 16, borderRadius: 6, background: active ? 'rgba(77,214,140,0.16)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 11, height: 9, borderRadius: 3, background: active ? T.greenMint : 'rgba(245,242,232,0.18)' }} />
              </div>
              <p style={{ fontSize: 7, fontWeight: active ? 800 : 500, color: active ? T.greenMint : 'rgba(245,242,232,0.28)', margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div style={{ background: T.cream, color: T.ink, fontFamily: T.font, overflowX: 'hidden' }}>
      <Nav />
      <Hero />
      <TrustBar />
      <Features />
      <HowItWorks />
      <TrustSection />
      <Roles />
      <SocialProof />
      <FinalCTA />
      <Footer />
    </div>
  );
}
