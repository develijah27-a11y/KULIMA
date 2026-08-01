'use client';

import React from 'react';
import Link from 'next/link';
import { useState } from 'react';
import {
  Check, Zap, Building2, Crown, Leaf,
  Headphones, Star,
  ArrowRight, Shield,
} from 'lucide-react';

const GREEN      = 'var(--color-primary)';
const GREENMED   = 'var(--color-primary-hover)';
const AMBER      = 'var(--color-harvest)';
const BLUE       = 'var(--color-sky)';
const PURPLE     = 'var(--color-purple)';
const TEXT       = 'var(--d-text)';
const MUTED      = 'var(--d-muted)';
const BORDER     = 'var(--d-border)';
const CARD       = 'var(--d-card)';
const SHADOW     = 'var(--d-shadow-card)';
const PAGE       = 'var(--d-page)';

type Cycle = 'monthly' | 'yearly';

interface Plan {
  id: string;
  name: string;
  tagline: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  targetRoles: string;
  badge?: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlighted?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Core features, always free for farmers.',
    icon: <Leaf size={22} />,
    color: GREEN,
    bg: 'var(--color-primary-bg)',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'UGX',
    targetRoles: 'Farmers, Buyers',
    features: [
      'List up to 3 crops at a time',
      'Live market prices',
      'Basic weather forecast',
      'AI crop doctor (5 scans/month)',
      'Buyer offers & chat',
      'Wallet & mobile money',
      'Standard support',
    ],
    cta: 'Get started free',
    ctaHref: '/auth/signup',
  },
  {
    id: 'farmer-pro',
    name: 'Farmer Pro',
    tagline: 'AI insights, unlimited listings, priority support.',
    icon: <Zap size={22} />,
    color: AMBER,
    bg: 'var(--color-harvest-bg)',
    monthlyPrice: 15000,
    yearlyPrice: 144000,
    currency: 'UGX',
    targetRoles: 'Farmers',
    badge: 'Most popular',
    highlighted: true,
    features: [
      'Everything in Free',
      'Unlimited crop listings',
      'Unlimited AI crop doctor scans',
      'Advanced AI disease insights & history',
      'Detailed farm analytics & reports',
      'Planting calendar with SMS reminders',
      'Loan pre-qualification score',
      'Priority in buyer search results',
      'Priority support (response within 4 h)',
    ],
    cta: 'Start Farmer Pro',
    ctaHref: '/farmer/premium',
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'For agro-dealers, buyers, and growing operations.',
    icon: <Building2 size={22} />,
    color: BLUE,
    bg: 'var(--color-sky-bg)',
    monthlyPrice: 50000,
    yearlyPrice: 480000,
    currency: 'UGX',
    targetRoles: 'Suppliers, Buyers',
    features: [
      'Everything in Farmer Pro',
      'Staff accounts (up to 5 users)',
      'Full inventory management',
      'Demand & coverage analytics',
      'Bulk order management',
      'Sales & revenue reports',
      'Customer relationship tools',
      'Featured placement in marketplace',
      'Priority support (response within 2 h)',
    ],
    cta: 'Start Business',
    ctaHref: '/supplier/premium',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For cooperatives, exporters, and large agribusiness.',
    icon: <Crown size={22} />,
    color: PURPLE,
    bg: 'var(--color-purple-bg)',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'UGX',
    targetRoles: 'Cooperatives, Exporters',
    features: [
      'Everything in Business',
      'Unlimited staff accounts',
      'Cooperative & group management tools',
      'Export documentation assistance',
      'Custom reporting & dashboards',
      'Dedicated account manager',
      'SLA-backed uptime guarantee',
      'API access for integrations',
      'Onboarding & training sessions',
    ],
    cta: 'Contact us',
    ctaHref: '/contact',
  },
];

function fmt(ugx: number) {
  if (ugx === 0) return 'Free';
  if (ugx >= 1000) return `UGX ${(ugx / 1000).toFixed(0)}K`;
  return `UGX ${ugx.toLocaleString()}`;
}

