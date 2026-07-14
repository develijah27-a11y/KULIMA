import Link from 'next/link';
import { Leaf, ArrowLeft } from 'lucide-react';

const BG     = '#020D05';
const CARD   = '#0A1C10';
const BORDER = 'rgba(74,222,128,0.10)';
const TEXT   = '#F0FDF4';
const MUTED  = 'rgba(240,253,244,0.62)';
const GREEN  = '#4ADE80';

interface Props {
  title: string;
  updated: string;
  children: React.ReactNode;
}

// Shared chrome for the public legal/support pages — matches the landing
// page's dark-green visual language rather than the dashboard's --d-*
// tokens, since these are pre-login marketing-site pages, not app screens.
export function LegalPage({ title, updated, children }: Props) {
  return (
    <div style={{ background: BG, color: TEXT, minHeight: '100vh', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(18px, 5vw, 64px)', height: 60,
        background: 'rgba(2,13,5,0.90)', backdropFilter: 'blur(18px)',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Leaf size={15} color="#031A08" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.03em', color: TEXT }}>AgriNova</span>
        </Link>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: MUTED, textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to home
        </Link>
      </nav>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(40px, 7vh, 72px) clamp(18px, 5vw, 40px) 100px' }}>
        <h1 style={{ fontSize: 'clamp(1.9rem, 4vw, 2.6rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 10px', lineHeight: 1.1 }}>
          {title}
        </h1>
        <p style={{ fontSize: 13, color: MUTED, fontWeight: 600, margin: '0 0 40px' }}>Last updated {updated}</p>

        <div className="legal-body" style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(240,253,244,0.85)' }}>
          {children}
        </div>
      </main>

      <footer style={{ padding: '22px clamp(18px, 5vw, 64px)', borderTop: `1px solid ${BORDER}`, textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>© 2026 AgriNova. All rights reserved.</p>
      </footer>

      <style>{`
        .legal-body h2 { font-size: 19px; font-weight: 800; color: ${TEXT}; letter-spacing: -0.015em; margin: 36px 0 12px; }
        .legal-body h2:first-child { margin-top: 0; }
        .legal-body h3 { font-size: 15.5px; font-weight: 700; color: ${TEXT}; margin: 22px 0 8px; }
        .legal-body p { margin: 0 0 14px; }
        .legal-body ul, .legal-body ol { margin: 0 0 14px; padding-left: 22px; }
        .legal-body li { margin-bottom: 7px; }
        .legal-body a { color: ${GREEN}; }
        .legal-body strong { color: ${TEXT}; }
        .legal-body table { width: 100%; border-collapse: collapse; margin: 8px 0 18px; font-size: 13.5px; }
        .legal-body th, .legal-body td { text-align: left; padding: 8px 10px; border: 1px solid ${BORDER}; }
        .legal-body th { background: ${CARD}; font-weight: 700; color: ${TEXT}; }
        .legal-callout { background: ${CARD}; border: 1px solid ${BORDER}; border-radius: 12px; padding: 16px 18px; margin: 18px 0; }
      `}</style>
    </div>
  );
}
