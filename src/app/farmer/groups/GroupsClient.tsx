'use client';

import { useState, useCallback, useEffect } from 'react';
import { Users, X, Check, Leaf, Settings, Package, Trash2 } from 'lucide-react';
import { CameraCapture } from '@/components/ui/CameraCapture';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)', red: 'var(--color-danger)',
  surface2: 'var(--color-surface-2)',
};

const DISTRICTS = [
  'Kampala','Wakiso','Mukono','Jinja','Mbale','Mbarara','Gulu','Lira',
  'Masaka','Fort Portal','Arua','Soroti','Kabale','Hoima','Kasese',
];

const SUBMIT_CROPS = ['maize','beans','coffee','rice','banana','cassava','tomato','sorghum','groundnuts','cotton'];

interface Submission {
  id: string;
  crop_type: string;
  quantity_kg: number;
  notes: string | null;
  photo_url: string | null;
  status: 'pending' | 'published' | 'withdrawn';
  created_at: string;
}

const ROLE_CFG: Record<string, { color: string; bg: string }> = {
  leader:    { color: 'var(--color-primary)',      bg: 'var(--color-success-bg)' },
  secretary: { color: 'var(--color-sky)',          bg: 'var(--color-sky-bg)' },
  treasurer: { color: 'var(--color-purple)',       bg: 'var(--color-purple-bg)' },
  member:    { color: 'var(--color-text-muted)',   bg: 'var(--color-surface-2)' },
};

interface Member {
  id: string;
  role: string;
  joined_at: string;
  farmer: { id: string; full_name: string; phone_number?: string; district?: string; primary_crop?: string } | null;
}

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

