'use client';

import { Printer } from 'lucide-react';

export function PrintInvoicesButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        padding: '9px 18px',
        borderRadius: 10,
        background: 'var(--color-sky)',
        color: '#fff',
        border: 'none',
        fontWeight: 700,
        fontSize: 13,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Printer size={14} />Print / Save PDF
    </button>
  );
}
