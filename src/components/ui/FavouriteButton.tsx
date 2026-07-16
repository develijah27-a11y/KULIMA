'use client';

import { useState } from 'react';
import { Bookmark } from 'lucide-react';

interface Props {
  /** Whose favourites list this saves into: a buyer saving a farmer to buy
   *  from again, or a farmer saving a supplier (agro-dealer) to reorder
   *  inputs from again. */
  kind?: 'farmer' | 'supplier';
  targetId: string;
  initialFavourited: boolean;
  size?: number;
  /** Shows the "Add to Favourites" / "Favourited" text next to the icon —
   *  off by default for compact placements (e.g. inside a card header). */
  showLabel?: boolean;
}

const KIND_CFG = {
  farmer:   { endpoint: '/api/favourites',           param: 'farmerId',   noun: 'farmer' },
  supplier: { endpoint: '/api/favourites/suppliers', param: 'supplierId', noun: 'supplier' },
} as const;

export function FavouriteButton({ kind = 'farmer', targetId, initialFavourited, size = 20, showLabel = false }: Props) {
  const [faved, setFaved] = useState(initialFavourited);
  const [loading, setLoading] = useState(false);
  const cfg = KIND_CFG[kind];

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);

    const next = !faved;
    setFaved(next); // optimistic

    try {
      if (next) {
        await fetch(cfg.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [cfg.param]: targetId }),
        });
      } else {
        await fetch(`${cfg.endpoint}?${cfg.param}=${encodeURIComponent(targetId)}`, {
          method: 'DELETE',
        });
      }
    } catch {
      setFaved(!next); // roll back
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={faved ? `Remove ${cfg.noun} from favourites` : `Add ${cfg.noun} to favourites`}
      title={faved ? 'Favourited' : 'Add to Favourites'}
      style={{
        background: faved ? 'var(--color-primary-bg)' : 'none',
        border: faved ? '1px solid var(--color-primary-muted)' : '1px solid var(--d-border)',
        cursor: loading ? 'wait' : 'pointer',
        padding: showLabel ? '6px 12px' : 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: 10,
        transition: 'transform 0.15s, background 0.15s, border-color 0.15s',
        transform: loading ? 'scale(0.94)' : 'scale(1)',
      }}
    >
      <Bookmark
        size={size}
        fill={faved ? 'var(--color-primary)' : 'none'}
        stroke={faved ? 'var(--color-primary)' : 'var(--d-muted)'}
        strokeWidth={2}
        style={{ transition: 'all 0.2s' }}
      />
      {showLabel && (
        <span style={{ fontSize: 12, fontWeight: 700, color: faved ? 'var(--color-primary)' : 'var(--d-muted)', whiteSpace: 'nowrap' }}>
          {faved ? 'Favourited' : 'Add to Favourites'}
        </span>
      )}
    </button>
  );
}
