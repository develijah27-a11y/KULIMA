import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'Terms & Conditions — AgriNova' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions" updated="15 July 2026">
      <p>
        These Terms &amp; Conditions ("Terms") govern your use of AgriNova — the app, website, and
        underlying services (together, the "Platform"). By creating an account or otherwise using the
        Platform, you agree to be bound by these Terms. If you don't agree, please don't use AgriNova.
      </p>

      <h2>1. What AgriNova is</h2>
      <p>
        AgriNova is a marketplace and set of tools connecting farmers, buyers, agricultural input
        suppliers, transporters, crop-disease pathologists, offtakers, and farmer groups in Uganda.
        <strong> AgriNova is a facilitator, not a party to transactions</strong> between users — when a
        buyer purchases a farmer's crop, or a transporter is hired for a delivery, that agreement is
        between those users. AgriNova provides the marketplace, escrow, verification, and communication
        tools that make the transaction possible and safer for both sides.
      </p>

      <h2>2. Eligibility &amp; accounts</h2>
      <ul>
        <li>You must be at least 18 years old and able to enter a binding agreement under Ugandan law.</li>
        <li>You must provide accurate information when registering and keep it up to date.</li>
        <li>You're responsible for keeping your password and account secure, and for all activity under your account.</li>
        <li>One person may hold multiple roles (e.g. farmer and group member) on a single account, but may not create multiple accounts to evade a suspension or manipulate ratings/pricing.</li>
      </ul>

      <h2>3. Verification (KYC)</h2>
      <p>
        AgriNova offers optional trust tiers (green, blue, gold) that require identity documents —
        national ID, a selfie, and, depending on your role, a driving permit, vehicle registration,
        business registration, or professional qualifications. Higher tiers unlock higher transaction
        limits and eligibility for financing. Submitting false or someone else's documents is a serious
        violation of these Terms and may result in immediate suspension and, where money was obtained
        fraudulently, referral to law enforcement.
      </p>

      <h2>4. Listings, offers &amp; orders</h2>
      <ul>
        <li>Farmers and suppliers listing produce or inputs must describe them accurately — quantity, quality, and location.</li>
        <li>All new listings are reviewed before appearing publicly; AgriNova may reject or remove a listing that violates these Terms.</li>
        <li>A buyer's offer or order is a binding commitment to pay the stated price if accepted/confirmed by the farmer.</li>
        <li>Prices you see are set by the farmer or supplier — AgriNova does not set marketplace prices, only the platform commission on top of them, which is always shown to you before you confirm.</li>
      </ul>

      <h2>5. Payments &amp; escrow</h2>
      <ul>
        <li>Deposits and withdrawals are processed through Flutterwave via MTN Mobile Money and Airtel Money. AgriNova does not have access to, and never asks for, your mobile money PIN.</li>
        <li>When a buyer pays for an order, funds move into <strong>escrow</strong> — held by AgriNova, not released to the seller — until the order is marked delivered and the buyer confirms receipt (or a 48-hour window passes without a dispute).</li>
        <li>If a buyer raises a dispute within that window, an AgriNova administrator reviews the case and decides whether funds are released to the seller or refunded to the buyer. This decision is final within the Platform's dispute process.</li>
        <li>AgriNova deducts a commission from each completed transaction, calculated as a percentage of the transaction value. The exact fee is shown to you before you confirm any payment — nothing is deducted silently.</li>
        <li>All payments made through AgriNova are final once escrow is released; AgriNova is not a bank and does not offer general-purpose refunds outside the dispute process above.</li>
      </ul>

      <h2>6. Deliveries</h2>
      <ul>
        <li>Transporters accepting a delivery job commit to completing it as described — correct cargo, route, and timeframe.</li>
        <li>Payment to a transporter is released once the requester confirms the delivery is complete.</li>
        <li>AgriNova is not a common carrier and does not itself transport goods; transporters are independent users of the Platform, not AgriNova employees or agents. AgriNova's liability for loss or damage to cargo during a delivery is limited as set out in Section 9.</li>
      </ul>

      <h2>7. Crop disease diagnosis</h2>
      <p>
        The AI-assisted crop disease detection feature provides an automated best-effort diagnosis based
        on your photo, and is <strong>not a substitute for professional agronomic advice</strong>. For a
        confirmed diagnosis and treatment plan, use the paid consultation feature to connect with a
        human pathologist. AgriNova is not liable for crop losses resulting from reliance on the
        automated diagnosis alone.
      </p>

      <h2>8. Prohibited conduct</h2>
      <p>You may not use AgriNova to:</p>
      <ul>
        <li>List counterfeit, stolen, or illegal goods, or misrepresent quantity/quality of a listing.</li>
        <li>Circumvent escrow by arranging payment outside the Platform for a deal made on it.</li>
        <li>Harass, defraud, or impersonate another user or AgriNova staff.</li>
        <li>Submit false verification documents or falsely report a dispute.</li>
        <li>Attempt to access another user's account or data, or interfere with the Platform's normal operation (including attempting to bypass security controls).</li>
        <li>Use the Platform for money laundering or any other unlawful purpose.</li>
      </ul>
      <p>Violating these rules may result in warning, suspension, permanent account termination, and/or forfeiture of funds tied to the violation, at AgriNova's discretion.</p>

      <h2>9. Limitation of liability</h2>
      <p>
        AgriNova provides the Platform "as is." To the fullest extent permitted by Ugandan law, AgriNova
        is not liable for: the quality, safety, or legality of goods listed by users; the conduct of any
        user, including a farmer, buyer, or transporter; indirect or consequential losses (e.g. lost
        profit from a delayed delivery); or service interruptions outside our reasonable control. Nothing
        in these Terms limits liability that cannot be limited under Ugandan law, including liability for
        fraud.
      </p>

      <h2>10. Intellectual property</h2>
      <p>
        The AgriNova name, logo, and app design are the property of AgriNova. © 2026 AgriNova. All
        rights reserved. Content you post (listings, photos, messages) remains yours, but by posting it
        you grant AgriNova a licence to display and use it for the operation of the Platform (e.g.
        showing your listing to potential buyers).
      </p>

      <h2>11. Termination</h2>
      <p>
        You may delete your account at any time. AgriNova may suspend or terminate an account that
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

      <div className="legal-callout">
        <strong>Note:</strong> AgriNova is currently completing formal business registration in Uganda.
        These Terms will be updated with our registered legal entity name once that process completes.
      </div>
    </LegalPage>
  );
}