function PlanCard({ plan, cycle }: { plan: Plan; cycle: Cycle }) {
  const price = cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  const isEnterprise = plan.id === 'enterprise';
  const isFree = plan.id === 'free';

  return (
    <div style={{
      background: plan.highlighted ? plan.color : CARD,
      borderRadius: 20,
      boxShadow: plan.highlighted ? `0 16px 40px ${plan.color}30, ${SHADOW}` : SHADOW,
      border: `2px solid ${plan.highlighted ? plan.color : BORDER}`,
      padding: '28px 24px',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      transition: 'transform 150ms ease, box-shadow 150ms ease',
    }}>
      {plan.badge && (
        <span style={{
          position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
          fontSize: 11, fontWeight: 800, padding: '3px 14px', borderRadius: 99,
          background: '#fff', color: plan.color, border: `2px solid ${plan.color}`,
          whiteSpace: 'nowrap',
        }}>
          {plan.badge}
        </span>
      )}

      {/* Icon + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 13,
          background: plan.highlighted ? 'rgba(255,255,255,0.2)' : plan.bg,
          color: plan.highlighted ? '#fff' : plan.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {plan.icon}
        </div>
        <div>
          <p style={{ fontSize: 17, fontWeight: 900, color: plan.highlighted ? '#fff' : TEXT, margin: 0, letterSpacing: '-0.025em' }}>{plan.name}</p>
          <p style={{ fontSize: 10, fontWeight: 700, color: plan.highlighted ? 'rgba(255,255,255,0.65)' : MUTED, margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{plan.targetRoles}</p>
        </div>
      </div>

      {/* Price */}
      <div style={{ marginBottom: 16 }}>
        {isEnterprise ? (
          <p style={{ fontSize: 26, fontWeight: 900, color: plan.highlighted ? '#fff' : plan.color, letterSpacing: '-0.03em', margin: 0 }}>Custom</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <p style={{ fontSize: 30, fontWeight: 900, color: plan.highlighted ? '#fff' : plan.color, letterSpacing: '-0.03em', margin: 0 }}>
              {isFree ? 'Free' : fmt(price)}
            </p>
            {!isFree && !isEnterprise && (
              <span style={{ fontSize: 12, fontWeight: 600, color: plan.highlighted ? 'rgba(255,255,255,0.65)' : MUTED }}>
                /{cycle === 'yearly' ? 'yr' : 'mo'}
              </span>
            )}
          </div>
        )}
        {cycle === 'yearly' && !isFree && !isEnterprise && (
          <p style={{ fontSize: 11, color: plan.highlighted ? 'rgba(255,255,255,0.7)' : MUTED, margin: '4px 0 0', fontWeight: 600 }}>
            Saves {fmt(plan.monthlyPrice * 12 - plan.yearlyPrice)} vs monthly
          </p>
        )}
        <p style={{ fontSize: 12, color: plan.highlighted ? 'rgba(255,255,255,0.7)' : MUTED, margin: '6px 0 0', lineHeight: 1.5 }}>{plan.tagline}</p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: plan.highlighted ? 'rgba(255,255,255,0.18)' : BORDER, marginBottom: 16 }} />

      {/* Features */}
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
        {plan.features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, color: plan.highlighted ? 'rgba(255,255,255,0.88)' : TEXT, lineHeight: 1.45 }}>
            <span style={{
              width: 18, height: 18, borderRadius: 99, flexShrink: 0,
              background: plan.highlighted ? 'rgba(255,255,255,0.25)' : plan.bg,
              color: plan.highlighted ? '#fff' : plan.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
            }}>
              <Check size={10} strokeWidth={3} />
            </span>
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link href={plan.ctaHref} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        padding: '13px 20px', borderRadius: 12, fontWeight: 800, fontSize: 14,
        textDecoration: 'none', marginTop: 'auto',
        background: plan.highlighted ? '#fff' : plan.color,
        color: plan.highlighted ? plan.color : '#fff',
        boxShadow: plan.highlighted ? 'none' : `0 6px 16px ${plan.color}30`,
      }}>
        {plan.cta} {!isEnterprise && <ArrowRight size={14} strokeWidth={2.5} />}
      </Link>
    </div>
  );
}

