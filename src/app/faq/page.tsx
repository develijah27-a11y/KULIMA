import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'Help & FAQ — Cropify' };

function Faq({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <details style={{ background: '#0A1C10', border: '1px solid rgba(74,222,128,0.10)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
      <summary style={{ fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>{q}</summary>
      <div style={{ fontSize: 13.5, color: 'rgba(240,253,244,0.62)', margin: '10px 0 0', lineHeight: 1.6 }}>{a}</div>
    </details>
  );
}

export default function FaqPage() {
  return (
    <LegalPage title="Help & FAQ" updated="13 August 2026">
      <p>
        Answers to the questions we hear most. If you can't find what you need here, our{' '}
        <a href="/contact">Contact &amp; Support</a> page has direct ways to reach us.
      </p>

      <h2>Account &amp; verification</h2>
      <Faq q="What do the verification badges mean?" a={
        <>
          Every account starts unverified. From there you can move through <strong>ID Verified</strong> (national
          ID only), <strong>KYC Verified</strong> (ID plus a selfie and, depending on your role, business
          registration, driving permit, vehicle documents, or professional qualifications), and an{' '}
          <strong>Enterprise</strong> tier for larger operations. Higher tiers mean more trust with the other
          side of a deal, access to escrow-eligible transactions, and — for farmers — eligibility for loans.
        </>
      } />
      <Faq q="How long does verification take?" a="Documents are reviewed manually by our team, typically within 1–3 business days depending on the tier. You'll get a notification the moment it's approved, or if we need a clearer document." />
      <Faq q="Why was my verification rejected?" a="Usually because a document was blurry, expired, or didn't match your account details. Resubmit from your verification screen — you'll see the specific reason before you do." />
      <Faq q="How do I delete my account?" a="Go to Settings → Account → Delete Account. See our Privacy Policy for exactly what happens to your data afterward." />
      <Faq q="Can I hold more than one role, like farmer and group member?" a="Yes, one person can hold multiple roles on a single account. What you can't do is create multiple accounts to evade a suspension or manipulate ratings or pricing." />

      <h2>Payments, wallet &amp; escrow</h2>
      <Faq q="How do deposits and withdrawals work?" a="Deposits and withdrawals are processed through Nylon Pay via MTN Mobile Money and Airtel Money. You top up or withdraw from your in-app wallet — Cropify never has access to, and never asks for, your mobile money PIN." />
      <Faq q="What happens if my withdrawal fails?" a="If a mobile money withdrawal fails on the network side, the funds stay in your Cropify wallet — they are not lost. Retry the withdrawal, and if it keeps failing, contact support with the transaction details so we can check with Nylon Pay on our end." />
      <Faq q="What is escrow, and why does my payment 'disappear' after I pay?" a="It hasn't disappeared — it's held safely. When you pay for an order, funds move into escrow (held by Cropify, not the seller) until you confirm delivery, or a dispute window passes without a dispute being raised. This protects both buyer and seller." />
      <Faq q="How is Cropify's commission calculated?" a="Cropify deducts a commission from each completed transaction, calculated as a percentage of the transaction value. The exact fee is always shown to you before you confirm a payment — nothing is deducted silently." />
      <Faq q="What if my order never arrives?" a={<>Don't confirm delivery. Instead, raise a dispute from the order screen — see our <a href="/refund-policy">Refund &amp; Payment Policy</a> for the full process.</>} />

      <h2>Disputes</h2>
      <Faq q="How do I get my money back if an order goes wrong?" a="Payments are held in escrow until you confirm delivery. If something's wrong, raise a dispute from the order screen within the dispute window shown on that order. An admin reviews every dispute before any money moves, in either direction." />
      <Faq q="Who decides a dispute?" a="A Cropify administrator reviews the case — messages, order details, and any evidence submitted — and decides whether funds are released to the seller or refunded to the buyer. This decision is final within Cropify's dispute process." />

      <h2>Farmer groups</h2>
      <Faq q="How do I join a farmer group?" a="From your farmer dashboard, go to Groups and browse or search for a group to request to join, or accept an invite from a group leader. Once approved, you'll see the group's shared listings, announcements, and finances." />
      <Faq q="Can a group sell as one listing?" a="Yes — group leaders can create shared group listings that buyers and offtakers can order from, alongside members' individual listings." />

      <h2>Role-specific verification</h2>
      <Faq q="I'm a supplier / offtaker / pathologist / transporter — how do I get verified for that role?" a="Sign up, select the relevant role, and complete the verification wizard from your dashboard. It walks you through exactly which documents are needed for your role and tier." />
      <Faq q="I'm a pathologist — how do I start getting consultations?" a="Complete verification for your role, then cases flagged by the AI disease-detection feature appear in your case queue. You review and pick up cases, then provide a paid consultation directly to the farmer." />

      <p style={{ marginTop: 28 }}>
        See also our <a href="/how-it-works">How Cropify Works</a> guide, <a href="/terms">Terms &amp;
        Conditions</a>, and <a href="/privacy">Privacy Policy</a>.
      </p>
    </LegalPage>
  );
}
