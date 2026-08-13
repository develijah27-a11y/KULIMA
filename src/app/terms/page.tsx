import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'Terms & Conditions — Cropify' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions" updated="13 August 2026">
      <p>
        These Terms &amp; Conditions ("Terms") govern your use of Cropify — the app, website, and
        underlying services (together, the "Platform"). By creating an account or otherwise using the
        Platform, you agree to be bound by these Terms and our <a href="/privacy">Privacy Policy</a>. If
        you don't agree, please don't use Cropify.
      </p>

      <h2>1. What Cropify is</h2>
      <p>
        Cropify is a marketplace and set of tools connecting farmers, buyers, agricultural input
        suppliers, transporters, crop-disease pathologists, offtakers, and farmer groups in Uganda.
        <strong> Cropify is a facilitator, not a party to transactions</strong> between users — when a
        buyer purchases a farmer's crop, or a transporter is hired for a delivery, that agreement is
        between those users. Cropify provides the marketplace, escrow, verification, and communication
        tools that make the transaction possible and safer for both sides.
      </p>
      <p>
        Cropify also provides agricultural information — weather forecasts, market prices, planting-season
        guidance, and AI-assisted crop disease detection — to help you make farming decisions. This
        information is provided to help, not to guarantee an outcome; see Section 7 below on how much to
        rely on it.
      </p>

      <h2>2. Eligibility &amp; accounts</h2>
      <ul>
        <li>You must be at least 18 years old and able to enter a binding agreement under Ugandan law.</li>
        <li>You must provide accurate information when registering and keep it up to date.</li>
        <li>You're responsible for keeping your password and account secure, and for all activity under your account.</li>
        <li>One person may hold multiple roles (e.g. farmer and group member) on a single account, but may not create multiple accounts to evade a suspension or manipulate ratings/pricing.</li>
        <li>Signing in and some account actions use a one-time verification code (OTP) sent to your phone or email. Never share this code with anyone, including someone claiming to be Cropify staff — we will never ask for it, and anyone who does is trying to take over your account.</li>
      </ul>

      <h2>3. Verification (KYC)</h2>
      <p>
        Cropify offers optional trust tiers (green, blue, gold) that require identity documents —
        national ID, a selfie, and, depending on your role, a driving permit, vehicle registration,
        business registration, or professional qualifications. Higher tiers unlock higher transaction
        limits and eligibility for financing. Submitting false or someone else's documents is a serious
        violation of these Terms and may result in immediate suspension and, where money was obtained
        fraudulently, referral to law enforcement.
      </p>

      <h2>4. Listings, offers &amp; orders</h2>
      <ul>
        <li>Farmers and suppliers listing produce or inputs must describe them accurately — quantity, quality, and location.</li>
        <li>All new listings are reviewed before appearing publicly; Cropify may reject or remove a listing that violates these Terms.</li>
        <li>A buyer's offer or order is a binding commitment to pay the stated price if accepted/confirmed by the farmer.</li>
        <li>Prices you see are set by the farmer or supplier — Cropify does not set marketplace prices, only the platform commission on top of them, which is always shown to you before you confirm.</li>
      </ul>

      <h2>5. Payments &amp; escrow</h2>
      <ul>
        <li>Deposits and withdrawals are processed through Nylon Pay via MTN Mobile Money and Airtel Money. Cropify does not have access to, and never asks for, your mobile money PIN.</li>
        <li>When a buyer pays for an order, funds move into <strong>escrow</strong> — held by Cropify, not released to the seller — until the order is marked delivered and the buyer confirms receipt (or a 48-hour window passes without a dispute).</li>
        <li>If a buyer raises a dispute within that window, an Cropify administrator reviews the case and decides whether funds are released to the seller or refunded to the buyer. This decision is final within the Platform's dispute process.</li>
        <li>Cropify deducts a commission from each completed transaction, calculated as a percentage of the transaction value. The exact fee is shown to you before you confirm any payment — nothing is deducted silently.</li>
        <li>All payments made through Cropify are final once escrow is released; Cropify is not a bank and does not offer general-purpose refunds outside the dispute process above.</li>
      </ul>

      <h2>6. Deliveries</h2>
      <ul>
        <li>Transporters accepting a delivery job commit to completing it as described — correct cargo, route, and timeframe.</li>
        <li>Payment to a transporter is released once the requester confirms the delivery is complete.</li>
        <li>Cropify is not a common carrier and does not itself transport goods; transporters are independent users of the Platform, not Cropify employees or agents. Cropify's liability for loss or damage to cargo during a delivery is limited as set out in Section 9.</li>
      </ul>

      <h2>7. Crop disease diagnosis &amp; AI-assisted information</h2>
      <p>
        The AI-assisted crop disease detection feature provides an automated best-effort diagnosis based
        on your photo, and is <strong>not a substitute for professional agronomic advice</strong>. For a
        confirmed diagnosis and treatment plan, use the paid consultation feature to connect with a
        human pathologist. Cropify is not liable for crop losses resulting from reliance on the
        automated diagnosis alone.
      </p>
      <p>
        More generally, any AI-generated content on Cropify — crop diagnosis, planting-season alerts, or
        other automated guidance — may be incomplete or wrong, and should not be your only input for a
        decision with real financial, agricultural, or safety consequences. Where a decision matters,
        confirm with a qualified agricultural professional or extension worker in addition to what
        Cropify shows you.
      </p>

      <h2>8. Prohibited conduct</h2>
      <p>You may not use Cropify to:</p>
      <ul>
        <li>List counterfeit, stolen, or illegal goods, or misrepresent quantity/quality of a listing.</li>
        <li>Circumvent escrow by arranging payment outside the Platform for a deal made on it.</li>
        <li>Harass, defraud, or impersonate another user or Cropify staff.</li>
        <li>Submit false verification documents or falsely report a dispute.</li>
        <li>Attempt to access another user's account or data, or interfere with the Platform's normal operation (including attempting to bypass security controls).</li>
        <li>Scrape, harvest, or bulk-collect other users' data, or abuse Cropify's APIs beyond normal in-app use.</li>
        <li>Post fake reviews, manipulate ratings, or artificially inflate or deflate marketplace prices.</li>
        <li>Use the Platform for money laundering or any other unlawful purpose.</li>
      </ul>
      <p>Violating these rules may result in warning, suspension, permanent account termination, and/or forfeiture of funds tied to the violation, at Cropify's discretion.</p>

      <h2>9. Limitation of liability</h2>
      <p>
        Cropify provides the Platform "as is." To the fullest extent permitted by Ugandan law, Cropify
        is not liable for: the quality, safety, or legality of goods listed by users; the conduct of any
        user, including a farmer, buyer, or transporter; indirect or consequential losses (e.g. lost
        profit from a delayed delivery); or service interruptions outside our reasonable control. Nothing
        in these Terms limits liability that cannot be limited under Ugandan law, including liability for
        fraud.
      </p>

      <h2>10. Intellectual property</h2>
      <p>
        The Cropify name, logo, and app design are the property of Cropify. © 2026 Cropify. All
        rights reserved. Content you post (listings, photos, messages) remains yours, but by posting it
        you grant Cropify a licence to display and use it for the operation of the Platform (e.g.
        showing your listing to potential buyers).
      </p>

      <h2>11. Termination</h2>
      <p>
        You may delete your account at any time. Cropify may suspend or terminate an account that
        violates these Terms, with or without notice depending on severity. Escrowed funds tied to an
        active, undisputed order are settled according to Section 5 even if an account is later
        suspended for unrelated reasons.
      </p>

      <h2>12. Changes to these Terms</h2>
      <p>
        We may update these Terms as the Platform evolves. We'll update the date at the top of this page,
        and for material changes, notify you in-app before they take effect. Continued use after a change
        takes effect means you accept the updated Terms.
      </p>

      <h2>13. Governing law</h2>
      <p>These Terms are governed by the laws of the Republic of Uganda.</p>

      <h2>14. Contact</h2>
      <p>Questions about these Terms can be sent to us via our <a href="/contact">Contact page</a>.</p>
    </LegalPage>
  );
}
