import { Suspense, cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', green: '#1B4332', greenMed: '#40916C', greenBright: '#52B788',
  amber: '#F4A261', red: '#E63946', blue: '#0077B6', purple: '#7C3AED',
  cardShadow: 'var(--d-shadow-card)',
} as const;

const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.cardBg, borderRadius: '14px', boxShadow: C.cardShadow, ...style }}>
    {children}
  </div>
);

const getProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('full_name, location, id').eq('user_id', userId).single();
  return data as any;
});

// Stats: try supplier_products table, fall back gracefully
async function SupplierStats({ userId }: { userId: string }) {
  const supabase = await createClient();

  const [walletRes, profileRes] = await Promise.all([
    (supabase.from as any)('wallets').select('balance').eq('user_id', userId).maybeSingle(),
    getProfile(userId),
  ]);

  // Try supplier-specific tables safely
  const productsRes = await (supabase.from as any)('supplier_products')
    .select('id', { count: 'exact', head: true })
    .eq('supplier_id', userId)
    .catch(() => ({ count: 0 }));

  const ordersRes = await (supabase.from as any)('supplier_orders')
    .select('id', { count: 'exact', head: true })
    .eq('supplier_id', userId)
    .eq('status', 'pending')
    .catch(() => ({ count: 0 }));

  const lowStockRes = await (supabase.from as any)('supplier_products')
    .select('id', { count: 'exact', head: true })
    .eq('supplier_id', userId)
    .lt('stock_quantity', 10)
    .catch(() => ({ count: 0 }));

  const stats = [
    { label: 'Products Listed', value: productsRes.count ?? 0, icon: '📦', sub: 'In your catalogue', border: C.greenBright },
    { label: 'Pending Orders', value: ordersRes.count ?? 0, icon: '🛒', sub: 'Awaiting processing', border: C.amber },
    { label: 'Low Stock Alerts', value: lowStockRes.count ?? 0, icon: '⚠️', sub: 'Need restocking', border: lowStockRes.count ? C.red : C.muted },
    { label: 'Wallet Balance', value: `UGX ${Math.round(walletRes?.data?.balance ?? 0).toLocaleString()}`, icon: '💳', sub: 'Available balance', border: C.blue },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon, sub, border }) => (
        <div key={label} style={{ background: C.cardBg, borderRadius: '12px', boxShadow: C.cardShadow, borderTop: `3px solid ${border}`, padding: '18px 20px' }}>
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-semibold" style={{ color: C.muted }}>{label}</p>
            <span className="text-xl">{icon}</span>
          </div>
          <p className="text-2xl font-black" style={{ color: C.text, letterSpacing: '-0.03em' }}>{value}</p>
          <p className="text-xs mt-1" style={{ color: C.muted }}>{sub}</p>
        </div>
      ))}
    </div>
  );
}