function MemberPanel({ group, onClose }: { group: Group; onClose: () => void }) {
  const [members, setMembers]     = useState<Member[] | null>(null);
  const [loading, setLoading]     = useState(false);
  const [addPhone, setAddPhone]   = useState('');
  const [addRole, setAddRole]     = useState('member');
  const [addLoading, setAddLoad]  = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const loadMembers = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch(`/api/groups/${group.id}/members`);
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setMembers(json.members);
    } finally { setLoading(false); }
  }, [group.id]);

  // Load on first open
  useState(() => { loadMembers(); });

  async function addMember() {
    if (!addPhone.trim()) { setError('Enter a phone number'); return; }
    setAddLoad(true); setError(''); setSuccess('');
    try {
      const res  = await fetch(`/api/groups/${group.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: addPhone.trim(), role: addRole }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setSuccess(`${json.member.full_name} added as ${json.member.role}!`);
      setAddPhone('');
      loadMembers();
    } finally { setAddLoad(false); }
  }

  async function changeRole(memberId: string, role: string) {
    setError('');
    const res  = await fetch(`/api/groups/${group.id}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, role }),
    });
    const json = await res.json();
    if (json.error) { setError(json.error); return; }
    loadMembers();
  }

  async function removeMember(memberId: string, name: string) {
    if (!confirm(`Remove ${name} from this group?`)) return;
    setError('');
    const res  = await fetch(`/api/groups/${group.id}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    });
    const json = await res.json();
    if (json.error) { setError(json.error); return; }
    loadMembers();
  }

  const isLeader = group.my_role === 'leader';

  return (
    <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: 0, overflow: 'hidden', marginTop: 8 }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={14} />{group.name} — Members</span>
        </p>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex' }}><X size={16} /></button>
      </div>

      {/* Add member (leader only) */}
      {isLeader && (
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, background: 'var(--color-primary-bg)' }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: C.text }}>Add Member by Phone</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              value={addPhone}
              onChange={e => setAddPhone(e.target.value)}
              placeholder="e.g. 0772 123456"
              style={{ flex: 1, minWidth: 140, padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, background: 'var(--d-input-bg)', color: 'var(--d-input-text)' }}
            />
            <select value={addRole} onChange={e => setAddRole(e.target.value)}
              style={{ padding: '9px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, background: 'var(--d-input-bg)', color: 'var(--d-input-text)' }}>
              <option value="member">Member</option>
              <option value="secretary">Secretary</option>
              <option value="treasurer">Treasurer</option>
            </select>
            <button onClick={addMember} disabled={addLoading}
              style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: C.green, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: addLoading ? 0.7 : 1 }}>
              {addLoading ? '…' : 'Add'}
            </button>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 11, color: C.muted }}>
            The person must already have an AgriNova account with that phone number.
          </p>
          {success && <div style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Check size={12} />{success}</div>}
          {error  && <p style={{ margin: '8px 0 0', fontSize: 12, color: C.red }}>{error}</p>}
        </div>
      )}

      {/* Member list */}
      <div>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ color: C.muted, fontSize: 13 }}>Loading members…</p>
          </div>
        ) : members === null || members.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ color: C.muted, fontSize: 13 }}>No members yet. Add someone using their phone number above.</p>
          </div>
        ) : (
          members.map((m, i) => {
            const role = ROLE_CFG[m.role] ?? ROLE_CFG.member;
            const name = m.farmer?.full_name ?? 'Unknown';
            return (
              <div key={m.id} style={{ padding: '12px 18px', borderBottom: i < members.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: role.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: role.color, flexShrink: 0 }}>
                  {name[0]?.toUpperCase() ?? '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>{name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: C.muted }}>
                    {m.farmer?.district ?? ''}
                    {m.farmer?.primary_crop ? ` · ${m.farmer.primary_crop}` : ''}
                    {m.farmer?.phone_number ? ` · ${m.farmer.phone_number}` : ''}
                  </p>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: role.bg, color: role.color, textTransform: 'capitalize', flexShrink: 0 }}>
                  {m.role}
                </span>
                {isLeader && m.role !== 'leader' && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <select
                      defaultValue={m.role}
                      onChange={e => changeRole(m.id, e.target.value)}
                      style={{ padding: '4px 6px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 11, background: 'var(--d-input-bg)', color: 'var(--d-input-text)', cursor: 'pointer' }}
                    >
                      <option value="member">Member</option>
                      <option value="secretary">Secretary</option>
                      <option value="treasurer">Treasurer</option>
                    </select>
                    <button onClick={() => removeMember(m.id, name)}
                      style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid #FCA5A5`, background: 'transparent', color: C.red, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SubmitPanel({ group, onClose }: { group: Group; onClose: () => void }) {
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [loading, setLoading]     = useState(false);
  const [cropType, setCropType]   = useState('');
  const [quantityKg, setQty]      = useState('');
  const [notes, setNotes]         = useState('');
  const [photoUrl, setPhotoUrl]   = useState('');
  const [submitting, setSubmit]   = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const loadSubmissions = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch(`/api/groups/${group.id}/submissions`);
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setSubmissions(json.submissions);
    } finally { setLoading(false); }
  }, [group.id]);

  useEffect(() => { loadSubmissions(); }, [loadSubmissions]);

  async function submit() {
    if (!cropType) { setError('Select a crop'); return; }
    if (!quantityKg || Number(quantityKg) <= 0) { setError('Enter a valid quantity'); return; }
    setSubmit(true); setError(''); setSuccess('');
    try {
      const res  = await fetch(`/api/groups/${group.id}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cropType, quantityKg: Number(quantityKg), notes: notes || undefined, photoUrl: photoUrl || undefined }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setSuccess('Submitted! Your group leader will organize it into a listing.');
      setCropType(''); setQty(''); setNotes(''); setPhotoUrl('');
      loadSubmissions();
    } finally { setSubmit(false); }
  }

  async function withdraw(id: string) {
    if (!confirm('Withdraw this submission?')) return;
    setError('');
    const res  = await fetch(`/api/groups/${group.id}/submissions/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.error) { setError(json.error); return; }
    loadSubmissions();
  }

  const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
    pending:   { label: 'Awaiting organization', color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
    published: { label: 'Listed for sale',       color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
    withdrawn: { label: 'Withdrawn',             color: C.muted,                bg: C.surface2 },
  };

  return (
    <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: 0, overflow: 'hidden', marginTop: 8 }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Package size={14} />Submit Produce to {group.name}</span>
        </p>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex' }}><X size={16} /></button>
      </div>

      {/* Submission form */}
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <select value={cropType} onChange={e => setCropType(e.target.value)}
            style={{ padding: '9px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, background: 'var(--d-input-bg)', color: 'var(--d-input-text)' }}>
            <option value="">Select crop...</option>
            {SUBMIT_CROPS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <input
            type="number" min="0" value={quantityKg} onChange={e => setQty(e.target.value)}
            placeholder="Quantity (kg)"
            style={{ padding: '9px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, background: 'var(--d-input-bg)', color: 'var(--d-input-text)', boxSizing: 'border-box' }}
          />
        </div>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          placeholder="Notes (optional) — grade, drying status, pickup point..."
          style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', boxSizing: 'border-box' }}
        />
        {/* Photo is optional here — the whole point is to lower the bar for
            members who can't easily photograph produce before collection. */}
        {photoUrl ? (
          <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
            <img src={photoUrl} alt="Produce" style={{ width: '100%', display: 'block', maxHeight: 140, objectFit: 'cover' }} />
            <button type="button" onClick={() => setPhotoUrl('')}
              style={{ position: 'absolute', top: 6, right: 6, padding: '4px 10px', borderRadius: 6, border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              Remove
            </button>
          </div>
        ) : (
          <CameraCapture onCaptured={setPhotoUrl} label="Add a photo (optional)" />
        )}
        {error && <p style={{ margin: 0, fontSize: 12, color: C.red }}>{error}</p>}
        {success && <div style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Check size={12} />{success}</div>}
        <button onClick={submit} disabled={submitting}
          style={{ padding: '10px', borderRadius: 8, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
          {submitting ? 'Submitting…' : 'Submit Contribution'}
        </button>
      </div>

      {/* My submissions */}
      <div>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center' }}><p style={{ color: C.muted, fontSize: 13 }}>Loading…</p></div>
        ) : submissions === null || submissions.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center' }}><p style={{ color: C.muted, fontSize: 13 }}>No submissions yet.</p></div>
        ) : (
          submissions.map((s, i) => {
            const st = STATUS_CFG[s.status] ?? STATUS_CFG.pending;
            return (
              <div key={s.id} style={{ padding: '12px 18px', borderBottom: i < submissions.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text, textTransform: 'capitalize' }}>{s.crop_type} · {s.quantity_kg}kg</p>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: st.bg, color: st.color, display: 'inline-block', marginTop: 3 }}>
                    {st.label}
                  </span>
                </div>
                {s.status === 'pending' && (
                  <button onClick={() => withdraw(s.id)} title="Withdraw"
                    style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #FCA5A5', background: 'transparent', color: C.red, cursor: 'pointer', display: 'flex' }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function GroupsClient({ myGroups: initialMine, allGroups: initialAll, profileId }: Props) {
  const [tab, setTab]           = useState<'mine' | 'browse' | 'create'>('mine');
  const [myGroups, setMine]     = useState<Group[]>(initialMine);
  const [allGroups, setAll]     = useState<Group[]>(initialAll);
  const [loading, setLoad]      = useState<string | null>(null);
  const [error, setError]       = useState('');
  const [newGroup, setNew]      = useState({ name: '', description: '', district: '' });
  const [openPanel, setPanel]   = useState<string | null>(null); // group id with open member panel
  const [submitPanel, setSubmitPanel] = useState<string | null>(null); // group id with open submit-produce panel
  const [phonePrompt, setPhonePrompt] = useState<string | null>(null); // group id awaiting a phone number
  const [phoneInput, setPhoneInput]   = useState('');

  const myGroupIds = new Set(myGroups.map(g => g.id));
  const browseable = allGroups.filter(g => !myGroupIds.has(g.id));

  async function join(groupId: string, phone_number?: string) {
    setLoad(groupId); setError('');
    try {
      const res  = await fetch('/api/groups/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId, phone_number }) });
      const json = await res.json();
      if (json.error === 'PHONE_REQUIRED') { setPhonePrompt(groupId); return; }
      if (json.error) { setError(json.error); return; }
      setPhonePrompt(null); setPhoneInput('');
      const group = allGroups.find(g => g.id === groupId);
      if (group) setMine(prev => [...prev, { ...group, my_role: 'member' }]);
    } finally { setLoad(null); }
  }

  async function leave(groupId: string) {
    setLoad(groupId); setError('');
    try {
      const res  = await fetch('/api/groups/leave', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId }) });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setMine(prev => prev.filter(g => g.id !== groupId));
      if (openPanel === groupId) setPanel(null);
      if (submitPanel === groupId) setSubmitPanel(null);
    } finally { setLoad(null); }
  }

  async function create() {
    if (!newGroup.name.trim()) { setError('Group name is required.'); return; }
    setLoad('create'); setError('');
    try {
      const res  = await fetch('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newGroup) });
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
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
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
              background: tab === key ? C.green : C.surface2, color: tab === key ? '#fff' : C.muted }}>
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ color: C.red, fontSize: 13, margin: 0 }}>{error}</p>
        </div>
      )}

      {/* ── My Groups ── */}
      {tab === 'mine' && (
        myGroups.length === 0 ? (
          <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: C.muted }}><Users size={48} /></div>
            <p style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>You're not in any group yet</p>
            <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Browse existing groups or create one for your community.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
              <button onClick={() => setTab('browse')} style={{ padding: '9px 18px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Browse Groups</button>
              <button onClick={() => setTab('create')} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Create Group</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
              {myGroups.map((g, i) => {
                const role = ROLE_CFG[g.my_role ?? 'member'];
                const isLeader = g.my_role === 'leader';
                const isPanelOpen = openPanel === g.id;
                const isSubmitOpen = submitPanel === g.id;
                return (
                  <div key={g.id}>
                    <div style={{ padding: '16px 20px', borderBottom: i < myGroups.length - 1 || isPanelOpen || isSubmitOpen ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green, flexShrink: 0 }}><Users size={22} /></div>
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
                          {g.member_count ? ` · ${g.member_count} member${g.member_count === 1 ? '' : 's'}` : ''}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {/* Submit Produce — every member (including the leader) can contribute */}
                        <button
                          onClick={() => setSubmitPanel(isSubmitOpen ? null : g.id)}
                          style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: isSubmitOpen ? C.green : 'transparent', color: isSubmitOpen ? '#fff' : C.muted, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          <Package size={11} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />Submit
                        </button>
                        {/* Members button — all members can see, leaders can manage */}
                        <button
                          onClick={() => setPanel(isPanelOpen ? null : g.id)}
                          style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: isPanelOpen ? C.green : 'transparent', color: isPanelOpen ? '#fff' : C.muted, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          {isLeader ? <><Settings size={11} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />Manage</> : <><Users size={11} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />Members</>}
                        </button>
                        {!isLeader && (
                          <button disabled={loading === g.id} onClick={() => leave(g.id)}
                            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #FCA5A5', background: 'transparent', color: C.red, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                            {loading === g.id ? '…' : 'Leave'}
                          </button>
                        )}
                      </div>
                    </div>
                    {isSubmitOpen && (
                      <div style={{ padding: '0 16px 16px' }}>
                        <SubmitPanel group={g} onClose={() => setSubmitPanel(null)} />
                      </div>
                    )}
                    {isPanelOpen && (
                      <div style={{ padding: '0 16px 16px' }}>
                        <MemberPanel group={g} onClose={() => setPanel(null)} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* ── Browse ── */}
      {tab === 'browse' && (
        browseable.length === 0 ? (
          <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: C.muted }}><Leaf size={48} /></div>
            <p style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>No groups to join</p>
            <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>You're already in all available groups, or none exist yet.</p>
            <button onClick={() => setTab('create')} style={{ marginTop: 16, padding: '9px 18px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Create a Group
            </button>
          </div>
        ) : (
          <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
            {browseable.map((g, i) => (
              <div key={g.id} style={{ borderBottom: i < browseable.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green, flexShrink: 0 }}><Users size={22} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 3px' }}>{g.name}</p>
                    {g.description && <p style={{ fontSize: 12, color: C.muted, margin: '0 0 2px' }}>{g.description}</p>}
                    <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                      {g.district ?? 'Uganda'}
                      {g.member_count ? ` · ${g.member_count} member${g.member_count === 1 ? '' : 's'}` : ''}
                    </p>
                  </div>
                  <button disabled={loading === g.id} onClick={() => join(g.id)}
                    style={{ flexShrink: 0, padding: '7px 16px', borderRadius: 8, border: 'none', background: C.green, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {loading === g.id ? '…' : 'Join'}
                  </button>
                </div>
                {phonePrompt === g.id && (
                  <div style={{ padding: '0 20px 16px' }}>
                    <div style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', borderRadius: 10, padding: '12px 14px' }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: C.text, margin: '0 0 8px' }}>
                        Add your phone number to join
                      </p>
                      <p style={{ fontSize: 11, color: C.muted, margin: '0 0 10px' }}>
                        This is where group sale payouts will be sent when this group sells produce.
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          value={phoneInput}
                          onChange={e => setPhoneInput(e.target.value)}
                          placeholder="e.g. 0772 123456"
                          style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, background: 'var(--d-input-bg)', color: 'var(--d-input-text)' }}
                        />
                        <button
                          disabled={loading === g.id || !phoneInput.trim()}
                          onClick={() => join(g.id, phoneInput.trim())}
                          style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: C.green, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          {loading === g.id ? '…' : 'Confirm & Join'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Create ── */}
      {tab === 'create' && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 24 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 20px', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>
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
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13, resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          </div>
          <button disabled={loading === 'create'} onClick={create}
            style={{ marginTop: 20, width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: loading === 'create' ? 0.7 : 1 }}>
            {loading === 'create' ? 'Creating…' : 'Create Group'}
          </button>
          <p style={{ fontSize: 11, color: C.muted, marginTop: 10, textAlign: 'center' }}>
            You become the group leader. Add members via phone number after creation.
          </p>
        </div>
      )}
    </div>
  );
}
