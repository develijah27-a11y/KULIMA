import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'About Cropify — Cropify' };

export default function AboutPage() {
  return (
    <LegalPage title="About Cropify" updated="13 August 2026">
      <p>
        Cropify is a marketplace and set of tools connecting farmers, buyers, agricultural input
        suppliers, transporters, crop-disease pathologists, offtakers, and farmer groups across
        Uganda. <strong>Cropify is a facilitator, not a party to the transactions</strong> that happen
        on it — when a buyer purchases a farmer's crop, or a transporter is hired for a delivery,
        the agreement is between those users. Cropify provides the marketplace, escrow, verification,
        and communication tools that make the transaction possible and safer for everyone involved.
      </p>

      <h2>Who Cropify is for</h2>
      <ul>
        <li><strong>Farmers</strong> — list crops for sale, manage a farm profile, track inventory, get weather and planting-calendar guidance, join or lead a farmer group, and get paid into a wallet.</li>
        <li><strong>Buyers</strong> — browse and order crops directly from farmers or from group listings, track deliveries, and manage contracts with growers.</li>
        <li><strong>Agricultural input suppliers</strong> — list and sell inputs (seed, fertiliser, equipment) through a catalogue, run flash deals, and fulfil orders.</li>
        <li><strong>Transporters</strong> — pick up delivery jobs, manage a vehicle profile, and get paid per completed delivery, including cold-chain jobs.</li>
        <li><strong>Crop-disease pathologists</strong> — review AI-flagged disease cases and offer paid consultations to farmers who need a confirmed diagnosis.</li>
        <li><strong>Offtakers</strong> — source produce at scale through contracts, track a delivery pipeline, and manage quality and spend across many farmers.</li>
        <li><strong>Farmer groups</strong> — coordinate members, bulk orders, shared listings, and group finances under one roof.</li>
      </ul>

      <h2>How trust is built</h2>
      <p>
        Every account starts unverified. Cropify offers optional trust tiers — ID-verified, fully
        KYC-verified, and an enterprise tier — that require identity documents appropriate to the
        role (national ID, a selfie, and, depending on your role, a driving permit, vehicle
        registration, business registration, or professional qualifications). Higher tiers unlock
        higher transaction limits, escrow-eligible deals, and access to features like financing or
        bulk/export buyers. See our <a href="/faq">FAQ</a> for what each tier means in practice.
      </p>

      <h2>How money moves safely</h2>
      <p>
        Deposits and withdrawals run through PrimePay via MTN Mobile Money and Airtel Money. When a
        buyer pays for an order, the money moves into <strong>escrow</strong> — held by Cropify, not
        the seller — until delivery is confirmed. This protects both sides: a buyer isn't paying into
        thin air, and a farmer, supplier, or transporter knows the money is already committed before
        they act on the order. Full detail is in our <a href="/refund-policy">Refund &amp; Payment
        Policy</a>.
      </p>

      <h2>What Cropify is not</h2>
      <p>
        Cropify does not grow, buy, sell, or transport anything itself, and it does not set the
        prices farmers or suppliers charge. It is not a bank, and it does not replace a qualified
        agronomist — the AI-assisted crop disease detection feature gives a best-effort automated
        read on a photo, not a diagnosis; for that, a farmer connects with a real pathologist through
        the platform's paid consultation feature.
      </p>

      <p style={{ marginTop: 28 }}>
        Read more in our <a href="/how-it-works">How Cropify Works</a> guide, or see the full{' '}
        <a href="/terms">Terms &amp; Conditions</a>.
      </p>
    </LegalPage>
  );
}
