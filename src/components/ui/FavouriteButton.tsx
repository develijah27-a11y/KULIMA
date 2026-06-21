'use client';

import { useState } from 'react';

interface Props {
  farmerId: string;
  initialFavourited: boolean;
  size?: number;
}

export function FavouriteButton({ farmerId, initialFavourited, size = 20 }: Props) {
  const [faved, setFaved] = useState(initialFavourited);
  const [loading, setLoading] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);

    const next = !faved;
    setFaved(next); // optimistic

    try {
      if (next) {
        await fetch('/api/favourites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ farmerId }),
        });
      } else {
        await fetch(`/api/favourites?farmerId=${encodeURIComponent(farmerId)}`, {
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
      aria-label={faved ? 'Remove from favourites' : 'Add to favourites'}
      title={faved ? 'Remove from favourites' : 'Save farmer'}
      style={{
        background: 'none',
        border: 'none',
        cursor: loading ? 'wait' : 'pointer',
        padding: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        transition: 'transform 0.15s',
        transform: loading ? 'scale(0.9)' : 'scale(1)',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={faved ? '#ef4444' : 'none'}
        stroke={faved ? '#ef4444' : 'var(--d-muted)'}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: 'all 0.2s' }}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
