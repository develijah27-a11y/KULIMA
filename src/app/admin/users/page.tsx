import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

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
    .select('id, user_id, full_name, phone_number, location, role, created_at, primary_crop, verification_level', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (role) query = query.eq('role', role);
  if (q)    query = query.or(`full_name.ilike.%${q}%,phone_number.ilike.%${q}%,location.ilike.%${q}%`);

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
          <div className="divide-y" style={{ borderColor: C.border }}>
            {rows.map((u: any) => {
              const cfg = ROLE_CFG[u.role] ?? ROLE_CFG.farmer;
              // profiles.verification_level is a DB-level enum constrained to
              // grey/green/blue/gold (see 20260608000000_verification_trust.sql)
              // — not the none/basic/standard/premium labels this table used
              // to display. Falling back to 'grey' (the column's own DB
              // default) rather than trusting an unexpected value here.
              const VER_CFG: Record<string, { label: string; color: string }> = {
                grey:  { label: 'Unverified', color: C.muted },
                green: { label: 'Basic',      color: 'var(--color-harvest)' },
                blue:  { label: 'Standard',   color: 'var(--color-sky)' },
                gold:  { label: 'Premium',    color: 'var(--color-success)' },
              };
              const ver = VER_CFG[u.verification_level as string] ?? VER_CFG.grey;

              return (
                <div key={u.id} className="px-5 py-3.5 flex items-center gap-4">
                  {/* Name + phone */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
                      {(u.full_name ?? '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{u.full_name ?? 'Unknown'}</p>
                      <p className="text-[10px] truncate" style={{ color: C.muted }}>{u.phone_number ?? '—'}</p>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="hidden sm:block" style={{ width: 100 }}>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
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

                  {/* Mobile: role badge */}
                  <div className="sm:hidden shrink-0">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
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
