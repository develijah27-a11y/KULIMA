'use client';

import { AppIcon } from '@/components/ui/AppIcon';

export interface WalletCardProps {
  /** Wallet balance in whole currency units, e.g. 1250000 for UGX 1,250,000 */
  balance: number;
  currency?: string;
  /** Real wallets.account_number, e.g. "AGN1234567890" — never invent this */
  accountNumber: string | null | undefined;
  holderName: string;
  /** Funds currently held in escrow for active deals, shown as a secondary line if > 0 */
  escrowBalance?: number;
}

// Masks a real Cropify account number card-style: keeps the "AGN" prefix
// visible (so it's never mistaken for a card network number) and the last
// 4 digits, masks the middle. Never pads or invents digits to force a
// 16-digit look — this is a wallet account number, not a card number.
function maskAccountNumber(accountNumber: string): string {
  const prefix = accountNumber.slice(0, 3); // "AGN"
  const digits = accountNumber.slice(3);
  if (digits.length <= 4) return `${prefix} ${digits}`;
  const last4 = digits.slice(-4);
  const maskedLen = digits.length - 4;
  const maskedGroups = Math.ceil(maskedLen / 4);
  const masked = Array.from({ length: maskedGroups }, () => '••••').join(' ');
  return `${prefix} ${masked} ${last4}`;
}

export function WalletCard({ balance, currency = 'UGX', accountNumber, holderName, escrowBalance = 0 }: WalletCardProps) {
  return (
    <div
      style={{
        borderRadius: 22,
        padding: '22px 24px',
        background: 'linear-gradient(135deg, #0A5C36 0%, #1B6B3E 45%, #2D8A57 100%)',
        boxShadow: '0 10px 30px rgba(10,92,54,0.3), 0 3px 10px rgba(10,92,54,0.2)',
        color: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
        minHeight: 190,
      }}
    >
      {/* Subtle agricultural pattern — repeated leaf motif, low opacity, decorative only */}
      <svg aria-hidden="true" style={{ position: 'absolute', top: -30, right: -30, opacity: 0.10, pointerEvents: 'none' }} width="160" height="160" viewBox="0 0 160 160">
        <path d="M20,140 Q25,40 140,20 Q120,80 20,140 Z" fill="#FFFFFF" />
      </svg>

      {/* Header: logo + Wallet label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AppIcon size={26} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>
          Wallet
        </span>
      </div>

      {/* Balance */}
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', margin: '0 0 6px' }}>
        Available Balance
      </p>
      <p style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 4px' }}>
        {currency} {Math.round(balance).toLocaleString()}
      </p>
      {escrowBalance > 0 && (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', margin: '0 0 18px' }}>
          + {currency} {Math.round(escrowBalance).toLocaleString()} in escrow
        </p>
      )}
      {escrowBalance <= 0 && <div style={{ marginBottom: 18 }} />}

      {/* Masked account number */}
      {accountNumber && (
        <p style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.06em', fontFamily: 'var(--font-mono, monospace)', margin: '0 0 14px' }}>
          {maskAccountNumber(accountNumber)}
        </p>
      )}

      {/* Holder name + decorative accent */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)' }}>
          {holderName}
        </span>
        {/* Decorative rounded-square motif, purely visual depth — not a chip/contactless claim */}
        <span
          aria-hidden="true"
          style={{ width: 30, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)' }}
        />
      </div>
    </div>
  );
}
