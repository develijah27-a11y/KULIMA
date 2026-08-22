'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { PLANS } from '@/lib/subscriptions/plans';
import { AppIcon } from '@/components/ui/AppIcon';
import { Wordmark } from '@/components/ui/Wordmark';
import {
  ArrowRight, Check, TrendingUp, Users, Microscope, Leaf, ShoppingCart,
  Truck, ShieldCheck, Lock, Scale, Star, Zap, Store, Wallet,
} from 'lucide-react';
import {
  PAPER, PAPER_2, INK, INK_MID, INK_MUTE, LINE, CARD,
  GREEN, GREEN_DEEP, GREEN_SOFT, FOREST, FOREST_2, MINT,
  GOLD, GOLD_SOFT, SKY, SKY_SOFT, PLUM, PLUM_SOFT,
  FONT, HEAD_FONT, MONO_FONT,
} from './landing-tokens';

/* Everything below the hero fold — code-split out of page.tsx via
   next/dynamic so this JS isn't part of the bundle needed to paint and
   hydrate the above-the-fold Nav/Hero. Still server-rendered (dynamic's
   ssr:true default), so there's no content/SEO regression — only the
   bundle is split, not the HTML. */

/* ─── Why Cropify (old way vs new way) ──────────────────────────────────── */
function WhyDifferent() {
  const rows = [
    { old: 'Whatever price shows up at your gate', now: 'Live district prices before you harvest' },
    { old: 'Trust a stranger to pay you back', now: 'Payment held in escrow, always' },
    { old: 'Days to diagnose a sick crop', now: 'AI diagnosis in 30 seconds' },
  ];
  return (
    <section style={{ padding: 'clamp(56px,8vh,80px) clamp(16px,5vw,60px)', background: PAPER, fontFamily: FONT }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN, margin: '0 0 12px' }}>The difference</p>
          <h2 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 700, fontFamily: HEAD_FONT, letterSpacing: '-0.04em', color: INK, margin: 0, lineHeight: 1.06 }}>
            The old way, versus Cropify.
          </h2>
        </div>

        <div className="landing-card-hover why-different" style={{ borderRadius: 22, background: CARD, border: `1px solid ${LINE}`, boxShadow: '0 20px 50px rgba(15,31,21,0.06)', overflow: 'hidden' }}>
          <div className="why-different-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${LINE}`, borderRight: `1px solid ${LINE}` }}>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: INK_MUTE, margin: 0 }}>Before</p>
            </div>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${LINE}`, background: GREEN_SOFT }}>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: GREEN_DEEP, margin: 0 }}>With Cropify</p>
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
    { icon: <Wallet size={22}/>, title: 'Escrow-protected payments', body: 'Every shilling held safe until you confirm delivery.', color: GREEN, bg: GREEN_SOFT, wide: true },
    { icon: <TrendingUp size={22}/>, title: 'Live district prices', body: 'Know today’s rate before you harvest.', color: GOLD, bg: GOLD_SOFT },
    { icon: <Microscope size={22}/>, title: 'AI Crop Doctor', body: 'Photo in, diagnosis in 30 seconds.', color: PLUM, bg: PLUM_SOFT },
    { icon: <Users size={22}/>, title: 'Farmer groups', body: 'Pool harvests, sell as one big lot.', color: SKY, bg: SKY_SOFT },
  ];

  return (
    <section id="features" style={{ padding: 'clamp(56px,8vh,80px) clamp(16px,5vw,60px)', background: PAPER, fontFamily: FONT }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        {/* Section header */}
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN, margin: '0 0 12px' }}>What you get</p>
          <h2 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 700, fontFamily: HEAD_FONT, letterSpacing: '-0.04em', color: INK, margin: 0, lineHeight: 1.06 }}>
            Everything you need. Nothing you don&rsquo;t.
          </h2>
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
    { n: '01', title: 'Create your account', body: 'Free, in under 2 minutes.' },
    { n: '02', title: 'Verify your profile', body: 'National ID, unlocks higher limits.' },
    { n: '03', title: 'Start trading', body: 'Every payment protected by escrow.' },
  ];

  return (
    <section id="how-it-works" style={{ padding: 'clamp(56px,8vh,80px) clamp(16px,5vw,60px)', background: PAPER_2, fontFamily: FONT }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN, margin: '0 0 12px' }}>Simple to start</p>
          <h2 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 700, fontFamily: HEAD_FONT, letterSpacing: '-0.04em', color: INK, margin: 0, lineHeight: 1.06 }}>
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
    { icon: <Lock size={20}/>, title: 'Money held in escrow', body: 'Released only after you confirm delivery.', stamp: 'Escrow Protected' },
    { icon: <ShieldCheck size={20}/>, title: 'Every user is verified', body: 'National ID required before anyone can trade.', stamp: 'ID Verified' },
    { icon: <Scale size={20}/>, title: 'Disputes reviewed by a person', body: 'A real admin, not a bot, decides.', stamp: 'Human Reviewed' },
  ];

  // Ink-stamp seals reveal on scroll rather than on page load — they read
  // as "stamped just now" the moment this section enters view. A single
  // observer on the section is enough (all three reveal together); no
  // JS animation loop, just a class toggle, so reduced-motion users simply
  // see them appear with no transition (handled in CSS below).
  const [revealed, setRevealed] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setRevealed(true); obs.disconnect(); }
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="trust" ref={sectionRef} style={{ padding: 'clamp(48px,7vh,64px) clamp(16px,5vw,60px)', background: FOREST, position: 'relative', overflow: 'hidden', fontFamily: FONT }}>
      <div aria-hidden style={{ position: 'absolute', top: '12%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 400, background: `radial-gradient(ellipse at center,rgba(95,224,160,0.09) 0%,transparent 70%)`, pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, margin: '0 0 12px', opacity: 0.9 }}>Your money is safe here</p>
          <h2 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 700, fontFamily: HEAD_FONT, letterSpacing: '-0.04em', color: '#fff', margin: '0 0 16px', lineHeight: 1.06 }}>
            Real protection. Not a promise.
          </h2>
          <p style={{ fontSize: 15.5, color: 'rgba(255,255,255,0.58)', margin: '0 auto', maxWidth: 540, lineHeight: 1.72 }}>
            Built after watching too many farmers get cheated. Never again.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
          {items.map(({ icon, title, body, stamp }, i) => (
            <div key={title} className="landing-card-hover" style={{ padding: '28px 26px', borderRadius: 20, background: FOREST_2, border: '1px solid rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}>
              {/* Ink-stamp seal — ties the marketing site to the same
                  trust-through-documentation language as the app's own
                  delivery receipts. Reveals with a stamped-down motion when
                  this section scrolls into view; reduced-motion users get
                  it instantly with no transition. */}
              <div
                aria-hidden
                className="trust-stamp"
                style={{
                  position: 'absolute', top: 16, right: -6, zIndex: 1,
                  width: 84, height: 84, borderRadius: '50%',
                  border: `1.5px solid ${MINT}`, boxShadow: `inset 0 0 0 3px ${FOREST_2}, inset 0 0 0 4px rgba(95,224,160,0.35)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                  transform: revealed ? 'rotate(-9deg) scale(1)' : 'rotate(-9deg) scale(0.5)',
                  opacity: revealed ? 0.9 : 0,
                  transition: `opacity 0.4s ease ${i * 120}ms, transform 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 120}ms`,
                }}
              >
                <span style={{ fontFamily: HEAD_FONT, fontSize: 9, fontWeight: 700, color: MINT, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.25, padding: '0 8px' }}>
                  {stamp}
                </span>
              </div>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(95,224,160,0.13)', color: MINT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, position: 'relative', zIndex: 2 }}>{icon}</div>
              <p style={{ fontSize: 15.5, fontWeight: 800, color: '#fff', margin: '0 0 10px', letterSpacing: '-0.015em', lineHeight: 1.3, position: 'relative', zIndex: 2 }}>{title}</p>
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.56)', margin: 0, lineHeight: 1.7, position: 'relative', zIndex: 2, maxWidth: '82%' }}>{body}</p>
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
      label: 'Farmers', tab: 'Farmers', icon: <Leaf size={22}/>, color: GREEN, bg: GREEN_SOFT,
      tagline: 'Sell direct. Get paid safely.',
      points: ['Live district prices', 'Verified buyers only', 'AI diagnosis in 30s', 'Cash out to Mobile Money'],
    },
    {
      label: 'Buyers', tab: 'Buyers', icon: <ShoppingCart size={22}/>, color: GOLD, bg: GOLD_SOFT,
      tagline: 'Source produce direct from farms.',
      points: ['Verified farmer listings', 'Escrow until delivery', 'Farm-to-gate tracking', '48-hour dispute cover'],
    },
    {
      label: 'Transporters', tab: 'Drivers', icon: <Truck size={22}/>, color: SKY, bg: SKY_SOFT,
      tagline: 'More trips. Guaranteed payment.',
      points: ['Jobs matched near you', 'Paid on confirmation', 'Cold-chain options', 'Build a driver profile'],
    },
    {
      label: 'Agro Dealers', tab: 'Dealers', icon: <Store size={22}/>, color: PLUM, bg: PLUM_SOFT,
      tagline: 'Run your shop, reach every farmer.',
      points: ['Full POS checkout', 'List on the marketplace', 'Low-stock alerts', 'Sales & profit reports'],
    },
  ];

  const r = roles[active];

  return (
    <section id="roles" style={{ padding: 'clamp(48px,7vh,64px) clamp(16px,5vw,60px)', background: PAPER, fontFamily: FONT }}>
      <div style={{ maxWidth: 940, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN, margin: '0 0 12px' }}>Who it&rsquo;s for</p>
          <h2 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 700, fontFamily: HEAD_FONT, letterSpacing: '-0.04em', color: INK, margin: '0 0 12px', lineHeight: 1.06 }}>One platform for every link in the chain.</h2>
          <p style={{ fontSize: 14, color: INK_MUTE, margin: 0 }}>One account, every role you need — pick any (or all) on signup.</p>
        </div>

        {/* Honest disclosure — rather than an inflated "7 roles" headline
            stat, say plainly that this is a sample and where the rest are. */}
        <p style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: INK_MUTE, letterSpacing: '0.02em', margin: '0 0 16px' }}>
          4 roles shown · 3 more inside the app (cooperatives, offtakers, crop pathologists) — <Link href="/auth/signup" style={{ color: GREEN, fontWeight: 800 }}>see them all on signup</Link>
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 14, background: PAPER_2, border: `1px solid ${LINE}`, marginBottom: 22 }}>
          {roles.map((role, i) => (
            <button key={role.label} onClick={() => setActive(i)} style={{ flex: 1, minWidth: 0, padding: 'clamp(9px,2vw,12px) 4px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: FONT, fontWeight: 800, fontSize: 'clamp(11px,2.4vw,14px)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'all 0.18s ease', background: active === i ? CARD : 'transparent', color: active === i ? role.color : INK_MUTE, boxShadow: active === i ? '0 2px 8px rgba(15,31,21,0.08)' : 'none' }}>
              {role.tab}
            </button>
          ))}
        </div>

        {/* Role card */}
        <div key={active} className="landing-role-card" style={{ padding: 'clamp(22px,4vw,34px)', borderRadius: 22, background: CARD, border: `1px solid ${LINE}`, boxShadow: '0 20px 50px rgba(15,31,21,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: r.bg, color: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{r.icon}</div>
            <div>
              <h3 style={{ fontSize: 19, fontWeight: 700, fontFamily: HEAD_FONT, color: INK, letterSpacing: '-0.025em', margin: 0 }}>{r.label}</h3>
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
    { quote: "Now I see what Kampala buyers are paying and negotiate from that.", name: 'Auma Florence', role: 'Maize farmer, Soroti', initials: 'AF', color: GREEN, bg: GREEN_SOFT },
    { quote: "I buy from farmers I've never met, without worrying about a no-show.", name: 'Ssemakula James', role: 'Produce buyer, Kampala', initials: 'SJ', color: GOLD, bg: GOLD_SOFT },
    { quote: "Delivery requests come straight to my phone now — no more waiting at the stage.", name: 'Opio Patrick', role: 'Transporter, Gulu', initials: 'OP', color: SKY, bg: SKY_SOFT },
  ];

  return (
    <section style={{ padding: 'clamp(40px,6vh,56px) clamp(16px,5vw,60px)', background: PAPER_2, fontFamily: FONT }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginBottom: 14 }}>
            {[1,2,3,4,5].map(i => <Star key={i} size={18} fill={GOLD} color={GOLD} />)}
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.4rem)', fontWeight: 700, fontFamily: HEAD_FONT, letterSpacing: '-0.04em', color: INK, margin: '0 0 10px', lineHeight: 1.08 }}>
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

