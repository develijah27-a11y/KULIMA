'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  WifiOff,
  RotateCcw,
  Home,
  MapPin,
  Receipt,
  Package,
  Microscope,
  PlusCircle,
  CloudUpload,
  CheckCircle2,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { getPendingCount, onQueueChanged } from '@/lib/db';
import { getQueuedFarms, onFarmQueueChanged } from '@/lib/offline-farm-queue';

const C = {
  text: 'var(--d-text, #111827)',
  muted: 'var(--d-muted, #6B7280)',
  border: 'var(--d-border, #E5E7EB)',
  card: 'var(--d-card, #FFFFFF)',
  primary: 'var(--color-primary, #166B3A)',
  primaryBg: 'var(--color-primary-bg, #EAF6EE)',
  harvest: 'var(--color-harvest, #D97706)',
  harvestBg: 'var(--color-harvest-bg, #FEF3C7)',
  bg: 'var(--color-bg, #F8FAFC)',
};

const OFFLINE_TOOLS = [
  {
    title: 'Ugandan Planting Calendar & Seasons',
    desc: 'First & Second Wet Seasons, optimal planting dates & crop windows',
    href: '/farmer/planting',
    icon: <Calendar size={20} className="text-emerald-600" />,
  },
  {
    title: 'Market & Commodity Price Snapshots',
    desc: 'Browse cached wholesale & retail crop prices across Uganda',
    href: '/farmer/prices',
    icon: <TrendingUp size={20} className="text-amber-600" />,
  },
  {
    title: 'Plant Doctor Field Guide',
    desc: 'Browse symptoms & treatments for Uganda crop diseases',
    href: '/farmer/doctor',
    icon: <Microscope size={20} className="text-purple-600" />,
  },
  {
    title: 'My Farms & GPS Boundaries',
    desc: 'View field boundaries and acreage cached on this phone',
    href: '/farmer/farm',
    icon: <MapPin size={20} className="text-emerald-600" />,
  },
  {
    title: 'Walk & Record New Farm',
    desc: 'Map corners with device GPS even without cellular signal',
    href: '/farmer/farm/new',
    icon: <PlusCircle size={20} className="text-emerald-700" />,
  },
  {
    title: 'Record Farm Expense',
    desc: 'Log seeds, fertilizer, labor, and fuel locally',
    href: '/farmer/finance/expenses',
    icon: <Receipt size={20} className="text-amber-600" />,
  },
  {
    title: 'Harvest Inventory',
    desc: 'Track bags in storage and update stock quantities',
    href: '/farmer/inventory',
    icon: <Package size={20} className="text-blue-600" />,
  },
];

export default function OfflinePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Check initial pending count
    async function updateCounts() {
      const dbPending = await getPendingCount();
      const farmPending = getQueuedFarms().length;
      setPendingCount(dbPending + farmPending);
    }
    updateCounts();

    const unsubQueue = onQueueChanged(updateCounts);
    const unsubFarms = onFarmQueueChanged(updateCounts);

    // If online, return smoothly
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        window.history.back();
      } else {
        router.replace('/dashboard');
      }
    }

    const onOnline = () => {
      setChecking(true);
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          window.history.back();
        } else {
          router.replace('/dashboard');
        }
      }, 1000);
    };

    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('online', onOnline);
      unsubQueue();
      unsubFarms();
    };
  }, [router]);

  const handleRetry = () => {
    setChecking(true);
    if (typeof window !== 'undefined') {
      if (navigator.onLine) {
        if (window.history.length > 1) window.history.back();
        else window.location.reload();
      } else {
        setTimeout(() => setChecking(false), 800);
      }
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        padding: '32px 16px 48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        {/* Header Icon */}
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: 20,
            background: C.primaryBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 4px 20px rgba(22, 107, 58, 0.12)',
          }}
        >
          <WifiOff size={32} style={{ color: C.primary }} />
        </div>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: C.text,
            letterSpacing: '-0.02em',
            marginBottom: 8,
            fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
          }}
        >
          You're Offline
        </h1>

        <p
          style={{
            fontSize: 14,
            color: C.muted,
            lineHeight: 1.6,
            marginBottom: 20,
            maxWidth: 380,
            margin: '0 auto 20px',
          }}
        >
          No internet connection right now. Cropify saves your actions on this phone and syncs them automatically once connectivity resumes.
        </p>

        {/* Pending Sync Card */}
        <div
          style={{
            background: pendingCount > 0 ? C.harvestBg : C.card,
            border: `1px solid ${pendingCount > 0 ? 'var(--color-harvest)' : C.border}`,
            borderRadius: 14,
            padding: '12px 16px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {pendingCount > 0 ? (
              <CloudUpload size={20} style={{ color: C.harvest, flexShrink: 0 }} />
            ) : (
              <CheckCircle2 size={20} style={{ color: C.primary, flexShrink: 0 }} />
            )}
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>
                {pendingCount > 0
                  ? `${pendingCount} item${pendingCount === 1 ? '' : 's'} queued on device`
                  : 'Device fully synced'}
              </p>
              <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                {pendingCount > 0
                  ? 'Will sync automatically when back in network range'
                  : 'All local changes safely recorded'}
              </p>
            </div>
          </div>
          <button
            onClick={handleRetry}
            disabled={checking}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.card,
              fontSize: 12,
              fontWeight: 700,
              color: C.text,
              cursor: checking ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <RotateCcw size={12} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Checking…' : 'Check'}
          </button>
        </div>

        {/* Offline Ready Tools */}
        <div style={{ textAlign: 'left', marginBottom: 24 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: C.muted,
              marginBottom: 10,
              paddingLeft: 4,
            }}
          >
            Available Offline on this Device
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {OFFLINE_TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: 'var(--color-surface-2, #F1F5F9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {tool.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>
                    {tool.title}
                  </p>
                  <p style={{ fontSize: 11.5, color: C.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tool.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={handleRetry}
            disabled={checking}
            style={{
              flex: 1,
              padding: '12px 18px',
              background: C.primary,
              color: '#FFFFFF',
              borderRadius: 12,
              fontSize: 13.5,
              fontWeight: 700,
              border: 'none',
              cursor: checking ? 'default' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(22,107,58,0.22)',
            }}
          >
            <RotateCcw size={15} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Checking network…' : 'Try Again'}
          </button>

          <Link
            href="/dashboard"
            style={{
              flex: 1,
              padding: '12px 18px',
              background: C.card,
              color: C.text,
              borderRadius: 12,
              fontSize: 13.5,
              fontWeight: 700,
              border: `1px solid ${C.border}`,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Home size={15} />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