export default function PremiumPage() {
  const [cycle, setCycle] = useState<Cycle>('monthly');

  return (
    <div style={{ background: PAGE, minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(var(--d-page-rgb, 248,250,252), 0.9)',
        backdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${BORDER}`,
        padding: '0 clamp(16px,5vw,64px)', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Leaf size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 900, color: TEXT, letterSpacing: '-0.02em' }}>AgriNova</span>
        </Link>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/dashboard" style={{ fontSize: 13, fontWeight: 700, color: MUTED, textDecoration: 'none', padding: '8px 12px' }}>Dashboard</Link>
          <Link href="/auth/signup" style={{ fontSize: 13, fontWeight: 800, padding: '8px 18px', borderRadius: 10, background: GREEN, color: '#fff', textDecoration: 'none' }}>Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: 'clamp(48px,8vh,80px) clamp(16px,5vw,64px) 40px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 99, background: 'var(--color-primary-bg)', marginBottom: 20 }}>
          <Crown size={13} style={{ color: GREEN }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: GREEN, letterSpacing: '0.06em', textTransform: 'uppercase' }}>AgriNova Premium</span>
        </div>
        <h1 style={{ fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 900, letterSpacing: '-0.04em', color: TEXT, margin: '0 0 16px', lineHeight: 1.05 }}>
          Grow faster with the<br />
          <span style={{ color: GREEN }}>right plan</span>
        </h1>
        <p style={{ fontSize: 'clamp(14px,1.8vw,17px)', color: MUTED, maxWidth: 520, margin: '0 auto 32px', lineHeight: 1.7 }}>
          From smallholder farmers to large cooperatives — pick the plan that fits
          your operation. Upgrade, downgrade, or cancel any time.
        </p>

        {/* Billing cycle toggle */}
        <div style={{ display: 'inline-flex', background: 'var(--color-surface-2)', borderRadius: 12, padding: 3, gap: 2, border: `1px solid ${BORDER}` }}>
          {(['monthly', 'yearly'] as Cycle[]).map(c => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              style={{
                padding: '8px 20px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 13, transition: 'all 120ms ease',
                background: cycle === c ? CARD : 'transparent',
                color: cycle === c ? TEXT : MUTED,
                boxShadow: cycle === c ? SHADOW : 'none',
              }}
            >
              {c === 'monthly' ? 'Monthly' : 'Yearly'}
              {c === 'yearly' && (
                <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 99, background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                  Save 20%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plans grid */}
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        padding: '0 clamp(16px,5vw,40px) 60px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 20,
        alignItems: 'start',
      }}>
        {PLANS.map(plan => <PlanCard key={plan.id} plan={plan} cycle={cycle} />)}
      </div>

      {/* Trust section */}
      <div style={{ background: 'var(--color-primary-bg)', borderTop: `1px solid ${BORDER}`, padding: 'clamp(40px,6vh,64px) clamp(16px,5vw,64px)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 24 }}>
          {[
            { icon: <Shield size={20} />, title: 'Cancel any time', body: 'No lock-in. Downgrade or cancel from your settings page instantly.' },
            { icon: <Headphones size={20} />, title: 'Priority support', body: 'Paid plans get faster response times. Enterprise gets a dedicated manager.' },
            { icon: <Star size={20} />, title: 'Secure payments', body: 'All subscription payments go through the same escrow-protected wallet system.' },
          ].map(({ icon, title, body }) => (
            <div key={title} style={{ display: 'flex', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--color-primary-bg)', color: GREEN, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {icon}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: TEXT, margin: '0 0 4px' }}>{title}</p>
                <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.55 }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ padding: '20px clamp(16px,5vw,64px)', borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontSize: 12, color: MUTED }}>© 2026 AgriNova. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          {[['Privacy', '/privacy'], ['Terms', '/terms'], ['Contact', '/contact']].map(([l, h]) => (
            <Link key={l} href={h} style={{ fontSize: 12, color: MUTED, textDecoration: 'none' }}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}

