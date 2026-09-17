'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Building2,
  CheckCircle2,
  Clock,
  Printer,
  ShieldCheck,
  ArrowRight,
  Info,
  Scale,
  Sparkles,
  Receipt,
  FileCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ContractRow {
  id: string;
  crop_type: string;
  quantity_kg: number;
  price_ugx: number;
  farmer_name: string | null;
  district?: string | null;
  delivery_date: string;
  payment_status: string;
  status: string;
}

interface Props {
  rows: ContractRow[];
}

export function OfftakerInvoicesClient({ rows }: Props) {
  const [tab, setTab] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [showSample, setShowSample] = useState(rows.length === 0);
  const [showExplanation, setShowExplanation] = useState(true);

  const unpaid = rows.filter(c => c.payment_status !== 'paid');
  const paid = rows.filter(c => c.payment_status === 'paid');

  const filtered = tab === 'all' ? rows : tab === 'unpaid' ? unpaid : paid;

  // Sample Enterprise Outgrower Contract Invoice
  const sampleInvoice = {
    id: 'DEMO-OFT-2026-091',
    contractRef: 'CTR-OFT-BARLEY-50MT',
    cooperativeName: 'Tororo Grain & Barley Producers Cooperative',
    district: 'Tororo & Mbale Region',
    cropType: 'Malting Sorghum / Barley (Grade A)',
    tonnageKg: 50_000, // 50 Metric Tons
    pricePerKg: 1_600,
    grossAmount: 80_000_000,
    whtRate: 0.06, // 6% URA Withholding Tax
    whtAmount: 4_800_000,
    netPayable: 75_200_000,
    weighbridgeTicket: 'WB-DEPOT-88391',
    moistureContent: '12.6% (Standard ≤ 13.5%)',
    factoryIntakeDate: '17 Sept 2026',
    efrisCode: 'URA-EFRIS-2026-UG-8821940',
    disbursementMethod: 'Bank Wire / EFT (Stanbic / Absa Corporate)',
  };

  return (
    <div className="space-y-5">
      {/* ── Institutional Enterprise Banner (User's Exact Specification) ──────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(2,132,199,0.08) 0%, rgba(14,165,233,0.03) 100%)',
          borderRadius: 18,
          border: '1.5px solid rgba(14,165,233,0.25)',
          padding: '20px 24px',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'var(--color-sky-bg)',
                color: 'var(--color-sky)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Building2 size={20} />
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <h2 style={{ fontSize: 16, fontWeight: 900, color: 'var(--d-text)', margin: 0, letterSpacing: '-0.02em' }}>
                  Enterprise Offtaker Invoicing & Tax Compliance
                </h2>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'var(--color-sky-bg)',
                    color: 'var(--color-sky)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  Strictly Scoped to Offtaker Portal
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--d-text)', margin: '0 0 6px', lineHeight: 1.5, fontWeight: 600 }}>
                Over 75% of formal agricultural financing in Uganda operates through contract outgrower schemes.
              </p>
              <p style={{ fontSize: 12, color: 'var(--d-muted)', margin: 0, lineHeight: 1.55 }}>
                <strong>Why invoices appear here:</strong> When a contracted bulk delivery arrives at your processing facility or factory warehouse, the corporate finance department requires a formal <strong>Contract Invoice</strong> for corporate tax audits, statutory Withholding Tax (WHT @ 6% under URA), weighbridge intake verification, and commercial bank wire disbursements.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowExplanation(prev => !prev)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--d-muted)',
              cursor: 'pointer',
              padding: 4,
            }}
            title="Toggle details"
          >
            {showExplanation ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {showExplanation && (
          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: '1px solid rgba(14,165,233,0.15)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 12,
              fontSize: 11.5,
              color: 'var(--d-muted)',
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <ShieldCheck size={16} style={{ color: 'var(--color-sky)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ color: 'var(--d-text)' }}>Corporate Tax Audit Ready:</strong> Every invoice tracks contract ID, weighbridge intake weight, moisture metrics, and net settlement.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Receipt size={16} style={{ color: 'var(--color-sky)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ color: 'var(--d-text)' }}>Role Scoping:</strong> Retail buyers & small farmers use the standard <em>Marketplace & My Orders</em> flow and never see contracts.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Summary Metrics ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        <div style={{ background: 'var(--d-card)', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--d-border)', boxShadow: 'var(--d-shadow-card)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--d-muted)', textTransform: 'uppercase', margin: '0 0 4px' }}>Completed Contracts</p>
          <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--d-text)', margin: 0 }}>{rows.length}</p>
        </div>
        <div style={{ background: 'var(--d-card)', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--d-border)', boxShadow: 'var(--d-shadow-card)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--d-muted)', textTransform: 'uppercase', margin: '0 0 4px' }}>Awaiting Payment</p>
          <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-harvest)', margin: 0 }}>{unpaid.length}</p>
        </div>
        <div style={{ background: 'var(--d-card)', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--d-border)', boxShadow: 'var(--d-shadow-card)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--d-muted)', textTransform: 'uppercase', margin: '0 0 4px' }}>Settled Invoices</p>
          <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-primary)', margin: 0 }}>{paid.length}</p>
        </div>
        <div style={{ background: 'var(--d-card)', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--d-border)', boxShadow: 'var(--d-shadow-card)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--d-muted)', textTransform: 'uppercase', margin: '0 0 4px' }}>Standard WHT Rate</p>
          <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-sky)', margin: 0 }}>6.0%</p>
        </div>
      </div>

      {/* ── View Controls ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { key: 'all' as const, label: 'All Invoices' },
            { key: 'unpaid' as const, label: `Awaiting Wire (${unpaid.length})` },
            { key: 'paid' as const, label: `Settled (${paid.length})` },
          ].map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => { setTab(t.key); setShowSample(false); }}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: !showSample && tab === t.key ? 'var(--color-sky)' : 'var(--color-surface-2)',
                color: !showSample && tab === t.key ? '#fff' : 'var(--d-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowSample(true)}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              border: `1.5px solid ${showSample ? 'var(--color-sky)' : 'var(--d-border)'}`,
              cursor: 'pointer',
              background: showSample ? 'var(--color-sky-bg)' : 'transparent',
              color: showSample ? 'var(--color-sky)' : 'var(--d-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Sparkles size={12} /> Sample Audit Invoice (50 MT)
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              background: 'var(--color-surface-2)',
              border: '1px solid var(--d-border)',
              color: 'var(--d-text)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Printer size={13} /> Print List
          </button>
          <Link
            href="/offtaker/pipeline/new"
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              background: 'var(--color-sky)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 800,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            + New Forward Contract
          </Link>
        </div>
      </div>

      {/* ── Active View: Sample Compliant Invoice vs Real Invoices ─────────── */}
      {showSample ? (
        <div
          style={{
            background: 'var(--d-card)',
            borderRadius: 20,
            boxShadow: 'var(--d-shadow-card)',
            padding: '24px 28px',
            border: '1.5px solid var(--color-sky)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 900, background: 'var(--color-sky-bg)', color: 'var(--color-sky)', padding: '2px 8px', borderRadius: 4 }}>
                  SAMPLE COMPLIANT CORPORATE INVOICE
                </span>
                <span style={{ fontSize: 11, color: 'var(--d-muted)' }}>URA EFRIS: {sampleInvoice.efrisCode}</span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--d-text)', margin: '4px 0 0' }}>
                Invoice #{sampleInvoice.id} · {sampleInvoice.cropType}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--d-muted)', margin: '2px 0 0' }}>
                Supplier: <strong>{sampleInvoice.cooperativeName}</strong> ({sampleInvoice.district})
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 999, background: 'var(--color-harvest-bg)', color: 'var(--color-harvest)' }}>
                Weighbridge Gate Verified · Ready for Wire
              </span>
              <p style={{ fontSize: 11, color: 'var(--d-muted)', margin: '4px 0 0' }}>Intake: {sampleInvoice.factoryIntakeDate}</p>
            </div>
          </div>

          {/* Weighbridge Intake & Quality Specs */}
          <div
            style={{
              background: 'var(--color-surface-2)',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 20,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 10,
              fontSize: 12,
              border: '1px solid var(--d-border)',
            }}
          >
            <div>
              <span style={{ color: 'var(--d-muted)', display: 'block', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>Intake Weighbridge</span>
              <strong style={{ color: 'var(--d-text)' }}>{sampleInvoice.weighbridgeTicket}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--d-muted)', display: 'block', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>Intake Weight</span>
              <strong style={{ color: 'var(--d-text)' }}>{sampleInvoice.tonnageKg.toLocaleString()} kg (50 MT)</strong>
            </div>
            <div>
              <span style={{ color: 'var(--d-muted)', display: 'block', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>Moisture Certified</span>
              <strong style={{ color: 'var(--color-primary)' }}>{sampleInvoice.moistureContent}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--d-muted)', display: 'block', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>Settlement Channel</span>
              <strong style={{ color: 'var(--d-text)' }}>{sampleInvoice.disbursementMethod}</strong>
            </div>
          </div>

          {/* Financial Breakdown with 6% Withholding Tax (WHT) */}
          <div style={{ borderTop: '1px solid var(--d-border)', paddingTop: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px 0', color: 'var(--d-muted)' }}>
                    Gross Outgrower Produce Value (50,000 kg × UGX 1,600/kg)
                  </td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 800, color: 'var(--d-text)' }}>
                    UGX {sampleInvoice.grossAmount.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', color: 'var(--color-danger)' }}>
                    Less: Statutory Withholding Tax (WHT @ 6% under Uganda Revenue Authority)
                  </td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 800, color: 'var(--color-danger)' }}>
                    - UGX {sampleInvoice.whtAmount.toLocaleString()}
                  </td>
                </tr>
                <tr style={{ borderTop: '1.5px solid var(--d-border)' }}>
                  <td style={{ padding: '12px 0 4px', fontSize: 15, fontWeight: 900, color: 'var(--d-text)' }}>
                    Net Amount Payable to Cooperative via Bank Wire
                  </td>
                  <td style={{ padding: '12px 0 4px', textAlign: 'right', fontSize: 22, fontWeight: 900, color: 'var(--color-sky)', letterSpacing: '-0.02em' }}>
                    UGX {sampleInvoice.netPayable.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Action Row */}
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                padding: '9px 18px',
                borderRadius: 10,
                background: 'var(--color-surface-2)',
                border: '1px solid var(--d-border)',
                color: 'var(--d-text)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Printer size={14} /> Print Sample Voucher
            </button>
            <Link
              href="/offtaker/pipeline/new"
              style={{
                padding: '9px 18px',
                borderRadius: 10,
                background: 'var(--color-sky)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 800,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Issue Real Outgrower Contract →
            </Link>
          </div>
        </div>
      ) : filtered.length > 0 ? (
        <div style={{ background: 'var(--d-card)', borderRadius: 18, boxShadow: 'var(--d-shadow-card)', overflow: 'hidden', border: '1px solid var(--d-border)' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--d-border)', display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 0.8fr 0.7fr 0.5fr', gap: 8 }}>
            {['Contract & Cooperative', 'Gross Total', 'Delivery Date', 'Settlement', ''].map(h => (
              <p key={h} style={{ fontSize: 10, fontWeight: 800, color: 'var(--d-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</p>
            ))}
          </div>

          {filtered.map((c, i) => {
            const amount = (c.price_ugx ?? 0) * (c.quantity_kg ?? 0);
            const wht = Math.round(amount * 0.06);
            const net = Math.round(amount * 0.94);
            const isPaid = c.payment_status === 'paid';
            return (
              <div
                key={c.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 0.9fr 0.8fr 0.7fr 0.5fr',
                  gap: 8,
                  alignItems: 'center',
                  padding: '16px 20px',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--d-border)' : 'none',
                }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--d-text)', margin: '0 0 2px', textTransform: 'capitalize' }}>
                    {c.crop_type} ({(c.quantity_kg ?? 0).toLocaleString()} kg)
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--d-muted)', margin: 0 }}>
                    {c.farmer_name ?? c.district ?? 'Verified Farmer Cooperative'}
                  </p>
                </div>

                <div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-sky)', margin: 0 }}>
                    UGX {Math.round(amount).toLocaleString()}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--d-muted)', margin: '1px 0 0' }}>
                    Net after 6% WHT: UGX {net.toLocaleString()}
                  </p>
                </div>

                <p style={{ fontSize: 12, color: 'var(--d-muted)', margin: 0 }}>
                  {new Date(c.delivery_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>

                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: isPaid ? 'var(--color-success-bg)' : 'var(--color-harvest-bg)',
                    color: isPaid ? 'var(--color-success)' : 'var(--color-harvest)',
                    display: 'inline-block',
                    width: 'fit-content',
                  }}
                >
                  {isPaid ? 'Settled (Bank Wire)' : 'Awaiting Wire'}
                </span>

                <Link
                  href={`/offtaker/invoices/${c.id}`}
                  style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-sky)', textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  View Invoice →
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div style={{ background: 'var(--d-card)', borderRadius: 18, boxShadow: 'var(--d-shadow-card)', padding: '44px 24px', textAlign: 'center', border: '1px solid var(--d-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14, color: 'var(--d-muted)' }}>
            <FileText size={48} />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--d-text)', margin: '0 0 6px' }}>
            No Completed Contract Invoices Yet
          </h3>
          <p style={{ fontSize: 13, color: 'var(--d-muted)', maxWidth: 460, margin: '0 auto 18px', lineHeight: 1.5 }}>
            Formal contract invoices are generated when forward outgrower deliveries arrive at factory depots and are confirmed by intake weighbridge inspectors.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowSample(true)}
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                border: '1.5px solid var(--color-sky)',
                background: 'var(--color-sky-bg)',
                color: 'var(--color-sky)',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              View Sample Compliant Invoice (50 MT)
            </button>
            <Link
              href="/offtaker/contracts"
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                background: 'var(--color-sky)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 800,
                textDecoration: 'none',
              }}
            >
              View Active Contracts →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
