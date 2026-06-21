'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        padding: '10px 22px',
        borderRadius: 12,
        background: '#15803d',
        color: '#fff',
        border: 'none',
        fontWeight: 700,
        fontSize: 13,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 7,
      }}
    >
      🖨️ Print / Save PDF
    </button>
  );
}
