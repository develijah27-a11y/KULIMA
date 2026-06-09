'use client';

import { useState } from 'react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)', red: 'var(--color-danger)',
};

const DISTRICTS = [
  'Kampala','Wakiso','Mukono','Jinja','Mbale','Mbarara','Gulu','Lira',
  'Masaka','Fort Portal','Arua','Soroti','Kabale','Hoima','Kasese',
];

const ROLE_CFG: Record<string, { color: string; bg: string }> = {
  leader:    { color: 'var(--color-primary)', bg: '#D1FAE5' },
  secretary: { color: '#0284C7', bg: '#DBEAFE' },
  treasurer: { color: '#7C3AED', bg: '#EDE9FE' },
  member:    { color: '#6B7280', bg: '#F3F4F6' },
};

interface Group {
  id: string;
  name: string;
  description?: string;
  district?: string;
  leader_id?: string;
  is_active: boolean;
  member_count?: number;
  my_role?: string;
}

interface Props {
  myGroups: Group[];
  allGroups: Group[];
  profileId: string;
}

export function GroupsClient({ myGroups: initialMine, allGroups: initialAll, profileId }: Props) {
  const [tab, setTab]       = useState<'mine' | 'browse' | 'create'>('mine');
  const [myGroups, setMine] = useState<Group[]>(initialMine);
  const [allGroups, setAll] = useState<Group[]>(initialAll);
  const [loading, setLoad]  = useState<string | null>(null);
  const [error, setError]   = useState('');
  const [newGroup, setNew]  = useState({ name: '', description: '', district: '' });

  const myGroupIds = new Set(myGroups.map(g => g.id));
  const browseable = allGroups.filter(g => !myGroupIds.has(g.id));

  async function join(groupId: string) {
    setLoad(groupId); setError('');
    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      const group = allGroups.find(g => g.id === groupId);
      if (group) setMine(prev => [...prev, { ...group, my_role: 'member' }]);
    } finally { setLoad(null); }
  }

  async function leave(groupId: string) {
    setLoad(groupId); setError('');
    try {
      const res = await fetch('/api/groups/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setMine(prev => prev.filter(g => g.id !== groupId));
    } finally { setLoad(null); }
  }

  async function create() {
    if (!newGroup.name.trim()) { setError('Group name is required.'); return; }
    setLoad('create'); setError('');
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      const created = { ...json.data, my_role: 'leader', member_count: 1 };
      setMine(prev => [created, ...prev]);
      setAll(prev => [created, ...prev]);
      setNew({ name: '', description: '', district: '' });
      setTab('mine');
    } finally { setLoad(null); }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Farmer Groups
        </h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>
          Join groups for bulk buying, collective sales, and shared logistics
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        {([
          { key: 'mine',   label: `My Groups (${myGroups.length})` },
          { key: 'browse', label: `Browse (${browseable.length})` },
          { key: 'create', label: '+ Create Group' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => { setTab(key); setError(''); }}
            style={{ padding: '6px 16px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: tab === key ? C.green : 'var(--d-subtle)', color: tab === key ? '#fff' : C.muted }}>
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ color: C.red, fontSize: 13 }}>{error}</p>
        </div>
      )}

      {/* My Groups tab */}
      {tab === 'mine' && (
        myGroups.length === 0 ? (
          <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 40, marginBottom: 10 }}>👥</p>
            <p style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>You're not in any group yet</p>
            <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Browse existing groups or create one for your community.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
              <button onClick={() => setTab('browse')} style={{ padding: '9px 18px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Browse Groups</button>
              <button onClick={() => setTab('create')} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Create Group</button>
            </div>
          </div>
        ) : (
          <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
            {myGroups.map((g, i) => {
              const role = ROLE_CFG[g.my_role ?? 'member'];
              const isLeader = g.my_role === 'leader';
              return (
                <div key={g.id} style={{ padding: '16px 20px', borderBottom: i < myGroups.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>👥</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>{g.name}</p>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: role.bg, color: role.color, textTransform: 'capitalize' }}>
                        {g.my_role ?? 'member'}
                      </span>
                    </div>
                    {g.description && <p style={{ fontSize: 12, color: C.muted, margin: '0 0 2px' }}>{g.description}</p>}
                    <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                      {g.district ?? 'Uganda'}
                      {g.member_count ? ` · ${g.member_count} members` : ''}
                    </p>
                  </div>
                  {!isLeader && (
                    <button disabled={loading === g.id} onClick={() => leave(g.id)}
                      style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 8, border: '1px solid #FCA5A5', background: 'transparent', color: C.red, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      {loading === g.id ? '…' : 'Leave'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Browse tab */}
      {tab === 'browse' && (
        browseable.length === 0 ? (
          <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 40, marginBottom: 10 }}>🌱</p>
            <p style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>No groups to join</p>
            <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>You're already in all available groups, or none exist yet.</p>
            <button onClick={() => setTab('create')} style={{ marginTop: 16, padding: '9px 18px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Create a Group
            </button>
          </div>
        ) : (
          <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
            {browseable.map((g, i) => (
              <div key={g.id} style={{ padding: '16px 20px', borderBottom: i < browseable.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>👥</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 3px' }}>{g.name}</p>
                  {g.description && <p style={{ fontSize: 12, color: C.muted, margin: '0 0 2px' }}>{g.description}</p>}
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                    {g.district ?? 'Uganda'}
                    {g.member_count ? ` · ${g.member_count} members` : ''}
                  </p>
                </div>
                <button disabled={loading === g.id} onClick={() => join(g.id)}
                  style={{ flexShrink: 0, padding: '7px 16px', borderRadius: 8, border: 'none', background: C.green, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {loading === g.id ? '…' : 'Join'}
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Create tab */}
      {tab === 'create' && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 24 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Create a New Group
          </p>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5 }}>Group Name *</label>
              <input value={newGroup.name} onChange={e => setNew(n => ({ ...n, name: e.target.value }))}
                placeholder="e.g. Wakiso Coffee Growers Association"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5 }}>District</label>
              <select value={newGroup.district} onChange={e => setNew(n => ({ ...n, district: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13 }}>
                <option value="">Select district</option>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5 }}>Description (optional)</label>
              <textarea value={newGroup.description} onChange={e => setNew(n => ({ ...n, description: e.target.value }))}
                placeholder="What does your group focus on?"
                rows={2}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13, resize: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          <button disabled={loading === 'create'} onClick={create}
            style={{ marginTop: 20, width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: loading === 'create' ? 0.7 : 1 }}>
            {loading === 'create' ? 'Creating…' : 'Create Group'}
          </button>
          <p style={{ fontSize: 11, color: C.muted, marginTop: 10, textAlign: 'center' }}>
            You will become the group leader and can invite other farmers.
          </p>
        </div>
      )}
    </div>
  );
}