function QuickActions() {
  const actions = [
    { label: 'Add Product', href: '/supplier/catalogue/add', emoji: '➕', bg: '#F0FDF4', color: '#1B4332' },
    { label: 'View Orders', href: '/supplier/orders', emoji: '📋', bg: '#EFF6FF', color: C.blue },
    { label: 'Update Prices', href: '/supplier/catalogue', emoji: '💰', bg: '#FFFBEB', color: '#D97706' },
    { label: 'Demand Map', href: '/supplier/demand', emoji: '🗺️', bg: '#F5F3FF', color: C.purple },
    { label: 'Analytics', href: '/supplier/analytics', emoji: '📊', bg: '#FEF2F2', color: C.red },
  ];

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Quick Actions</p>
      </div>
      <div className="grid grid-cols-5 gap-2 p-4">
        {actions.map(({ label, href, emoji, bg, color }) => (
          <Link key={label} href={href} className="flex flex-col items-center gap-2 py-4 rounded-xl hover:opacity-85 transition-opacity" style={{ background: bg, textDecoration: 'none' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: 'rgba(255,255,255,0.7)' }}>
              {emoji}
            </div>
            <span className="text-[10px] font-bold text-center px-1 leading-tight" style={{ color }}>{label}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

// Demand intelligence banner — which crops are being searched by farmers
async function DemandIntelligence() {
  const supabase = await createClient();

  // Pull from recent listings to infer input demand
  const { data: listings } = await (supabase.from as any)('listings')
    .select('crop_type, district')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = listings ?? [];
  const cropCount: Record<string, number> = {};
  const districtCount: Record<string, number> = {};
  rows.forEach((l: any) => {
    if (l.crop_type) cropCount[l.crop_type] = (cropCount[l.crop_type] ?? 0) + 1;
    if (l.district) districtCount[l.district] = (districtCount[l.district] ?? 0) + 1;
  });

  const topCrops = Object.entries(cropCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topDistricts = Object.entries(districtCount).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const CROP_INPUTS: Record<string, string> = {
    maize: 'NPK, DAP, Urea, Seed',
    coffee: 'Foliar spray, Mulch, Weedicide',
    beans: 'Rhizobium inoculant, Sulphate of Ammonia',
    rice: 'NPK 17-17-17, Basamid, Transplant tools',
    banana: 'Potassium Nitrate, Musa weevil spray',
    cassava: 'Cuttings, Mancozeb fungicide',
    tomato: 'Calcium Nitrate, Dithane, Nematicide',
    sunflower: 'Triple Super Phosphate, CAN',
  };

  return (
    <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' }}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: 'rgba(82,183,136,0.2)' }}>
          📡
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#52B788' }}>Demand Intelligence</p>
          <p className="text-sm font-bold text-white">What farmers near you are growing</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Stock these inputs to match current market demand</p>
        </div>
      </div>

      {topCrops.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {topCrops.map(([crop, count]) => (
            <div key={crop} className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <p className="text-xs font-bold text-white capitalize">{crop}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>{count} farms</p>
              <p className="text-[10px] mt-1 leading-tight" style={{ color: '#52B788' }}>{CROP_INPUTS[crop] ?? 'General inputs'}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Market data loading…</p>
      )}

      {topDistricts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>Active districts:</span>
          {topDistricts.map(([d, count]) => (
            <span key={d} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(82,183,136,0.2)', color: '#52B788' }}>
              {d} ({count})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Pending orders section
async function RecentOrders({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: orders, error } = await (supabase.from as any)('supplier_orders')
    .select('id, product_name, quantity, unit, status, buyer_name, district, created_at')
    .eq('supplier_id', userId)
    .order('created_at', { ascending: false })
    .limit(6);

  const rows = error ? [] : (orders ?? []);

  const STATUS: Record<string, { label: string; color: string; bg: string }> = {
    pending:   { label: 'Pending',   color: '#D97706', bg: '#FEF3C7' },
    confirmed: { label: 'Confirmed', color: '#0284C7', bg: '#DBEAFE' },
    delivered: { label: 'Delivered', color: '#059669', bg: '#D1FAE5' },
    cancelled: { label: 'Cancelled', color: '#DC2626', bg: '#FEE2E2' },
  };

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Recent Orders</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>Incoming from farmers & buyers</p>
        </div>
        <Link href="/supplier/orders" className="text-xs font-semibold" style={{ color: C.greenMed }}>View all →</Link>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-3xl mb-3">📭</p>
          <p className="text-sm font-bold" style={{ color: C.text }}>No orders yet</p>
          <p className="text-xs mt-1 mb-4" style={{ color: C.muted }}>Add products to your catalogue so farmers can order from you</p>
          <Link href="/supplier/catalogue/add" className="inline-block px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: C.greenMed, textDecoration: 'none' }}>
            Add First Product →
          </Link>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {rows.map((o: any) => {
            const st = STATUS[o.status] ?? STATUS.pending;
            return (
              <div key={o.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: '#F0FDF4' }}>🧪</div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: C.text }}>{o.product_name}</p>
                    <p className="text-[11px]" style={{ color: C.muted }}>{o.quantity} {o.unit} · {o.buyer_name ?? o.district}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0" style={{ background: st.bg, color: st.color }}>{st.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// Product catalogue preview
async function CataloguePreview({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: products, error } = await (supabase.from as any)('supplier_products')
    .select('id, name, category, price_ugx, unit, stock_quantity, is_active')
    .eq('supplier_id', userId)
    .eq('is_active', true)
    .order('stock_quantity', { ascending: true })
    .limit(6);

  const rows = error ? [] : (products ?? []);

  const CATEGORY_ICON: Record<string, string> = {
    fertilizer: '🌿', seed: '🌱', pesticide: '🧪', herbicide: '🌾',
    tool: '🔧', irrigation: '💧', organic: '♻️',
  };

  return (
    <Card>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Your Catalogue</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>Sorted by lowest stock first</p>
        </div>
        <Link href="/supplier/catalogue" className="text-xs font-semibold" style={{ color: C.greenMed }}>Manage →</Link>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-3xl mb-3">🏪</p>
          <p className="text-sm font-bold" style={{ color: C.text }}>Your catalogue is empty</p>
          <p className="text-xs mt-1 mb-4" style={{ color: C.muted }}>List seeds, fertilizers, pesticides and tools for farmers to find you</p>
          <Link href="/supplier/catalogue/add" className="inline-block px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: C.greenMed, textDecoration: 'none' }}>
            Add First Product →
          </Link>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: C.border }}>
          {rows.map((p: any) => {
            const lowStock = (p.stock_quantity ?? 999) < 10;
            return (
              <div key={p.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: lowStock ? '#FEF2F2' : '#F0FDF4' }}>
                    {CATEGORY_ICON[p.category] ?? '📦'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: C.text }}>{p.name}</p>
                    <p className="text-[11px]" style={{ color: C.muted }}>Stock: {p.stock_quantity ?? 0} {p.unit}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black" style={{ color: C.text }}>UGX {Math.round(p.price_ugx ?? 0).toLocaleString()}</p>
                  {lowStock && (
                    <span className="text-[10px] font-bold" style={{ color: C.red }}>⚠ Low stock</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// Tips / Getting started for new suppliers
function GettingStarted() {
  const steps = [
    { done: false, icon: '🏪', title: 'Add your products', sub: 'List seeds, fertilizers, pesticides & tools', href: '/supplier/catalogue/add' },
    { done: false, icon: '📍', title: 'Set your coverage area', sub: 'Which districts do you deliver to?', href: '/supplier/settings' },
    { done: false, icon: '💳', title: 'Set up your wallet', sub: 'Receive payments from farmers directly', href: '/supplier/wallet' },
    { done: false, icon: '📣', title: 'Get verified', sub: 'Boost trust with a verification badge', href: '/supplier/verify' },
  ];

  return (
    <Card>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Getting Started</p>
        <p className="text-xs mt-0.5" style={{ color: C.muted }}>Complete these steps to start receiving orders</p>
      </div>
      <div className="divide-y" style={{ borderColor: C.border }}>
        {steps.map(({ icon, title, sub, href }) => (
          <Link key={title} href={href} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors" style={{ textDecoration: 'none' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: '#F0FDF4' }}>{icon}</div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: C.text }}>{title}</p>
              <p className="text-xs" style={{ color: C.muted }}>{sub}</p>
            </div>
            <span style={{ color: C.muted }}>→</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

export default async function SupplierDashboardPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) redirect('/auth/signin');
  const userId = session.user.id;
  const profile = await getProfile(userId);
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Supplier';

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Welcome, {firstName} 👋
          </h1>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>
            Input Supplier Hub · {profile?.location ?? 'Uganda'}
          </p>
        </div>
        <Link href="/supplier/catalogue/add" className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: C.greenMed, textDecoration: 'none' }}>
          + Add Product
        </Link>
      </div>

      {/* Stats */}
      <Suspense fallback={<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="dash-skeleton h-28 rounded-xl" />)}</div>}>
        <SupplierStats userId={userId} />
      </Suspense>

      {/* Quick Actions */}
      <QuickActions />

      {/* Demand intelligence */}
      <Suspense fallback={<div className="dash-skeleton h-36 rounded-xl" />}>
        <DemandIntelligence />
      </Suspense>

      {/* Orders + Catalogue (2-col) */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Suspense fallback={<div className="dash-skeleton h-72 rounded-xl" />}>
          <RecentOrders userId={userId} />
        </Suspense>
        <Suspense fallback={<div className="dash-skeleton h-72 rounded-xl" />}>
          <CataloguePreview userId={userId} />
        </Suspense>
      </div>

      {/* Getting started */}
      <GettingStarted />

    </div>
  );
}
