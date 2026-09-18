'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserActionDrawer, type AdminUser } from './UserActionDrawer';
import { ChevronRight, Ban, AlertTriangle, Phone } from 'lucide-react';

interface Props {
  users: AdminUser[];
}

const ROLE_CFG: Record<string, { color: string; bg: string; label: string }> = {
  farmer:      { color: 'var(--color-success)',  bg: 'var(--color-success-bg)',  label: 'Farmer' },
  buyer:       { color: 'var(--color-harvest)',  bg: 'var(--color-harvest-bg)',  label: 'Buyer' },
  transporter: { color: 'var(--color-sky)',      bg: 'var(--color-sky-bg)',      label: 'Transporter' },
  supplier:    { color: 'var(--color-purple)',   bg: 'var(--color-purple-bg)',   label: 'Supplier' },
  pathologist: { color: 'var(--color-danger)',   bg: 'var(--color-danger-bg)',   label: 'Pathologist' },
  offtaker:    { color: 'var(--color-cyan)',     bg: 'var(--color-cyan-bg)',     label: 'Offtaker' },
  groups:      { color: 'var(--color-lime)',     bg: 'var(--color-lime-bg)',     label: 'Group Admin' },
  admin:       { color: 'var(--d-muted)',         bg: 'var(--color-surface-2)',   label: 'Admin' },
};

function timeAgo(iso: string) {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return 'Today';
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export function UsersTableClient({ users }: Props) {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const C = {
    text: 'var(--d-text)',
    muted: 'var(--d-muted)',
    border: 'var(--d-border)',
  };

  const VER_CFG: Record<string, { label: string; color: string }> = {
    grey:  { label: 'Unverified', color: C.muted },
    green: { label: 'Basic',      color: 'var(--color-harvest)' },
    blue:  { label: 'Standard',   color: 'var(--color-sky)' },
    gold:  { label: 'Premium',    color: 'var(--color-success)' },
  };

  return (
    <>
      <div className="divide-y" style={{ borderColor: C.border }}>
        {users.map((u) => {
          const cfg = ROLE_CFG[u.role] ?? ROLE_CFG.farmer;
          const ver = VER_CFG[u.verification_level as string] ?? VER_CFG.grey;

          return (
            <div
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className="px-5 py-3.5 flex items-center gap-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              {/* Name + phone */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  {(u.full_name ?? '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate" style={{ color: C.text }}>
                      {u.full_name ?? 'Unknown'}
                    </p>
                    {u.is_suspended && (
                      <span
                        className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                        style={{
                          background: 'var(--color-danger-bg)',
                          color: 'var(--color-danger)',
                          border: '1px solid var(--color-danger)',
                        }}
                      >
                        SUSPENDED
                      </span>
                    )}
                    {(u.quality_strikes ?? 0) > 0 && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: 'var(--color-harvest-bg)',
                          color: 'var(--color-harvest)',
                        }}
                      >
                        ⚠️ {u.quality_strikes ?? 0} strike{(u.quality_strikes ?? 0) > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] truncate" style={{ color: C.muted }}>
                    {u.phone_number ?? '—'}
                  </p>
                </div>
              </div>

              {/* Role */}
              <div className="hidden sm:block" style={{ width: 100 }}>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  {cfg.label}
                </span>
              </div>

              {/* Location */}
              <div className="hidden sm:block flex-1 min-w-0">
                <p className="text-xs truncate" style={{ color: C.muted }}>{u.location ?? '—'}</p>
                {u.primary_crop && <p className="text-[10px] capitalize" style={{ color: C.muted }}>{u.primary_crop}</p>}
              </div>

              {/* Joined */}
              <div className="hidden sm:block" style={{ width: 80 }}>
                <p className="text-xs" style={{ color: C.muted }}>{timeAgo(u.created_at)}</p>
              </div>

              {/* Verification */}
              <div className="hidden sm:block" style={{ width: 90 }}>
                <p className="text-xs font-semibold" style={{ color: ver.color }}>{ver.label}</p>
              </div>

              {/* Quick Action button */}
              <div className="shrink-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedUser(u);
                  }}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: 'var(--color-surface-2)',
                    border: `1px solid ${C.border}`,
                    color: C.text,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  Manage →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedUser && (
        <UserActionDrawer
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdated={() => {
            router.refresh();
            setSelectedUser(null);
          }}
        />
      )}
    </>
  );
}