/* ─── Pricing ─────────────────────────────────────────────────────────────
   Pulled straight from the same PLANS config the app's own /premium pages
   and checkout use — one source of truth, so the landing page can never
   quote a stale price. Farmer Pro is the featured/middle card since
   farmers are the platform's free-forever core audience — Pro is the
   first upsell most visitors will actually consider. */
function Pricing() {
  const cards = [
    { plan: PLANS.farmer_pro, role: 'Farmer', featured: true },
    { plan: PLANS.buyer_pro, role: 'Buyer', featured: false },
    { plan: PLANS.driver_pro, role: 'Transporter', featured: false },
    { plan: PLANS.business, role: 'Agro Dealer', featured: false },
  ];

  return (
    <section id="pricing" style={{ padding: 'clamp(48px,7vh,64px) clamp(16px,5vw,60px)', background: PAPER_2, fontFamily: FONT }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN, margin: '0 0 12px' }}>Simple, honest pricing</p>
          <h2 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 700, fontFamily: HEAD_FONT, letterSpacing: '-0.04em', color: INK, margin: '0 0 12px', lineHeight: 1.06 }}>
            Free to start. Upgrade when it pays for itself.
          </h2>
          <p style={{ fontSize: 14, color: INK_MUTE, margin: 0 }}>Every role has a free tier — Pro plans below are entirely optional.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 16, alignItems: 'stretch' }}>
          {cards.map(({ plan, role, featured }) => (
            <div key={plan.id} style={{
              padding: '26px 22px', borderRadius: 20, background: featured ? FOREST : CARD,
              border: featured ? `1px solid ${FOREST_2}` : `1px solid ${LINE}`,
              boxShadow: featured ? '0 20px 50px rgba(13,43,24,0.24)' : '0 2px 10px rgba(15,31,21,0.04)',
              position: 'relative', display: 'flex', flexDirection: 'column',
              transform: featured ? 'scale(1.04)' : 'none',
            }}>
              {featured && (
                <span style={{ position: 'absolute', top: -12, left: 22, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: FOREST, background: MINT, padding: '4px 12px', borderRadius: 999 }}>
                  Most popular
                </span>
              )}
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: featured ? 'rgba(255,255,255,0.55)' : INK_MUTE, margin: '4px 0 6px' }}>{role}</p>
              <p style={{ fontSize: 19, fontWeight: 800, color: featured ? '#fff' : INK, margin: '0 0 14px', letterSpacing: '-0.02em' }}>{plan.label}</p>
              <p style={{ margin: '0 0 4px', display: 'flex', alignItems: 'baseline', gap: 5, fontFamily: MONO_FONT }}>
                <span style={{ fontSize: 28, fontWeight: 600, color: featured ? MINT : INK, letterSpacing: '-0.02em' }}>
                  {plan.priceMonthlyUgx > 0 ? plan.priceMonthlyUgx.toLocaleString() : 'Free'}
                </span>
                {plan.priceMonthlyUgx > 0 && <span style={{ fontSize: 12.5, color: featured ? 'rgba(255,255,255,0.5)' : INK_MUTE }}>UGX/mo</span>}
              </p>
              <p style={{ fontSize: 12, color: featured ? 'rgba(255,255,255,0.45)' : INK_MUTE, margin: '0 0 22px' }}>
                or {plan.priceYearlyUgx.toLocaleString()} UGX/yr
              </p>
              <div style={{ flex: 1 }} />
              <Link href="/auth/signup" style={{
                display: 'block', textAlign: 'center', padding: '11px', borderRadius: 11, textDecoration: 'none',
                fontWeight: 800, fontSize: 13.5, letterSpacing: '-0.01em',
                background: featured ? MINT : GREEN_SOFT, color: featured ? FOREST : GREEN_DEEP,
              }}>
                Get started
              </Link>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: 12.5, color: INK_MUTE, marginTop: 28 }}>
          Groups/cooperatives and Enterprise agro-dealer pricing are quoted separately — <Link href="/premium" style={{ color: GREEN, fontWeight: 700 }}>see the full plan list</Link>.
        </p>
      </div>
    </section>
  );
}

