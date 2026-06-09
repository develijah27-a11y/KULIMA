'use client';

import { useState } from 'react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)', greenBright: 'var(--color-primary-muted)',
  amber: '#D97706', red: 'var(--color-danger)', blue: 'var(--color-info)',
  cardBg: 'var(--d-card)',
  shadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)',
};

export const WORKER_ROLES: { value: string; label: string; color: string; bg: string; icon: string }[] = [
  { value: 'farm_manager',          label: 'Farm Manager',          color: 'var(--color-primary)', bg: '#D1FAE5', icon: '👨‍💼' },
  { value: 'field_worker',          label: 'Field Worker',          color: 'var(--color-info)', bg: '#DBEAFE', icon: '👷' },
  { value: 'irrigation_specialist', label: 'Irrigation Specialist', color: '#0284C7', bg: '#E0F2FE', icon: '💧' },
  { value: 'pest_controller',       label: 'Pest Controller',       color: '#7C3AED', bg: '#EDE9FE', icon: '🧴' },
  { value: 'harvester',             label: 'Harvester',             color: '#D97706', bg: '#FEF3C7', icon: '🌾' },
  { value: 'driver',                label: 'Driver / Transport',    color: '#374151', bg: '#F3F4F6', icon: '🚜' },
  { value: 'watchman',              label: 'Watchman / Security',   color: '#DC2626', bg: '#FEE2E2', icon: '🔒' },
  { value: 'store_keeper',          label: 'Store Keeper',          color: '#92400E', bg: '#FEF3C7', icon: '🏚️' },
  { value: 'casual_laborer',        label: 'Casual Laborer',        color: '#6B7280', bg: '#F9FAFB', icon: '🧑‍🌾' },
  { value: 'other',                 label: 'Other',                 color: '#6B7280', bg: '#F3F4F6', icon: '👤' },
];

const WAGE_PERIODS = [
  { value: 'daily',    label: 'per day' },
  { value: 'monthly',  label: 'per month' },
  { value: 'seasonal', label: 'per season' },
];

const COMMON_TASKS = [
  'Planting', 'Weeding', 'Fertilizer application', 'Pesticide spraying',
  'Irrigation', 'Harvesting', 'Sorting & grading', 'Drying', 'Storage management',
  'Transport', 'Land preparation', 'Security patrol',
];

export interface Worker {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  tasks: string[];
  wage_ugx: number | null;
  wage_period: string;
  start_date: string;
  is_active: boolean;
  notes: string | null;
  farm_id: string | null;
  farms?: { name: string } | null;
}

interface Farm { id: string; name: string }

interface Props {
  initialWorkers: Worker[];
  farms: Farm[];
}

const EMPTY_FORM = {
  name: '', phone: '', role: 'field_worker', farm_id: '',
  tasks: [] as string[], wage_ugx: '', wage_period: 'daily',
  start_date: new Date().toISOString().split('T')[0], notes: '',
};

function getRoleCfg(role: string) {
  return WORKER_ROLES.find(r => r.value === role) ?? WORKER_ROLES[WORKER_ROLES.length - 1];
}

