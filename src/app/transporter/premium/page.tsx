import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Check, Zap, Crown, ArrowRight, Shield } from 'lucide-react';
import { getEffectiveTier } from '@/lib/subscriptions/getEffectiveTier';
import { PLANS, priceFor } from '@/lib/subscriptions/plans';
import { SubscribeButton } from '@/components/subscriptions/SubscribeButton';
import { CancelSubscriptionButton } from '@/components/subscriptions/CancelSubscriptionButton';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  card: 'var(--d-card)', shadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', purple: 'var(--color-purple)',
} as const;

const DRIVER_PRO_FEATURES = [
  'Priority job matching over Free-tier drivers',
  'Route optimization for multi-stop jobs',
  'Detailed earnings analytics & trends',
  'Faster payout on delivery confirmation',
  'Priority support — response within 4 hours',
];

export default async function TransporterPremiumPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, roles, subscription_tier, role_subscription_tiers')
    .eq('user_id', user.id)
    .single();

  const currentTier = getEffectiveTier(profile as any, 'transporter');
  const isAlreadyPro = currentTier !== 'free';
  const plan = PLANS.driver_pro;

  const { data: activeSub } = isAlreadyPro
    ? await (supabase.from as any)('subscriptions')
        .select('id').eq('role', 'transporter').eq('status', 'active').maybeSingle()
    : { data: null };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: '-0.03em', margin: 0, fontFamily: "'Poppins','Inter',system-ui,sans-serif" }}>
          Upgrade to Driver Pro
        </h1>
        <p style={{ fontSize: 13, color: C.muted, margin: '6px 0 0' }}>
          Get matched to jobs first and see exactly what you're earning.
        </p>
      </div>

      {isAlreadyPro && (
        <div style={{ padding: '14px 18px', borderRadius: 14, background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Check size={20} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-success)', margin: 0 }}>
              You are already on the {currentTier.replace(/_/g, ' ')} plan. Enjoy!
            </p>
          </div>
          {activeSub && <CancelSubscriptionButton subscriptionId={activeSub.id} />}
        </div>
      )}

      <div style={{ background: C.purple, borderRadius: 20, padding: '28px 24px', boxShadow: `0 16px 40px ${C.purple}30, ${C.shadow}`, position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={22} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>{plan.label}</p>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: '2px 0 0' }}>For active delivery drivers</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
          <span style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em' }}>UGX {(plan.priceMonthlyUgx / 1000).toFixed(0)}K</span>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>/month</span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: '0 0 20px' }}>
          Or UGX {(plan.priceYearlyUgx / 1000).toFixed(0)}K/year — saves UGX {(plan.priceMonthlyUgx * 12 - plan.priceYearlyUgx).toLocaleString()} (20%)
        </p>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.2)', marginBottom: 20 }} />

        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DRIVER_PRO_FEATURES.map(f => (
            <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 1.45 }}>
              <span style={{ width: 18, height: 18, borderRadius: 99, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <Check size={10} color="#fff" strokeWidth={3} />
              </span>
              {f}
            </li>
          ))}
        </ul>

        {!isAlreadyPro && (
          <SubscribeButton
            planId="driver_pro"
            billingCycle="monthly"
            label={`Subscribe — UGX ${(priceFor(plan, 'monthly') / 1000).toFixed(0)}K/month`}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              background: '#fff', color: C.purple, fontWeight: 900, fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            }}
          />
        )}
      </div>

      {!isAlreadyPro && (
        <div style={{ background: C.card, borderRadius: 16, boxShadow: C.shadow, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Crown size={20} style={{ color: 'var(--color-success)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }}>Annual plan — save 20%</p>
            <p style={{ fontSize: 12, color: C.muted, margin: '3px 0 0' }}>
              Pay UGX {(plan.priceYearlyUgx).toLocaleString()}/year instead of UGX {(plan.priceMonthlyUgx * 12).toLocaleString()}. Cancel anytime.
            </p>
          </div>
          <SubscribeButton
            planId="driver_pro"
            billingCycle="yearly"
            label="Save 20%"
            style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: 'var(--color-success)', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0, whiteSpace: 'nowrap' }}
          />
        </div>
      )}

      <div style={{ textAlign: 'center', paddingTop: 4 }}>
        <Link href="/premium" style={{ fontSize: 13, fontWeight: 700, color: C.green, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          Compare all plans <ArrowRight size={13} />
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {['Cancel any time — no lock-in', 'Paid via your AgriNova wallet', '100% secure — no card needed'].map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.muted, fontWeight: 600 }}>
            <Shield size={13} style={{ color: C.green, flexShrink: 0 }} /> {t}
          </div>
        ))}
      </div>
    </div>
  );
}
