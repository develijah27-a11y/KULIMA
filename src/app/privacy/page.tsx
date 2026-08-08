import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'Privacy Policy — Cropify' };

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="15 July 2026">
      <p>
        Cropify ("Cropify", "we", "us") operates a digital marketplace connecting farmers, buyers,
        transporters, agricultural input suppliers, crop-disease pathologists, offtakers, and farmer
        groups across Uganda. This policy explains what personal data we collect through the Cropify
        app and website, why we collect it, who we share it with, and the choices you have. It applies
        to every Cropify user regardless of role.
      </p>
      <p>
        By creating an Cropify account you agree to the collection and use of information as described
        here. If you do not agree, please do not use the app.
      </p>

      <h2>1. Information we collect</h2>
      <h3>1.1 Information you give us directly</h3>
      <ul>
        <li><strong>Account details:</strong> full name, phone number, email address, password, and your selected role(s).</li>
        <li><strong>Profile information:</strong> district/location, bio, farm size and crops, avatar photo.</li>
        <li><strong>Identity verification (KYC):</strong> depending on the trust tier you apply for — a national ID photo, a selfie, a driving permit, vehicle registration, business registration documents, or professional qualifications (for pathologists). These are stored in a private file store that only you and an Cropify administrator reviewing your application can access — never a public link.</li>
        <li><strong>Marketplace content:</strong> crop listings, prices, offers, orders, delivery requests, reviews, disputes, and messages you send to other users (e.g. farmer-to-buyer or farmer-to-pathologist chat).</li>
        <li><strong>Financial information:</strong> your in-app wallet balance and transaction history, and the mobile money phone number/provider you use to deposit or withdraw. <strong>We do not collect or store your mobile money PIN or card details</strong> — deposits and withdrawals are processed directly by our payment partner, Nylon Pay.</li>
        <li><strong>Photos you submit for crop disease diagnosis</strong>, and any notes describing the issue.</li>
      </ul>

      <h3>1.2 Information collected automatically</h3>
      <ul>
        <li><strong>Location data:</strong> if you grant permission, we use your device's GPS to help match nearby transporters and buyers, and — during an active delivery only — to let you and the other party (driver or requester) see each other's live position on a map so a pickup can actually happen. Live location sharing is per-delivery and stops when you end it or the delivery completes.</li>
        <li><strong>Device and usage data:</strong> app version, device type, and basic usage logs, used to diagnose bugs and understand which features are actually used.</li>
      </ul>

      <h2>2. How we use your information</h2>
      <ul>
        <li>To create and secure your account, and verify your identity for higher trust tiers.</li>
        <li>To operate the marketplace — showing listings, matching buyers with farmers, matching delivery requests with available transporters, and connecting farmers with pathologists.</li>
        <li>To process payments: funding and releasing escrow, wallet deposits/withdrawals, and paying commissions — via Nylon Pay, our licensed mobile-money payment processor.</li>
        <li>To run AI-assisted crop disease detection on photos you submit.</li>
        <li>To show relevant weather forecasts and market price data for your district.</li>
        <li>To detect and prevent fraud, abuse, and violations of our <a href="/terms">Terms &amp; Conditions</a>.</li>
        <li>To respond to support requests and resolve disputes between users.</li>
        <li>To send you notifications about orders, payments, deliveries, and account activity.</li>
      </ul>
      <p>We do not sell your personal data to anyone.</p>

      <h2>3. Who we share information with</h2>
      <p>We share the minimum data necessary with a small number of service providers that make Cropify work:</p>
      <table>
        <thead><tr><th>Provider</th><th>Purpose</th><th>Data involved</th></tr></thead>
        <tbody>
          <tr><td>Supabase</td><td>Database, authentication, and file storage hosting</td><td>All account and marketplace data</td></tr>
          <tr><td>Nylon Pay</td><td>Mobile money deposits, withdrawals, and payment processing</td><td>Phone number, transaction amounts</td></tr>
          <tr><td>Google Cloud (Vision API)</td><td>Automated crop disease image analysis</td><td>Photos you submit for diagnosis</td></tr>
          <tr><td>OpenWeatherMap</td><td>Weather forecasts by district</td><td>District/location only</td></tr>
        </tbody>
      </table>
      <p>
        Other users of the app see the information relevant to a transaction you're part of — e.g. a
        buyer sees a farmer's listing and, once an order is placed, the farmer's name and phone number;
        an assigned transporter can see pickup/dropoff details. We never expose your identity documents
        to other users — only to Cropify administrators reviewing a verification request.
      </p>
      <p>
        We may also disclose information if required by Ugandan law, to enforce our Terms, or to protect
        the rights, property, or safety of Cropify, our users, or the public.
      </p>

      <h2>4. How we protect your data</h2>
      <ul>
        <li>Database access is governed by row-level security — a user can only read or write data they actually own or are a party to, enforced at the database level, not just in the app.</li>
        <li>Identity documents are stored in a private file store, never a public link, and can only be viewed by an administrator via a short-lived (5-minute) access link generated at the moment of review.</li>
        <li>All traffic between your device and Cropify is encrypted (HTTPS).</li>
        <li>Passwords are hashed and never stored or visible in plain text, including to Cropify staff.</li>
      </ul>
      <p>
        No system is 100% secure, but we treat identity documents and financial data as our highest
        priority to protect, and we review our security posture on an ongoing basis.
      </p>

      <h2>5. Your rights and choices</h2>
      <ul>
        <li><strong>Access &amp; correction:</strong> you can view and edit most of your profile information directly in the app.</li>
        <li><strong>Deletion:</strong> you can delete your account at any time from Settings. This removes your profile and personal data, subject to what Ugandan financial-recordkeeping law requires us to retain for completed transactions (see below).</li>
        <li><strong>Location:</strong> you control location permission at the device level and can turn it off at any time; some features (live delivery tracking, nearby matching) won't work without it.</li>
        <li><strong>Notifications:</strong> you can manage what notifications you receive from within the app.</li>
      </ul>

      <h2>6. Data retention</h2>
      <p>
        We keep your account data for as long as your account is active. After deletion, most personal
        data is removed promptly; transaction records tied to completed payments are retained for a
        period consistent with Uganda's financial and tax recordkeeping requirements, even after account
        deletion, because that data underlies a real money transaction between real parties.
      </p>

      <h2>7. Children</h2>
      <p>
        Cropify is intended for users aged 18 and older, consistent with our escrow and payment
        features. We do not knowingly collect data from children.
      </p>

      <h2>8. Changes to this policy</h2>
      <p>
        We'll update the date at the top of this page whenever this policy changes, and where a change
        is significant, we'll notify you in-app before it takes effect.
      </p>

      <h2>9. Contact us</h2>
      <p>
        Questions about this policy or your data can be sent to us via our <a href="/contact">Contact page</a>.
      </p>
    </LegalPage>
  );
}
