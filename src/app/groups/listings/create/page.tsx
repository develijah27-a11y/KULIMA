'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CameraCapture } from '@/components/ui/CameraCapture';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', greenMed: 'var(--color-primary-hover)',
};

const CROPS = ['maize','beans','coffee','rice','banana','cassava','tomato','sorghum','groundnuts','cotton'];
const DISTRICTS = ['Kampala','Wakiso','Mukono','Jinja','Mbale','Gulu','Lira','Masaka','Mbarara','Kabale','Fort Portal','Arua','Soroti','Tororo','Iganga','Hoima','Masindi'];

interface Member {
  id: string;
  full_name: string;
  role: string;
}

interface Cluster {
  cropType: string;
  totalKg: number;
  memberCount: number;
  submissions: { id: string; quantity_kg: number; farmer: { full_name: string } | null }[];
}

function OrganizeSubmissions({ groupId, priceMap }: { groupId: string; priceMap: Record<string, number> }) {
  const [clusters, setClusters] = useState<Cluster[] | null>(null);
  const [prices, setPrices]     = useState<Record<string, string>>({});
  const [publishing, setPub]    = useState<string | null>(null);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const load = () => {
    fetch(`/api/groups/${groupId}/organize`)
      .then(r => r.json())
      .then(json => setClusters(json.clusters ?? []))
      .catch(() => setClusters([]));
  };

  useEffect(load, [groupId]);

  async function publish(cropType: string) {
    const askingPrice = prices[cropType];
    if (!askingPrice || Number(askingPrice) <= 0) { setError(`Enter a price per kg for ${cropType}`); return; }
    setPub(cropType); setError(''); setSuccess('');
    try {
      const res  = await fetch(`/api/groups/${groupId}/organize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cropType, askingPrice: Number(askingPrice) }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setSuccess(`${cropType} lot published!`);
      load();
    } finally { setPub(null); }
  }

  if (clusters === null) return null;
  if (clusters.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }}>Organize Member Submissions</p>
        <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>
          Members have already submitted these — just set a price and publish. No manual typing needed.
        </p>
      </div>
      {success && <p style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 600, margin: 0 }}>{success}</p>}
      {error && <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: 0 }}>{error}</p>}
      {clusters.map(c => {
        const marketPrice = priceMap[c.cropType] ?? null;
        return (
          <div key={c.cropType} style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0, textTransform: 'capitalize' }}>{c.cropType}</p>
                <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>
                  {c.totalKg.toLocaleString()} kg · {c.memberCount} member{c.memberCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 }}>
              {c.submissions.map(s => (
                <p key={s.id} style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                  {s.farmer?.full_name ?? 'Member'} — {s.quantity_kg}kg
                </p>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number" min="1"
                value={prices[c.cropType] ?? (marketPrice ? String(marketPrice) : '')}
                onChange={e => setPrices(p => ({ ...p, [c.cropType]: e.target.value }))}
                placeholder={marketPrice ? `Market: ${marketPrice.toLocaleString()}/kg` : 'Price per kg'}
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, background: 'var(--d-input-bg)', color: 'var(--d-input-text)', boxSizing: 'border-box' }}
              />
              <button
                onClick={() => publish(c.cropType)}
                disabled={publishing === c.cropType}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: C.greenMed, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: publishing === c.cropType ? 0.7 : 1, whiteSpace: 'nowrap' }}
              >
                {publishing === c.cropType ? 'Publishing…' : 'Publish This Lot'}
              </button>
            </div>
          </div>
        );
      })}
      <div style={{ textAlign: 'center', fontSize: 11, color: C.muted, padding: '4px 0' }}>— or build a listing manually below —</div>
    </div>
  );
}

export default function CreateGroupListingPage() {
  const router = useRouter();
  const [cropType, setCropType] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [priceTouched, setPriceTouched] = useState(false);
  const [district, setDistrict] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [members, setMembers] = useState<Member[]>([]);
  const [contributions, setContributions] = useState<Record<string, string>>({});
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});
  const [groupId, setGroupId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/groups/my-members')
      .then(r => r.json())
      .then(json => { setMembers(json.members ?? []); setGroupId(json.groupId ?? null); })
      .catch(() => {});
    fetch('/api/market-prices')
      .then(r => r.json())
      .then(json => setPriceMap(json.averages ?? {}))
      .catch(() => {});
  }, []);

  const marketPrice = priceMap[cropType] ?? null;
  const price = parseFloat(askingPrice);
  const low   = marketPrice && price > 0 && price < marketPrice * 0.85;
  const high  = marketPrice && price > 0 && price > marketPrice * 1.3;

  function selectCrop(value: string) {
    setCropType(value);
    if (!priceTouched) {
      const suggested = priceMap[value];
      setAskingPrice(suggested ? String(suggested) : '');
    }
  }

  const totalKg = Object.values(contributions).reduce((s, v) => s + (Number(v) || 0), 0);

  function setKg(memberId: string, value: string) {
    setContributions(prev => ({ ...prev, [memberId]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!cropType) { setError('Select a crop'); return; }
    if (totalKg <= 0) { setError('Enter each contributing member\'s quantity'); return; }
    if (!askingPrice || Number(askingPrice) <= 0) { setError('Enter a price per kg'); return; }
    if (!district) { setError('Select a district'); return; }
    setLoading(true); setError('');
    try {
      const contribArray = Object.entries(contributions)
        .filter(([, v]) => Number(v) > 0)
        .map(([farmer_id, v]) => ({ farmer_id, quantity_kg: Number(v) }));

      const res = await fetch('/api/group-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop_type: cropType,
          total_quantity_kg: totalKg,
          asking_price: Number(askingPrice),
          district,
          notes: notes || null,
          image_url: imageUrl || null,
          member_count: contribArray.length,
          contributions: contribArray,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? 'Failed to create listing');
      router.push('/groups/listings');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <Link href="/groups/listings" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>← Group Listings</Link>
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em' }}>Create Group Listing</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Pool your members' produce to sell as one lot. When it sells, each member is paid automatically based on how much they put in.</p>
      </div>

      {groupId && (
        <OrganizeSubmissions groupId={groupId} priceMap={priceMap} />
      )}

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16, background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Crop *</label>
            <select value={cropType} onChange={e => selectCrop(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: cropType ? C.text : C.muted, background: 'var(--d-input-bg)', outline: 'none' }}>
              <option value="">Select crop...</option>
              {CROPS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>District *</label>
            <select value={district} onChange={e => setDistrict(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: district ? C.text : C.muted, background: 'var(--d-input-bg)', outline: 'none' }}>
              <option value="">Select district...</option>
              {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
            Photo of the produce <span style={{ fontWeight: 400, color: C.muted }}>(recommended — buyers trust listings with a real photo)</span>
          </label>
          <CameraCapture onCaptured={setImageUrl} onCancel={() => {}} label="Take a photo of the produce" />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
            Asking Price / kg (UGX) *
            {marketPrice && !priceTouched && (
              <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, color: C.greenMed }}>(suggested from today's market)</span>
            )}
          </label>
          <input
            type="number" value={askingPrice}
            onChange={e => { setPriceTouched(true); setAskingPrice(e.target.value); }}
            min="1" placeholder={marketPrice ? `Market: ${marketPrice.toLocaleString()}` : 'e.g. 1400'}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, color: C.text,
              background: low ? 'var(--color-danger-bg)' : 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box',
              border: `1.5px solid ${low || high ? 'var(--color-danger)' : C.border}`,
            }}
          />
          {marketPrice && price > 0 && (
            <p style={{ fontSize: 11, marginTop: 4, fontWeight: 600, color: low ? 'var(--color-danger)' : high ? 'var(--color-harvest)' : 'var(--color-success)' }}>
              {low ? `${Math.round((price / marketPrice - 1) * 100)}% below market — buyers may hesitate`
                : high ? `${Math.round((price / marketPrice - 1) * 100)}% above market`
                : `Within market range (UGX ${marketPrice.toLocaleString()}/kg)`}
            </p>
          )}
        </div>

        {/* Per-member contributions */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
            How much is each member putting in (kg)? *
          </label>
          {members.length === 0 ? (
            <p style={{ fontSize: 12, color: C.muted }}>Loading members…</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 13, color: C.text }}>{m.full_name}</span>
                  <input
                    type="number" min="0" placeholder="0" value={contributions[m.id] ?? ''}
                    onChange={e => setKg(m.id, e.target.value)}
                    style={{ width: 100, padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <span style={{ fontSize: 12, color: C.muted, width: 20 }}>kg</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Total</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.greenMed }}>{totalKg.toLocaleString()} kg</span>
              </div>
            </div>
          )}
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Notes <span style={{ fontWeight: 400, color: C.muted }}>(optional)</span></label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Grade, drying status, packaging available, pickup point..." style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', color: C.text, background: 'var(--d-input-bg)', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {error && <p style={{ color: 'var(--color-danger)', fontSize: 12, margin: 0 }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ padding: '12px', background: loading ? 'var(--color-surface-2)' : C.greenMed, color: loading ? C.muted : '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Publishing...' : 'Publish Listing →'}
        </button>
      </form>
    </div>
  );
}
