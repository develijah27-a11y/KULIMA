'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, TrendingUp } from 'lucide-react';
import { CameraCapture } from '@/components/ui/CameraCapture';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  green: 'var(--color-primary)', greenBright: 'var(--color-primary-muted)',
};

const CROPS = [
  'maize','beans','coffee','rice','banana','cassava','tomato',
  'sorghum','groundnuts','sweet_potatoes','sunflower','cotton','other',
];
const DISTRICTS = [
  'Kampala','Wakiso','Mukono','Jinja','Mbale','Gulu','Lira','Masaka',
  'Mbarara','Kabale','Fort Portal','Arua','Soroti','Tororo','Iganga',
  'Hoima','Kasese','Mityana','Mubende','Ntungamo','Rakai','Kyotera',
  'Kalangala','Busia','Buikwe',
];

interface Props {
  priceMap: Record<string, number>;
  farmerDistrict?: string;
}

export function CreateListingForm({ priceMap, farmerDistrict }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [priceTouched, setPriceTouched] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [form, setForm]       = useState({
    cropType:     '',
    quantityKg:   '',
    askingPrice:  '',
    district:     farmerDistrict ?? '',
    availableFrom: new Date().toISOString().slice(0, 10),
    notes:        '',
  });

  const marketPrice = priceMap[form.cropType] ?? null;
  const price  = parseFloat(form.askingPrice);
  const low    = marketPrice && price > 0 && price < marketPrice * 0.85;
  const high   = marketPrice && price > 0 && price > marketPrice * 1.3;

  function set(k: keyof typeof form, v: string) {
    setForm(p => {
      const next = { ...p, [k]: v };
      // Pre-fill the asking price with today's market rate when the farmer
      // picks a crop, as long as they haven't typed their own price yet.
      if (k === 'cropType' && !priceTouched) {
        const suggested = priceMap[v];
        next.askingPrice = suggested ? String(suggested) : '';
      }
      return next;
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.cropType || !form.quantityKg || !form.askingPrice || !form.district) {
      setError('Please fill all required fields'); return;
    }
    if (!imageUrl) {
      setError('Take a live photo of your produce before posting'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cropType:     form.cropType,
          quantityKg:   parseFloat(form.quantityKg),
          askingPrice:  parseFloat(form.askingPrice),
          district:     form.district,
          availableFrom: form.availableFrom,
          notes:        form.notes || undefined,
          imageUrl,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed to create listing');
      router.push('/farmer/marketplace');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Photo — required, live camera capture only */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
          Photo of Your Produce *
        </label>
        {imageUrl ? (
          <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
            <img src={imageUrl} alt="Captured produce" style={{ width: '100%', display: 'block' }} />
            <button
              type="button"
              onClick={() => setImageUrl('')}
              style={{ position: 'absolute', top: 8, right: 8, padding: '6px 12px', borderRadius: 8, border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              Retake
            </button>
          </div>
        ) : (
          <CameraCapture onCaptured={setImageUrl} label="Take a photo of your produce" />
        )}
      </div>

      {/* Crop type */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
          Crop Type *
        </label>
        <select
          value={form.cropType}
          onChange={e => set('cropType', e.target.value)}
          required
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, background: '#fff', outline: 'none' }}
        >
          <option value="">Select crop...</option>
          {CROPS.map(c => (
            <option key={c} value={c} style={{ textTransform: 'capitalize' }}>
              {c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      {/* Live Market Price Helper Benchmark Card */}
      {marketPrice && (
        <div style={{
          background: 'var(--color-primary-bg)',
          border: '1.5px solid var(--color-primary-muted)',
          borderRadius: 12,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
              <TrendingUp size={18} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Today's Market Rate ({form.cropType.replace(/_/g, ' ')})
              </p>
              <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-primary)', margin: '2px 0 0', letterSpacing: '-0.02em' }}>
                UGX {marketPrice.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 500, color: C.muted }}>/ kg</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setPriceTouched(true); set('askingPrice', String(marketPrice)); }}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--color-primary)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
          >
            Apply Market Price
          </button>
        </div>
      )}

      {/* Quantity + Price side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Quantity (kg) *</label>
          <input
            type="number" min="1" step="0.1"
            value={form.quantityKg}
            onChange={e => set('quantityKg', e.target.value)}
            placeholder="e.g. 500"
            required
            style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
            Your Price per kg (UGX) *
          </label>
          <input
            type="number" min="1"
            value={form.askingPrice}
            onChange={e => { setPriceTouched(true); set('askingPrice', e.target.value); }}
            placeholder={marketPrice ? `Suggested: ${marketPrice.toLocaleString()}` : 'e.g. 1200'}
            required
            style={{
              width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box',
              border: `1.5px solid ${low ? 'var(--color-danger)' : high ? 'var(--color-harvest)' : marketPrice && price > 0 ? 'var(--color-primary)' : C.border}`,
              color: C.text, background: low ? 'var(--color-danger-bg)' : 'var(--d-input-bg)',
            }}
          />
          {marketPrice && price > 0 && (
            <div style={{ marginTop: 6, fontSize: 11.5, fontWeight: 600, lineHeight: 1.3 }}>
              {low ? (
                <p style={{ color: 'var(--color-danger)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertTriangle size={12} /> {Math.round((1 - price / marketPrice) * 100)}% below market — quick sale, but check your profit margin.
                </p>
              ) : high ? (
                <p style={{ color: 'var(--color-harvest)', margin: 0 }}>
                  ↑ {Math.round((price / marketPrice - 1) * 100)}% above market (UGX {marketPrice.toLocaleString()}/kg) — buyers may compare with other lots.
                </p>
              ) : (
                <p style={{ color: 'var(--color-success)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={12} /> Fair market price · Buyers are ready to purchase at this rate.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Calculated Total Payout Preview */}
      {price > 0 && parseFloat(form.quantityKg) > 0 && (
        <div style={{ padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Total Listing Payout:</span>
          <span style={{ fontSize: 15, fontWeight: 900, color: C.green }}>
            UGX {Math.round(price * parseFloat(form.quantityKg)).toLocaleString()}
          </span>
        </div>
      )}

      {/* District + Available from */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>District *</label>
          <select
            value={form.district}
            onChange={e => set('district', e.target.value)}
            required
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, color: form.district ? C.text : C.muted, background: 'var(--d-input-bg)', outline: 'none' }}
          >
            <option value="">Select district...</option>
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>Available From</label>
          <input
            type="date"
            value={form.availableFrom}
            onChange={e => set('availableFrom', e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, color: C.text, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'block', marginBottom: 6 }}>
          Additional Notes <span style={{ color: C.muted, fontWeight: 400 }}>(optional)</span>
        </label>
        <textarea
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Describe quality, delivery terms, minimum order, etc..."
          rows={3}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, color: C.text, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
        />
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'var(--color-danger-bg)', borderRadius: 10, border: '1px solid var(--color-danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-danger)', fontSize: 13 }}><AlertTriangle size={13} />{error}</div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '14px', background: loading ? C.border : C.green,
          color: loading ? C.muted : '#fff', border: 'none', borderRadius: 12,
          fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Creating...' : 'Post Listing →'}
      </button>
    </form>
  );
}
