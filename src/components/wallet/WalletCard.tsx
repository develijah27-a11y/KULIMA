'use client';

import { useState } from 'react';
import { AppIcon } from '@/components/ui/AppIcon';
import { Wordmark } from '@/components/ui/Wordmark';
import { Copy, Check } from 'lucide-react';

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

// Formats a real Cropify account number card-style: keeps the "AGN" prefix
// and last 4 digits visible (so it's never mistaken for a card-network
// number), masks the middle, grouped in dashes for readability. Presents
// the account number the backend already generates — this does not change
// the underlying format (transfer_between_wallets matches on the exact
// stored string; changing it here would be cosmetic-only and misleading).
function formatAccountNumber(accountNumber: string): string {
  const prefix = accountNumber.slice(0, 3); // "AGN"
  const digits = accountNumber.slice(3);
  if (digits.length <= 4) return `${prefix}-${digits}`;
  const last4 = digits.slice(-4);
  const maskedDigits = digits.slice(0, -4).replace(/./g, '•');
  const maskedGroups = maskedDigits.match(/.{1,3}/g)?.join('-') ?? maskedDigits;
  return `${prefix}-${maskedGroups}-${last4}`;
}

export function WalletCard({ balance, currency = 'UGX', accountNumber, holderName, escrowBalance = 0 }: WalletCardProps) {
  const [copied, setCopied] = useState(false);

  async function copyAccountNumber() {
    if (!accountNumber) return;
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard permission denied — masked number is still visible to read out manually */ }
  }

  return (
    <div
      style={{
        borderRadius: 22,
        padding: '22px 24px',
        background: 'linear-gradient(135deg, #0A5C36 0%, #1B6B3E 50%, #2D8A57 100%)',
        boxShadow: '0 10px 30px rgba(10,92,54,0.3), 0 3px 10px rgba(10,92,54,0.2)',
        color: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
        width: '100%',
        maxWidth: 400,
        aspectRatio: '1.586',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
      }}
    >
      {/* Subtle agricultural pattern — a soft leaf silhouette continuing the
          logo's visual language, low opacity, purely decorative. */}
      <svg aria-hidden="true" style={{ position: 'absolute', top: -30, right: -30, opacity: 0.10, pointerEvents: 'none' }} width="160" height="160" viewBox="0 0 160 160">
        <path d="M20,140 Q25,40 140,20 Q120,80 20,140 Z" fill="#FFFFFF" />
      </svg>

      {/* Header: logo + wordmark, WALLET label */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AppIcon size={26} />
          <Wordmark color="#FFFFFF" leafColor="#8BE9A8" style={{ fontSize: 15 }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>
          Wallet
        </span>
      </div>

      {/* Balance */}
      <div>
        <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', margin: '0 0 4px' }}>
          Available Balance
        </p>
        <p style={{ fontSize: 'clamp(24px, 7vw, 32px)', fontWeight: 900, letterSpacing: '-0.02em', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currency} {Math.round(balance).toLocaleString()}
        </p>
        {escrowBalance > 0 && (
          <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.65)', margin: '3px 0 0' }}>
            + {currency} {Math.round(escrowBalance).toLocaleString()} in escrow
          </p>
        )}
      </div>

      {/* Account number + holder */}
      <div>
        {accountNumber && (
          <>
            <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', margin: '0 0 2px' }}>
              Cropify Account Number
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <p style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', fontFamily: 'var(--font-mono, monospace)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {formatAccountNumber(accountNumber)}
              </p>
              <button
                type="button"
                onClick={copyAccountNumber}
                title="Copy your full account number"
                aria-label="Copy full account number"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  width: 22, height: 22, borderRadius: 7, border: 'none', cursor: 'pointer',
                  background: copied ? 'rgba(139,233,168,0.35)' : 'rgba(255,255,255,0.18)', color: '#fff',
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={11} />}
              </button>
              {copied && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#8BE9A8' }}>Copied — full number, safe to share</span>
              )}
            </div>
          </>
        )}
        <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', margin: '0 0 2px' }}>
          Account Holder
        </p>
        <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase', color: '#FFFFFF', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {holderName}
        </p>
      </div>
    </div>
  );
}
