import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'Privacy Policy — Cropify' };

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="13 August 2026">
      <p>
        Cropify ("Cropify", "we", "us") operates a digital marketplace connecting farmers, buyers,
        transporters, agricultural input suppliers, crop-disease pathologists, offtakers, and farmer
        groups across Uganda. This policy explains what personal data we collect through the Cropify
        app and website, why we collect it, who we share it with, and the choices you have. It applies
        to every Cropify user regardless of role.
      </p>
      <p>
        We handle personal data in line with Uganda's Data Protection and Privacy Act, 2019, and
        applicable guidance from the Personal Data Protection Office (PDPO), Uganda's independent
        data-protection authority.
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

      <h3>1.2 Phone and email verification</h3>
      <p>
        Signing up or changing your phone number/email requires verifying it with a one-time code (OTP).
        We process your phone number or email, the code's status (sent/verified), and the time it was
        requested and verified, to confirm you actually control that phone number or address and to
        prevent abuse of the verification system (e.g. someone flooding a number with codes). Codes are
        short-lived and are not usable once verified or expired. We will never ask you to read an OTP
        back to us over chat, call, or email.
      </p>

      <h3>1.3 Information collected automatically</h3>
      <ul>
        <li><strong>Location data:</strong> if you grant permission, we use your device's GPS to help match nearby transporters and buyers, and — during an active delivery only — to let you and the other party (driver or requester) see each other's live position on a map so a pickup can actually happen. Live location sharing is per-delivery and stops when you end it or the delivery completes.</li>
        <li><strong>Device and usage data:</strong> app version, device type, IP address, and basic usage logs, used to diagnose bugs, secure accounts, and understand which features are actually used.</li>
        <li><strong>Cookies and local storage:</strong> used to keep you signed in, remember preferences (like your chosen theme), and support essential functionality. We don't use third-party advertising trackers.</li>
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
          <tr><td>OpenWeatherMap / Open-Meteo</td><td>Weather forecasts by district</td><td>District/location only</td></tr>
          <tr><td>UgSMS</td><td>Delivering OTP and other essential SMS messages</td><td>Phone number</td></tr>
          <tr><td>Resend</td><td>Delivering account and transaction emails</td><td>Email address, email content</td></tr>
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
        the rights, property, or safety of Cropify, our users, or the public. We do not sell your
        personal data as a commodity to third parties.
      </p>
      <p>
        Some of the providers above operate infrastructure outside Uganda (e.g. cloud hosting), meaning
        your data may be processed on servers outside the country. Where that happens, we rely on those
        providers' own security and contractual safeguards, and take steps required by applicable Ugandan
        data-protection law concerning such transfers.
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
      <p>
        Under Uganda's Data Protection and Privacy Act, 2019, you have rights over your personal data,
        including to:
      </p>
      <ul>
        <li><strong>Know</strong> how your information is collected and used (this policy).</li>
        <li><strong>Access &amp; correct</strong> your data — most profile information can be viewed and edited directly in the app; for anything you can't self-serve, contact us.</li>
        <li><strong>Delete</strong> your account at any time from Settings. This removes your profile and personal data, subject to what Ugandan financial-recordkeeping law requires us to retain for completed transactions (see below).</li>
        <li><strong>Object</strong> to certain processing, and withdraw consent where processing is based on it.</li>
        <li><strong>Control location</strong> at the device level and turn it off at any time; some features (live delivery tracking, nearby matching) won't work without it.</li>
        <li><strong>Control notifications</strong> from within the app.</li>
        <li><strong>Complain</strong> — to us directly (see Section 10) or, if unresolved, to the Personal Data Protection Office.</li>
      </ul>
      <p>We may need to verify your identity before acting on a request affecting your account.</p>

      <h2>6. Data retention</h2>
      <p>
        We keep your account data for as long as your account is active. After deletion, most personal
        data is removed promptly; transaction records tied to completed payments are retained for a
        period consistent with Uganda's financial and tax recordkeeping requirements, even after account
        deletion, because that data underlies a real money transaction between real parties. KYC/identity
        documents and security logs are retained only as long as reasonably necessary for verification,
        compliance, and fraud-prevention purposes.
      </p>

      <h2>7. Children</h2>
      <p>
        Cropify is intended for users aged 18 and older, consistent with our escrow and payment
        features. We do not knowingly collect data from children. If we learn that a child's data was
        collected without appropriate consent, we will take steps to delete it.
      </p>

      <h2>8. If something goes wrong</h2>
      <p>
        If a security incident compromises personal data, we will investigate, work to contain and fix
        it, and — where required by law or where it could meaningfully affect you — notify affected users
        and the relevant authority.
      </p>

      <h2>9. Changes to this policy</h2>
      <p>
        We'll update the date at the top of this page whenever this policy changes, and where a change
        is significant, we'll notify you in-app before it takes effect.
      </p>

      <h2>10. Contact us</h2>
      <p>
        Questions about this policy or your data can be sent to us via our <a href="/contact">Contact page</a>.
      </p>
    </LegalPage>
  );
}
