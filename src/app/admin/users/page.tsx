import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { UsersTableClient } from './UsersTableClient';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)', greenBright: 'var(--color-primary-muted)',
  amber: 'var(--color-harvest)', red: 'var(--color-danger)', blue: 'var(--color-sky)', violet: 'var(--color-purple)',
  cardShadow: 'var(--d-shadow-card)',
} as const;

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

const ALL_ROLES = Object.keys(ROLE_CFG);

function timeAgo(iso: string) {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return 'Today';
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: me } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if ((me as any)?.role !== 'admin') redirect('/dashboard');

  const sp   = await searchParams;
  const q    = sp.q ?? '';
  const role = sp.role ?? '';
  const page = parseInt(sp.page ?? '1', 10);
  const PAGE_SIZE = 20;

  // Build query
  let query = (supabase.from as any)('profiles')
    .select('id, user_id, full_name, phone_number, location, role, created_at, primary_crop, verification_level, is_suspended, quality_strikes, suspension_reason', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (role) query = query.eq('role', role);
  const cleanQ = q.replace(/[^a-zA-Z0-9\s_\-]/g, '').trim().slice(0, 80);
  if (cleanQ) query = query.or(`full_name.ilike.%${cleanQ}%,phone_number.ilike.%${cleanQ}%,location.ilike.%${cleanQ}%`);

  const [{ data: users, count }, { data: roleCounts }] = await Promise.all([
    query,
    (supabase.from as any)('profiles').select('role'),
  ]);
  const rows = users ?? [];
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  const countMap: Record<string, number> = {};
  (roleCounts ?? []).forEach((p: any) => { countMap[p.role ?? 'farmer'] = (countMap[p.role ?? 'farmer'] ?? 0) + 1; });

  function filterUrl(changes: Record<string, string>) {
    const params = new URLSearchParams({ q, role, page: '1', ...changes });
    if (!params.get('q')) params.delete('q');
    if (!params.get('role')) params.delete('role');
    return `/admin/users?${params}`;
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
            User Management
          </h1>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>
            {(count ?? 0).toLocaleString()} total accounts across all roles
          </p>
        </div>
      </div>

      {/* Role filter tabs */}
      <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '12px 16px' }}>
        {/* Search */}
        <form method="get" action="/admin/users" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input name="role" type="hidden" value={role} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name, phone, or district..."
            style={{ flex: 1, padding: '9px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, outline: 'none', color: C.text, background: 'var(--d-input-bg)' }}
          />
          <button type="submit" style={{ padding: '9px 20px', background: C.green, color: '#fff', borderRadius: 10, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            Search
          </button>
          {q && (
            <a href={filterUrl({ q: '' })} style={{ padding: '9px 14px', background: 'var(--color-surface-2)', borderRadius: 10, fontSize: 13, color: C.muted, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              Clear ×
            </a>
          )}
        </form>

        {/* Role chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <a href={filterUrl({ role: '' })} style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: !role ? C.green : 'var(--color-surface-2)', color: !role ? '#fff' : C.muted, textDecoration: 'none' }}>
            All ({(count ?? 0).toLocaleString()})
          </a>
          {ALL_ROLES.filter(r => r !== 'admin').map(r => {
            const cfg = ROLE_CFG[r];
            const c = countMap[r] ?? 0;
            if (c === 0) return null;
            return (
              <a key={r} href={filterUrl({ role: r })} style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: role === r ? cfg.color : cfg.bg, color: role === r ? '#fff' : cfg.color, textDecoration: 'none' }}>
                {cfg.label} ({c})
              </a>
            );
          })}
        </div>
      </div>

      {/* Users table */}
      <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, overflow: 'hidden' }}>
        {/* Table header */}
        <div className="hidden sm:grid" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 0.8fr', padding: '12px 20px', borderBottom: `1px solid ${C.border}`, background: 'var(--color-surface-2)' }}>
          {['User', 'Role', 'Location', 'Joined', 'Verification'].map(h => (
            <p key={h} className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.muted }}>{h}</p>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="py-16 text-center">
            <div className="flex justify-center mb-3" style={{ color: 'var(--d-muted)' }}><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></div>
            <p className="text-sm font-semibold" style={{ color: C.text }}>No users found</p>
            <p className="text-xs mt-1" style={{ color: C.muted }}>Try adjusting your search or role filter</p>
          </div>
        ) : (
          <UsersTableClient users={rows as any} />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderTop: `1px solid ${C.border}` }}>
            <p className="text-xs" style={{ color: C.muted }}>
              Page {page} of {totalPages} · {(count ?? 0).toLocaleString()} total
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <a href={filterUrl({ page: String(page - 1) })} style={{ padding: '6px 14px', borderRadius: 8, background: 'var(--color-surface-2)', fontSize: 12, fontWeight: 600, color: C.text, textDecoration: 'none' }}>
                  ← Prev
                </a>
              )}
              {page < totalPages && (
                <a href={filterUrl({ page: String(page + 1) })} style={{ padding: '6px 14px', borderRadius: 8, background: C.green, fontSize: 12, fontWeight: 600, color: '#fff', textDecoration: 'none' }}>
                  Next →
                </a>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
