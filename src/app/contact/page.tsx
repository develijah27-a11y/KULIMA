import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';
import { Mail, Clock, ShieldAlert, HelpCircle } from 'lucide-react';

export const metadata: Metadata = { title: 'Contact & Support — Cropify' };

const GREEN = '#4ADE80';
const CARD  = '#0A1C10';
const BORDER = 'rgba(74,222,128,0.10)';
const MUTED = 'rgba(240,253,244,0.62)';

const SUPPORT_EMAIL = 'kimulidaudi5@gmail.com';

export default function ContactPage() {
  return (
    <LegalPage title="Contact & Support" updated="15 July 2026">
      <p>
        Have a question, ran into a problem, or need help with a payment, delivery, or account issue?
        Reach us using the details below — we read every message.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, margin: '24px 0 32px' }}>
        <ContactCard
          icon={<Mail size={20} />}
          title="Email support"
          body={<a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>}
        />
        <ContactCard
          icon={<Clock size={20} />}
          title="Response time"
          body="We aim to reply within 1–2 business days, faster for payment and account-security issues."
        />
      </div>

      <h2>What to include</h2>
      <p>To help us resolve your issue quickly, please include:</p>
      <ul>
        <li>The phone number or email your Cropify account is registered with.</li>
        <li>Your role (farmer, buyer, transporter, supplier, pathologist, offtaker, or admin).</li>
        <li>If it's about an order, delivery, or payment — the order/delivery ID if you have it (visible on the order/delivery detail screen).</li>
        <li>A short description of what happened, and what you expected to happen instead.</li>
      </ul>

      <h2>Urgent payment or security issues</h2>
      <div className="legal-callout" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <ShieldAlert size={20} color={GREEN} style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ margin: 0 }}>
          If you believe your account has been compromised, or notice a wallet transaction you didn't
          make, email us immediately with "URGENT — Security" in the subject line. Don't share your
          password with anyone — Cropify staff will never ask for it.
        </p>
      </div>

      <h2>Common questions</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Faq q="How do I get my money back if an order goes wrong?" a="Payments are held in escrow until you confirm delivery. If something's wrong, raise a dispute from the order screen within 48 hours of delivery — an admin reviews every dispute before any money moves." />
        <Faq q="Why is my verification still pending?" a="Identity verification is reviewed manually, usually within 1–3 business days. You'll get a notification the moment it's approved or if we need a clearer document." />
        <Faq q="How do I delete my account?" a="Go to Settings → Account → Delete Account. See our Privacy Policy for what happens to your data afterward." />
        <Faq q="I'm a supplier / offtaker / pathologist and want to join — how do I get verified for that role?" a="Sign up, select the relevant role, and complete the verification wizard for your role from your dashboard — it walks you through exactly which documents are needed." />
      </div>

      <p style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 8, color: MUTED, fontSize: 13.5 }}>
        <HelpCircle size={15} /> Also see our <a href="/terms" style={{ marginLeft: 2 }}>Terms &amp; Conditions</a> and <a href="/privacy">Privacy Policy</a>.
      </p>
    </LegalPage>
  );
}

function ContactCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: React.ReactNode }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ color: GREEN, marginBottom: 10 }}>{icon}</div>
      <p style={{ fontSize: 13, fontWeight: 700, color: MUTED, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</p>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{body}</div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px' }}>
      <summary style={{ fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>{q}</summary>
      <p style={{ fontSize: 13.5, color: MUTED, margin: '10px 0 0', lineHeight: 1.6 }}>{a}</p>
    </details>
  );
}
