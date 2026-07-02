'use client';

import { useEffect, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { CheckCircle2, X, Truck, Zap, Snowflake, MapPin, Calendar, Map } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenBg: 'var(--color-primary-bg)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)', amberBg: 'var(--color-harvest-bg)',
  blue: 'var(--color-sky)', blueBg: 'var(--color-sky-bg)',
  red: 'var(--color-danger)',
};

const TYPE_META: Record<string, { icon: ReactNode; label: string; color: string; bg: string }> = {
  standard: { icon: <Truck size={22} />,    label: 'Standard',    color: C.green, bg: C.greenBg },
  fast:     { icon: <Zap size={22} />,      label: 'Express',     color: C.amber, bg: C.amberBg },
  cold:     { icon: <Snowflake size={22} />, label: 'Cool Transport', color: C.blue,  bg: C.blueBg  },
};

const DISTRICTS = [
  'Kampala','Wakiso','Mukono','Jinja','Mbale','Mbarara','Gulu','Lira',
  'Masaka','Fort Portal','Arua','Soroti','Kabale','Hoima','Kasese',
];

type Job = {
  id: string;
  pickup_district: string;
  dropoff_district: string;
  cargo_kg: number;
  cargo_type: string | null;
  delivery_type: string;
  pickup_date: string;
  pickup_location: string | null;
  dropoff_location: string | null;
  distance_km: number | null;
  estimated_fare: number | null;
  driver_earnings: number | null;
  notes: string | null;
  created_at: string;
};

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{
      position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000, minWidth: 280, background: ok ? '#065F46' : '#991B1B',
      color: '#fff', borderRadius: 14, padding: '14px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
    }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>{ok ? <CheckCircle2 size={16} /> : <X size={16} />}{msg}</p>
    </div>
  );
}

