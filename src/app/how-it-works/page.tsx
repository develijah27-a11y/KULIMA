import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'How Cropify Works — Cropify' };

export default function HowItWorksPage() {
  return (
    <LegalPage title="How Cropify Works" updated="13 August 2026">
      <p>
        Cropify works a little differently depending on which role you sign up as. Here's what
        actually happens on the platform for each one.
      </p>

      <h2>Farmers — list, sell, get paid</h2>
      <ol>
        <li>Create a farm profile and add your listings (crop, quantity, quality, location, price).</li>
        <li>New listings are reviewed before they go live on the marketplace.</li>
        <li>A buyer places an order or makes an offer; you accept or negotiate it.</li>
        <li>Once accepted, the buyer's payment moves into escrow — held by Cropify, not released to you yet.</li>
        <li>You arrange or accept a delivery (by a transporter or the buyer directly), then mark the order delivered.</li>
        <li>Once the buyer confirms receipt (or the dispute window passes), the payment is released to your wallet, minus Cropify's commission.</li>
        <li>Along the way you can track inventory, check crop prices, get weather and planting-calendar guidance, and message or join a farmer group.</li>
      </ol>

      <h2>Buyers — browse, order, receive</h2>
      <ol>
        <li>Browse listings from individual farmers or group listings from farmer groups.</li>
        <li>Place an order or send an offer to a farmer; pay through your wallet (topped up via Mobile Money) once it's accepted.</li>
        <li>Your payment sits in escrow until the order is delivered.</li>
        <li>Track the delivery, then confirm receipt when it arrives — this is what releases payment to the seller.</li>
        <li>If something is wrong with the order, raise a dispute instead of confirming — see our <a href="/refund-policy">Refund &amp; Payment Policy</a>.</li>
      </ol>

      <h2>Agricultural input suppliers — list, sell, fulfil</h2>
      <ol>
        <li>Build a catalogue of inputs (seed, fertiliser, equipment, etc.) with pricing and stock.</li>
        <li>Farmers order directly from your catalogue, or you run time-limited flash deals.</li>
        <li>Orders go through the same escrow protection — you fulfil the order, the buyer confirms, you get paid.</li>
        <li>Track demand, coverage area, returns, and order history from your dashboard.</li>
      </ol>

      <h2>Transporters — find jobs, deliver, get paid</h2>
      <ol>
        <li>Verify your vehicle and documents, then browse the job queue for delivery jobs (including cold-chain jobs).</li>
        <li>Accept a job, complete the pickup and delivery as described.</li>
        <li>Once the requester confirms the delivery is complete, your fare is released to your wallet.</li>
      </ol>

      <h2>Pathologists — diagnose, advise, earn</h2>
      <ol>
        <li>Farmers can run an AI-assisted check on a crop photo through the disease doctor feature — this gives an automated, best-effort read, not a confirmed diagnosis.</li>
        <li>Flagged cases appear in a case queue that verified pathologists can pick up.</li>
        <li>You review the case and provide a paid consultation with a proper diagnosis and treatment plan, communicating with the farmer directly.</li>
        <li>You can also track disease alerts and case activity across your area on a geo-map.</li>
      </ol>

      <h2>Offtakers — contract, source, track</h2>
      <ol>
        <li>Set up contracts with farmers or farmer groups for larger, ongoing supply arrangements.</li>
        <li>Track your sourcing pipeline, delivery quality, spend, and a risk/scorecard view across your suppliers.</li>
        <li>Payments and deliveries under a contract follow the same escrow and confirmation model as a regular order.</li>
      </ol>

      <h2>Farmer groups — coordinate as one</h2>
      <ol>
        <li>A group brings members together under shared listings, bulk orders, and group finances.</li>
        <li>Group leaders manage members, announcements, and a shared wallet; the group can also access group loans and a shared supplier list.</li>
        <li>Buyers and offtakers can order from a group listing the same way they would from an individual farmer.</li>
      </ol>

      <h2>Paying and getting paid</h2>
      <p>
        Every role has a wallet. Deposits and withdrawals move through Nylon Pay via MTN Mobile
        Money and Airtel Money. Cropify never asks for your mobile money PIN. See the{' '}
        <a href="/faq">FAQ</a> for more on deposits, withdrawals, and commission.
      </p>

      <p style={{ marginTop: 28 }}>
        For the full legal detail behind all of this, see our <a href="/terms">Terms &amp;
        Conditions</a> and <a href="/refund-policy">Refund &amp; Payment Policy</a>.
      </p>
    </LegalPage>
  );
}