/* ─── Final CTA ───────────────────────────────────────────────────────────── */
function FinalCTA() {
  return (
    <section style={{ padding: 'clamp(56px,8vh,80px) clamp(16px,5vw,60px)', background: FOREST, position: 'relative', overflow: 'hidden', textAlign: 'center', fontFamily: FONT }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 70% 55% at 50% 50%,rgba(231,167,61,0.13) 0%,transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 99, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', marginBottom: 24 }}>
          <Zap size={13} color={GOLD} strokeWidth={2.5} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,247,230,0.85)', letterSpacing: '0.06em' }}>Free forever for farmers</span>
        </div>

        <h2 style={{ fontSize: 'clamp(2.2rem,5vw,3.2rem)', fontWeight: 700, fontFamily: HEAD_FONT, letterSpacing: '-0.048em', lineHeight: 1.04, margin: '0 0 20px', color: '#fff' }}>
          Ready to grow <span style={{ color: MINT }}>smarter?</span>
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.58)', margin: '0 0 30px', lineHeight: 1.6, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
          Join farmers, buyers, and transporters getting paid safely, every time.
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
              <AppIcon size={28} rounded={8} />
              <Wordmark color={INK} style={{ fontSize: 15 }} />
            </div>
            <p style={{ fontSize: 13, color: INK_MUTE, lineHeight: 1.65, margin: '0 0 14px', maxWidth: 210 }}>Uganda&rsquo;s farm-to-market platform. Free for farmers, always.</p>
          </div>

          {/* Product */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: INK, textTransform: 'uppercase', letterSpacing: '0.10em', margin: '0 0 16px' }}>Product</p>
            {[['Features','#features'],['How it works','#how-it-works'],['Pricing','#pricing'],['For buyers','#roles']].map(([l,h]) => (
              <a key={l} href={h} style={{ display: 'block', fontSize: 13, color: INK_MUTE, textDecoration: 'none', marginBottom: 10, fontWeight: 600 }}>{l}</a>
            ))}
          </div>

          {/* Company */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: INK, textTransform: 'uppercase', letterSpacing: '0.10em', margin: '0 0 16px' }}>Company</p>
            {[['About','/about'],['How Cropify Works','/how-it-works'],['Privacy','/privacy'],['Terms','/terms'],['Refund Policy','/refund-policy'],['FAQ','/faq'],['Contact','/contact'],['Support','/farmer/support']].map(([l,h]) => (
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
          <p style={{ fontSize: 12, color: INK_MUTE, margin: 0 }}>© 2026 Cropify. All rights reserved.</p>
          <p style={{ fontSize: 12, color: INK_MUTE, margin: 0 }}>Built for Ugandan farmers.</p>
        </div>
      </div>
    </footer>
  );
}

export default function LandingBelowFold() {
  return (
    <>
      <WhyDifferent />
      <Features />
      <HowItWorks />
      <TrustSection />
      <RolesSection />
      <Testimonials />
      <Pricing />
      <FinalCTA />
      <Footer />
    </>
  );
}