function RoleBadge({ role }: { role: string }) {
  const cfg = getRoleCfg(role);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 999,
      background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 700,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export function WorkersClient({ initialWorkers, farms }: Props) {
  const [workers, setWorkers] = useState<Worker[]>(initialWorkers);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1.5px solid ${C.border}`, fontSize: 14,
    color: C.text, background: '#fff', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 4,
  };

  function setF(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }

  function toggleTask(task: string) {
    setF('tasks', form.tasks.includes(task)
      ? form.tasks.filter(t => t !== task)
      : [...form.tasks, task]);
  }

  function openAdd() {
    setEditId(null);
    setForm({ ...EMPTY_FORM, start_date: new Date().toISOString().split('T')[0] });
    setError('');
    setShowForm(true);
  }

  function openEdit(w: Worker) {
    setEditId(w.id);
    setForm({
      name: w.name, phone: w.phone ?? '', role: w.role,
      farm_id: w.farm_id ?? '',
      tasks: w.tasks ?? [], wage_ugx: w.wage_ugx?.toString() ?? '',
      wage_period: w.wage_period, start_date: w.start_date,
      notes: w.notes ?? '',
    });
    setError('');
    setShowForm(true);
  }

  function cancelForm() { setShowForm(false); setEditId(null); setError(''); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Worker name is required.'); return; }
    setSaving(true); setError('');

    const body = {
      ...form,
      wage_ugx: form.wage_ugx ? Number(form.wage_ugx) : null,
      farm_id: form.farm_id || null,
    };

    try {
      let res: Response;
      if (editId) {
        res = await fetch(`/api/farm-workers?id=${editId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/farm-workers', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');

      if (editId) {
        setWorkers(ws => ws.map(w => w.id === editId ? json.worker : w));
      } else {
        setWorkers(ws => [json.worker, ...ws]);
      }
      cancelForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(w: Worker) {
    setDeleting(w.id);
    try {
      const res = await fetch(`/api/farm-workers?id=${w.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !w.is_active }),
      });
      const json = await res.json();
      if (res.ok) setWorkers(ws => ws.map(x => x.id === w.id ? json.worker : x));
    } finally {
      setDeleting(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this worker permanently?')) return;
    setDeleting(id);
    try {
      await fetch(`/api/farm-workers?id=${id}`, { method: 'DELETE' });
      setWorkers(ws => ws.filter(w => w.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  const visible = workers.filter(w => {
    if (!showInactive && !w.is_active) return false;
    if (filterRole && w.role !== filterRole) return false;
    return true;
  });

  const activeCount = workers.filter(w => w.is_active).length;
  const roleCounts = workers.filter(w => w.is_active).reduce<Record<string, number>>((acc, w) => {
    acc[w.role] = (acc[w.role] ?? 0) + 1; return acc;
  }, {});

  return (
    <div>
      {/* Stats strip */}
      {workers.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '12px 18px', borderLeft: `3px solid ${C.greenMed}` }}>
            <p style={{ fontSize: 22, fontWeight: 900, color: C.green, letterSpacing: '-0.03em' }}>{activeCount}</p>
            <p style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Active Workers</p>
          </div>
          {Object.entries(roleCounts).slice(0, 4).map(([role, count]) => {
            const cfg = getRoleCfg(role);
            return (
              <div key={role} style={{ background: cfg.bg, borderRadius: 10, padding: '12px 18px', borderLeft: `3px solid ${cfg.color}` }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: cfg.color, letterSpacing: '-0.03em' }}>{count}</p>
                <p style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{cfg.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          style={{ ...inputStyle, width: 'auto', flex: '0 0 auto' }}
        >
          <option value="">All Roles</option>
          {WORKER_ROLES.map(r => <option key={r.value} value={r.value}>{r.icon} {r.label}</option>)}
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.muted, cursor: 'pointer' }}>
          <input
            type="checkbox" checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
            style={{ width: 14, height: 14 }}
          />
          Show inactive
        </label>

        <div style={{ flex: 1 }} />

        <button
          onClick={openAdd}
          style={{
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: C.green, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          + Add Worker
        </button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            background: C.cardBg, borderRadius: 14, padding: 24,
            boxShadow: C.shadow, marginBottom: 24, border: `1.5px solid ${C.border}`,
          }}
        >
          <p style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 20 }}>
            {editId ? 'Edit Worker' : 'Add New Worker'}
          </p>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: C.red }}>{error}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>

            <div>
              <label style={labelStyle}>Full Name *</label>
              <input value={form.name} onChange={e => setF('name', e.target.value)}
                placeholder="e.g. John Ochieng" style={inputStyle} required />
            </div>

            <div>
              <label style={labelStyle}>Phone Number</label>
              <input value={form.phone} onChange={e => setF('phone', e.target.value)}
                placeholder="e.g. 0772000000" type="tel" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Role *</label>
              <select value={form.role} onChange={e => setF('role', e.target.value)} style={inputStyle} required>
                {WORKER_ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.icon} {r.label}</option>
                ))}
              </select>
            </div>

            {farms.length > 0 && (
              <div>
                <label style={labelStyle}>Assign to Farm</label>
                <select value={form.farm_id} onChange={e => setF('farm_id', e.target.value)} style={inputStyle}>
                  <option value="">— All Farms —</option>
                  {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label style={labelStyle}>Wage (UGX)</label>
              <input value={form.wage_ugx} onChange={e => setF('wage_ugx', e.target.value)}
                type="number" min="0" placeholder="e.g. 15000" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Wage Period</label>
              <select value={form.wage_period} onChange={e => setF('wage_period', e.target.value)} style={inputStyle}>
                {WAGE_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Start Date</label>
              <input value={form.start_date} onChange={e => setF('start_date', e.target.value)}
                type="date" style={inputStyle} />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Notes</label>
              <input value={form.notes} onChange={e => setF('notes', e.target.value)}
                placeholder="Any additional details…" style={inputStyle} />
            </div>

          </div>

          {/* Tasks */}
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Assigned Tasks</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {COMMON_TASKS.map(task => {
                const active = form.tasks.includes(task);
                return (
                  <button
                    key={task} type="button" onClick={() => toggleTask(task)}
                    style={{
                      padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                      border: `1.5px solid ${active ? C.greenMed : C.border}`,
                      background: active ? '#F0FDF4' : '#fff',
                      color: active ? C.greenMed : C.muted, cursor: 'pointer',
                    }}
                  >
                    {active ? '✓ ' : ''}{task}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={cancelForm}
              style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#F3F4F6', color: C.muted, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: saving ? '#9CA3AF' : C.green, color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer' }}>
              {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Worker'}
            </button>
          </div>
        </form>
      )}

      {/* Worker list */}
      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: C.cardBg, borderRadius: 16, boxShadow: C.shadow }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>👷</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>No workers yet</p>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4, marginBottom: 20 }}>
            Add your farm workers and assign them roles to keep track of who does what.
          </p>
          <button onClick={openAdd}
            style={{ padding: '11px 24px', borderRadius: 10, background: C.green, color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            + Add First Worker
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {visible.map(w => {
            const cfg = getRoleCfg(w.role);
            return (
              <div
                key={w.id}
                style={{
                  background: C.cardBg, borderRadius: 14, boxShadow: C.shadow,
                  padding: '18px 20px', display: 'flex', gap: 16, alignItems: 'flex-start',
                  opacity: w.is_active ? 1 : 0.55,
                  borderLeft: `4px solid ${cfg.color}`,
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 46, height: 46, borderRadius: 12, background: cfg.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, flexShrink: 0,
                }}>
                  {cfg.icon}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                    <p style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: 0 }}>{w.name}</p>
                    <RoleBadge role={w.role} />
                    {!w.is_active && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: '#F3F4F6', color: C.muted }}>
                        INACTIVE
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 6 }}>
                    {w.phone && (
                      <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>📞 {w.phone}</p>
                    )}
                    {w.farms?.name && (
                      <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>🌿 {w.farms.name}</p>
                    )}
                    {w.wage_ugx && (
                      <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                        💰 UGX {Number(w.wage_ugx).toLocaleString()} / {w.wage_period === 'daily' ? 'day' : w.wage_period === 'monthly' ? 'month' : 'season'}
                      </p>
                    )}
                    <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                      📅 Since {new Date(w.start_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  {w.tasks && w.tasks.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {w.tasks.map(t => (
                        <span key={t} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: '#F0FDF4', color: C.greenMed, fontWeight: 600 }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {w.notes && (
                    <p style={{ fontSize: 12, color: C.muted, marginTop: 6, fontStyle: 'italic' }}>{w.notes}</p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                  <button
                    onClick={() => openEdit(w)}
                    style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid ${C.border}`, background: '#fff', color: C.text, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeactivate(w)}
                    disabled={deleting === w.id}
                    style={{
                      padding: '6px 12px', borderRadius: 7, border: 'none',
                      background: w.is_active ? '#FEF3C7' : '#F0FDF4',
                      color: w.is_active ? C.amber : C.greenMed,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {w.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                  <button
                    onClick={() => handleDelete(w.id)}
                    disabled={deleting === w.id}
                    style={{ padding: '6px 10px', borderRadius: 7, border: 'none', background: '#FEF2F2', color: C.red, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