function JobCard({ job, onAccepted }: { job: Job; onAccepted: (id: string) => void }) {
  const [pending, startT] = useTransition();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const meta = TYPE_META[job.delivery_type ?? 'standard'] ?? TYPE_META.standard;

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function accept() {
    startT(async () => {
      const res = await fetch(`/api/deliveries/${job.id}/accept`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast('Job accepted! Check your active deliveries.', true);
        setTimeout(() => onAccepted(job.id), 1500);
      } else {
        showToast(json.error ?? 'Failed to accept job', false);
      }
    });
  }

  return (
    <div style={{ background: C.cardBg, borderRadius: 18, boxShadow: C.cardShadow, overflow: 'hidden', marginBottom: 12 }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      <div style={{ padding: '18px 20px' }}>
        {/* Route header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color, flexShrink: 0 }}>
            {meta.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: 0 }}>
                {job.pickup_district} → {job.dropoff_district}
              </p>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: meta.bg, color: meta.color }}>
                {meta.label}
              </span>
            </div>
            <p style={{ fontSize: 12, color: C.muted, margin: '3px 0 0' }}>
              {job.cargo_kg} kg {job.cargo_type ?? 'cargo'}
              {job.distance_km ? ` · ${job.distance_km} km` : ''}
            </p>
            {job.pickup_location && (
              <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={11} />{job.pickup_location}</p>
            )}
          </div>

          {/* Earnings highlight */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 19, fontWeight: 900, color: C.green, margin: 0, letterSpacing: '-0.02em' }}>
              UGX {Math.round(job.driver_earnings ?? job.estimated_fare ?? 0).toLocaleString()}
            </p>
            <p style={{ fontSize: 9, color: C.muted, margin: '1px 0 0' }}>
              {job.driver_earnings ? 'your earnings' : 'est. fare'}
            </p>
          </div>
        </div>

        {/* Date + notes */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: 'var(--color-surface-2)', color: C.muted, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={11} />{new Date(job.pickup_date).toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
          {job.distance_km && (
            <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: 'var(--color-surface-2)', color: C.muted, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Map size={11} />{job.distance_km} km
            </span>
          )}
        </div>

        {job.notes && (
          <div style={{ padding: '8px 12px', background: C.greenBg, borderRadius: 10, marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: C.greenMed, margin: 0, fontStyle: 'italic' }}>"{job.notes}"</p>
          </div>
        )}

        {/* Accept button */}
        <button
          onClick={accept}
          disabled={pending}
          style={{
            width: '100%', padding: '13px', borderRadius: 12, border: 'none',
            background: pending ? C.greenBg : C.green,
            color: pending ? C.green : '#fff',
            fontSize: 15, fontWeight: 800, cursor: pending ? 'wait' : 'pointer',
            boxShadow: pending ? 'none' : '0 4px 16px rgba(34,197,94,0.3)',
            letterSpacing: '-0.01em',
          }}
        >
          {pending ? 'Claiming job…' : <><Truck size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />Accept Job — UGX {Math.round(job.driver_earnings ?? job.estimated_fare ?? 0).toLocaleString()}</>}
        </button>
      </div>
    </div>
  );
}

export default function JobQueuePage() {
  const [jobs, setJobs]         = useState<Job[]>([]);
  const [loading, setLoading]   = useState(true);
  const [district, setDistrict] = useState('');
  const [type, setType]         = useState('');
  const [cargo, setCargo]       = useState('');
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null);

  async function loadJobs() {
    setLoading(true);
    const params = new URLSearchParams();
    if (district) params.set('district', district);
    if (type)     params.set('type', type);
    if (cargo)    params.set('cargo', cargo);
    const res  = await fetch(`/api/deliveries?${params}&status=open`);
    const json = await res.json();
    setJobs((json.data ?? json ?? []) as Job[]);
    setLoading(false);
  }

  useEffect(() => { loadJobs(); }, []);

  function removeJob(id: string) {
    setJobs(prev => prev.filter(j => j.id !== id));
  }

  const totalEarnings = jobs.reduce((s, j) => s + (j.driver_earnings ?? j.estimated_fare ?? 0), 0);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: 0, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Job Queue
          </h1>
          <p style={{ fontSize: 13, color: C.muted, margin: '3px 0 0' }}>
            {jobs.length} open job{jobs.length !== 1 ? 's' : ''}
            {totalEarnings > 0 && ` · up to UGX ${Math.round(totalEarnings).toLocaleString()} available`}
          </p>
        </div>
        <Link href="/transporter/active" style={{ fontSize: 12, fontWeight: 700, color: C.greenMed, textDecoration: 'none' }}>
          Active →
        </Link>
      </div>

      {/* Filters */}
      <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={district} onChange={e => setDistrict(e.target.value)}
            style={{ flex: 1, minWidth: 120, padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13 }}>
            <option value="">All Districts</option>
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={type} onChange={e => setType(e.target.value)}
            style={{ flex: 1, minWidth: 110, padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13 }}>
            <option value="">All Types</option>
            <option value="standard">Standard</option>
            <option value="fast">Express</option>
            <option value="cold">Cold Chain</option>
          </select>
          <input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Cargo (e.g. maize)"
            style={{ flex: 1, minWidth: 110, padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13 }} />
          <button onClick={loadJobs}
            style={{ padding: '9px 18px', background: C.green, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Filter
          </button>
        </div>
      </div>

      {/* Jobs */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 180, borderRadius: 18, background: C.cardBg, boxShadow: C.cardShadow }} className="dash-skeleton" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 18, boxShadow: C.cardShadow, padding: '52px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--d-muted)' }}><Truck size={48} /></div>
          <p style={{ fontWeight: 800, fontSize: 16, color: C.text }}>No open jobs right now</p>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>New jobs appear here when farmers confirm orders.</p>
          <button onClick={loadJobs} style={{ marginTop: 16, padding: '10px 20px', background: C.green, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Refresh
          </button>
        </div>
      ) : (
        <div>
          {jobs.map(job => (
            <JobCard key={job.id} job={job} onAccepted={removeJob} />
          ))}
        </div>
      )}
    </div>
  );
}
