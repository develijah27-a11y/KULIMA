import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = { title: 'Refund & Payment Policy — Cropify' };

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund & Payment Policy" updated="13 August 2026">
      <p>
        Cropify is a marketplace and escrow facilitator, not a direct seller of goods — so this
        policy works differently from a typical online store's refund policy. It explains how
        payments, escrow, and disputes actually work on Cropify. It should be read alongside Section
        5 ("Payments &amp; escrow") of our <a href="/terms">Terms &amp; Conditions</a>, which this
        page expands on rather than replaces.
      </p>

      <h2>1. How payments work</h2>
      <ul>
        <li>Deposits and withdrawals are processed through Nylon Pay via MTN Mobile Money and Airtel Money. Cropify does not have access to, and never asks for, your mobile money PIN.</li>
        <li>You top up your Cropify wallet before paying for an order, and withdraw earnings from your wallet back to mobile money.</li>
        <li>Cropify deducts a commission from each completed transaction, calculated as a percentage of the transaction value. The exact fee is shown to you before you confirm any payment — nothing is deducted silently.</li>
      </ul>

      <h2>2. Escrow — where your payment goes</h2>
      <p>
        When a buyer pays for an order, the funds move into <strong>escrow</strong> — held by
        Cropify, not the seller — rather than being paid out immediately. The order carries an
        escrow status (for example, funded, delivered, disputed, released, or refunded) that you can
        see on the order detail screen.
      </p>
      <ul>
        <li>The seller (farmer, supplier, or transporter) marks the order delivered.</li>
        <li>The buyer then confirms receipt, or a dispute window passes without a dispute being raised — either of these releases the escrowed funds to the seller's wallet, minus commission.</li>
        <li>If the buyer raises a dispute within that window instead, the funds stay in escrow and the order moves into a disputed state pending review.</li>
      </ul>

      <h2>3. If an order never arrives, or arrives wrong</h2>
      <p>
        Do not confirm delivery if the order hasn't actually arrived, or doesn't match what was
        agreed. Instead, raise a dispute from the order screen within the dispute window shown on
        that order. Raising a dispute keeps the payment in escrow — it does not release funds to the
        seller, and it does not require the seller's agreement to open.
      </p>
      <p>When raising a dispute, include:</p>
      <ul>
        <li>What was ordered versus what (if anything) was received.</li>
        <li>Photos or other evidence, if you have them.</li>
        <li>The order or delivery ID, visible on the order/delivery detail screen.</li>
      </ul>

      <h2>4. How disputes are resolved</h2>
      <p>
        A Cropify administrator reviews every dispute — order details, messages between the parties,
        and any evidence submitted — before any money moves in either direction. The admin decides
        whether to:
      </p>
      <ul>
        <li><strong>Release</strong> the escrowed funds to the seller (if the order was in fact fulfilled as agreed), or</li>
        <li><strong>Refund</strong> the escrowed funds back to the buyer's Cropify wallet (if it wasn't).</li>
      </ul>
      <p>
        This decision is final within Cropify's dispute process. A refund lands back in the buyer's
        Cropify wallet, from where it can be withdrawn to mobile money like any other wallet balance.
      </p>

      <h2>5. Order cancellations</h2>
      <p>
        An order can be cancelled before it's marked delivered (for example, if a seller can't
        fulfil it). A cancellation refunds the escrowed amount back to the buyer's wallet in the same
        way a dispute resolved in the buyer's favor does.
      </p>

      <h2>6. Wallet withdrawal issues</h2>
      <p>
        If a withdrawal to mobile money fails on the network side, the funds are <strong>not
        lost</strong> — they remain in your Cropify wallet, and you can retry the withdrawal. If a
        withdrawal keeps failing, contact <a href="/contact">support</a> with the transaction
        details (amount, date, and mobile money number used) so we can check the status with Nylon
        Pay.
      </p>

      <h2>7. What this policy doesn't cover</h2>
      <p>
        Cropify is not a bank and does not offer general-purpose refunds outside the escrow/dispute
        process above — for example, simply changing your mind about a completed, undisputed order
        after funds have been released is not grounds for a refund through Cropify. Once escrow is
        released to a seller, that payment is final. Cropify is also not liable for the quality,
        safety, or legality of goods listed by users, or for the conduct of any user, beyond what's
        set out in Section 9 of our <a href="/terms">Terms &amp; Conditions</a>.
      </p>

      <h2>8. Questions</h2>
      <p>
        If you're unsure about the status of a payment, escrow, or dispute, reach out through our{' '}
        <a href="/contact">Contact &amp; Support</a> page with your order or delivery ID.
      </p>
    </LegalPage>
  );
}
