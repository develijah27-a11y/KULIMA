'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  CROP_PROFILES, COST_CATEGORIES, COST_LABELS, SEASONS,
  getDefaultCosts, calculateFarmFinancials,
  type FarmCalcResult,
} from '@/lib/farm-finance';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)', greenBright: 'var(--color-primary-muted)',
  amber: 'var(--color-harvest)', red: 'var(--color-danger)', blue: 'var(--color-sky)',
  cardBg: 'var(--d-card)',
  shadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)',
};

const VERDICT_CFG = {
  highly_profitable: { bg: 'var(--color-primary-bg)',  border: 'var(--color-primary-muted)', color: 'var(--color-success)', icon: '🚀', label: 'Highly Profitable' },
  profitable:        { bg: 'var(--color-success-bg)',  border: 'var(--color-success)',        color: 'var(--color-success)', icon: '✅', label: 'Profitable'        },
  marginal:          { bg: 'var(--color-harvest-bg)',  border: 'var(--color-harvest)',        color: 'var(--color-harvest)', icon: '⚠️', label: 'Marginal'          },
  loss:              { bg: 'var(--color-danger-bg)',   border: 'var(--color-danger)',         color: 'var(--color-danger)',  icon: '❌', label: 'Likely a Loss'     },
};

const NUM_INPUTS: Record<string, string> = {
  '': '', '0': '0',
};

function fmt(n: number) {
  return n.toLocaleString('en-UG');
}

function parseNum(s: string): number {
  const v = parseFloat(s.replace(/,/g, ''));
  return isNaN(v) ? 0 : v;
}

interface Props {
  marketPrices: Record<string, number>; // crop → latest market price
  primaryCrop: string;
}

export function CalculatorClient({ marketPrices, primaryCrop }: Props) {
  const cropKeys = Object.keys(CROP_PROFILES);

  const [cropType, setCropType]         = useState(primaryCrop || 'maize');
  const [areaHa, setAreaHa]             = useState('1');
  const [irrigated, setIrrigated]       = useState(false);
  const [targetMargin, setTargetMargin] = useState('40');
  const [season, setSeason]             = useState('A2026');
  const [costs, setCosts]               = useState<Record<string, string>>({});
  const [marketPriceInput, setMarketPriceInput] = useState('');
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);
  const [customCosts, setCustomCosts]   = useState<{ label: string; amount: string }[]>([]);

  // Reset costs when crop or area changes
  useEffect(() => {
    const ha = parseFloat(areaHa) || 1;
    const defaults = getDefaultCosts(cropType, ha);
    const strDefaults: Record<string, string> = {};
    Object.entries(defaults).forEach(([k, v]) => {
      strDefaults[k] = v > 0 ? String(v) : '';
    });
    setCosts(strDefaults);
    setSaved(false);
  }, [cropType, areaHa]);

  // Auto-fill market price when crop changes
  useEffect(() => {
    const mp = marketPrices[cropType] ?? marketPrices[cropType.replace(/_/g, ' ')] ?? 0;
    if (mp > 0) setMarketPriceInput(String(mp));
  }, [cropType, marketPrices]);

  const profile = CROP_PROFILES[cropType];
  const ha = parseFloat(areaHa) || 1;

  const parsedCosts: Record<string, number> = {};
  COST_CATEGORIES.forEach(cat => {
    parsedCosts[cat.key] = parseNum(costs[cat.key] ?? '');
  });
  customCosts.forEach((item, i) => {
    parsedCosts[`custom_${i}`] = parseNum(item.amount);
  });

  const result: FarmCalcResult | null = useMemo(() => {
    if (!profile) return null;
    try {
      return calculateFarmFinancials({
        cropType,
        areaHa: ha,
        irrigated,
        costs: parsedCosts,
        marketPricePerKg: parseNum(marketPriceInput),
        targetMarginPct: parseFloat(targetMargin) || 40,
      });
    } catch {
      return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropType, areaHa, irrigated, JSON.stringify(parsedCosts), marketPriceInput, targetMargin]);

  const totalCosts = Object.values(parsedCosts).reduce((s, v) => s + v, 0);
  const marketPriceNum = parseNum(marketPriceInput);

  async function saveProjection() {
    if (!result) return;
    setSaving(true);
    try {
      await fetch('/api/farm-projections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop_type: cropType,
          area_ha: ha,
          season,
          irrigated,
          market_price_per_kg: marketPriceNum,
          target_margin_pct: parseFloat(targetMargin) || 40,
          costs_json: parsedCosts,
          projected_yield_kg: result.yield.realistic,
          projected_revenue_ugx: result.revenue.realistic,
          projected_profit_ugx: result.profit.realistic,
          suggested_price_per_kg: result.suggestedPricePerKg,
          break_even_price_per_kg: result.breakEvenPricePerKg,
        }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 12px',
    background: 'var(--d-input-bg)', border: `1.5px solid ${C.border}`, borderRadius: '8px',
    fontSize: '13px', color: C.text, outline: 'none', boxSizing: 'border-box',
  };

  const verdictCfg = result ? VERDICT_CFG[result.verdict] : null;

  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }} className="calc-layout">

      {/* ━━━━━━━━ LEFT: Inputs ━━━━━━━━ */}
      <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ── Crop & Farm Setup ── */}
        <section style={{ background: C.cardBg, borderRadius: '16px', boxShadow: C.shadow, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, background: 'var(--color-primary-bg)' }}>
            <p style={{ fontSize: '14px', fontWeight: 800, color: C.green }}>🌾 Step 1 — Crop & Farm Setup</p>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Crop selector */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: C.muted, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Crop Type
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {cropKeys.map(key => {
                  const p = CROP_PROFILES[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCropType(key)}
                      style={{
                        padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
                        border: `1.5px solid ${cropType === key ? C.green : C.border}`,
                        background: cropType === key ? 'var(--color-primary-bg)' : 'var(--d-input-bg)',
                        color: cropType === key ? C.green : C.muted,
                        cursor: 'pointer',
                      }}
                    >
                      {p.emoji} {p.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: C.muted, display: 'block', marginBottom: '6px' }}>
                  Farm Area (hectares)
                </label>
                <input
                  type="number" min="0.1" step="0.1"
                  value={areaHa}
                  onChange={e => setAreaHa(e.target.value)}
                  style={inp}
                  placeholder="e.g. 2.5"
                />
                <p style={{ fontSize: '11px', color: C.muted, marginTop: '3px' }}>1 ha ≈ 2.47 acres</p>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: C.muted, display: 'block', marginBottom: '6px' }}>
                  Season
                </label>
                <select value={season} onChange={e => setSeason(e.target.value)} style={inp}>
                  {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: C.muted, display: 'block', marginBottom: '6px' }}>
                  Target Profit Margin
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number" min="10" max="200"
                    value={targetMargin}
                    onChange={e => setTargetMargin(e.target.value)}
                    style={{ ...inp, paddingRight: '28px' }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: C.muted }}>%</span>
                </div>
              </div>
            </div>

            {/* Seed info */}
            <div style={{ background: 'var(--d-subtle)', borderRadius: '10px', padding: '12px 16px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {profile.seedRateKgPerHa > 0 ? (
                <>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: C.muted, marginBottom: '2px' }}>Seeds Needed</p>
                    <p style={{ fontSize: '14px', fontWeight: 800, color: C.text }}>
                      {Math.round(profile.seedRateKgPerHa * ha)} kg
                    </p>
                    <p style={{ fontSize: '11px', color: C.muted }}>{profile.seedRateKgPerHa} kg/ha</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: C.muted, marginBottom: '2px' }}>Seed Cost Est.</p>
                    <p style={{ fontSize: '14px', fontWeight: 800, color: C.text }}>
                      UGX {fmt(Math.round(profile.seedRateKgPerHa * profile.seedCostUGXPerKg * ha))}
                    </p>
                    <p style={{ fontSize: '11px', color: C.muted }}>@ UGX {fmt(profile.seedCostUGXPerKg)}/kg</p>
                  </div>
                </>
              ) : (
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: C.muted, marginBottom: '2px' }}>Planting Material</p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>{profile.plantingMaterialNote}</p>
                  <p style={{ fontSize: '11px', color: C.muted }}>Est. cost: UGX {fmt(Math.round((profile.plantingMaterialCostPerHa ?? 0) * ha))}</p>
                </div>
              )}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: C.muted, marginBottom: '2px' }}>Expected Yield (realistic)</p>
                <p style={{ fontSize: '14px', fontWeight: 800, color: C.text }}>
                  {fmt(Math.round(profile.yieldKgPerHa.realistic * (irrigated ? profile.irrigatedYieldMultiplier : 1) * ha))} kg
                </p>
                <p style={{ fontSize: '11px', color: C.muted }}>
                  {fmt(profile.yieldKgPerHa.realistic)} kg/ha · {profile.durationDays} days
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIrrigated(v => !v)}
                  style={{
                    padding: '8px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                    border: `1.5px solid ${irrigated ? C.blue : C.border}`,
                    background: irrigated ? 'var(--color-sky-bg)' : 'var(--d-input-bg)',
                    color: irrigated ? C.blue : C.muted,
                    cursor: 'pointer',
                  }}
                >
                  💧 {irrigated ? 'Irrigated ✓' : 'Rain-fed'}
                </button>
              </div>
            </div>

            {/* Agronomy tip */}
            <div style={{ background: 'var(--color-harvest-bg)', borderRadius: '10px', padding: '10px 14px', display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>💡</span>
              <p style={{ fontSize: '12px', color: 'var(--color-harvest)', lineHeight: '1.5' }}>{profile.agronomy}</p>
            </div>
          </div>
        </section>

        {/* ── Input Costs ── */}
        <section style={{ background: C.cardBg, borderRadius: '16px', boxShadow: C.shadow, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, background: 'var(--color-sky-bg)' }}>
            <p style={{ fontSize: '14px', fontWeight: 800, color: C.blue }}>💸 Step 2 — Input Costs</p>
            <p style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>
              Pre-filled with Uganda averages for {ha} ha · Edit to match your actual costs
            </p>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '0' }}>
            {/* Group: Seeds */}
            <CostGroup label="Seeds & Planting Material" icon="🌱" costKeys={['seeds']} costs={costs} setCosts={setCosts} inp={inp} />
            <CostGroup label="Land Preparation" icon="🚜" costKeys={['landPrep']} costs={costs} setCosts={setCosts} inp={inp} />
            <CostGroup label="Fertilizers" icon="💊" costKeys={['dap', 'can', 'lime']} costs={costs} setCosts={setCosts} inp={inp} />
            <CostGroup label="Crop Protection" icon="🧴" costKeys={['herbicide', 'fungicide', 'pesticide']} costs={costs} setCosts={setCosts} inp={inp} />
            <CostGroup label="Labor" icon="👷" costKeys={['laborPlanting', 'laborWeeding', 'laborHarvest', 'laborProcessing']} costs={costs} setCosts={setCosts} inp={inp} />
            <CostGroup label="Transport & Storage" icon="🚛" costKeys={['transport', 'packaging', 'irrigation', 'storage']} costs={costs} setCosts={setCosts} inp={inp} />
            <CostGroup label="Other" icon="➕" costKeys={['insurance', 'other']} costs={costs} setCosts={setCosts} inp={inp} />

            {/* Custom items */}
            {customCosts.map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 32px', gap: '8px', alignItems: 'center', paddingBottom: '8px', borderBottom: `1px solid ${C.border}`, marginBottom: '8px' }}>
                <input
                  value={item.label}
                  onChange={e => setCustomCosts(prev => prev.map((c, idx) => idx === i ? { ...c, label: e.target.value } : c))}
                  placeholder="Cost description"
                  style={inp}
                />
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: C.muted }}>UGX</span>
                  <input
                    type="number" min="0"
                    value={item.amount}
                    onChange={e => setCustomCosts(prev => prev.map((c, idx) => idx === i ? { ...c, amount: e.target.value } : c))}
                    placeholder="0"
                    style={{ ...inp, paddingLeft: '44px' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setCustomCosts(prev => prev.filter((_, idx) => idx !== i))}
                  style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-danger-bg)', color: C.red, border: 'none', cursor: 'pointer', fontSize: '18px' }}
                >×</button>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px' }}>
              <button
                type="button"
                onClick={() => setCustomCosts(prev => [...prev, { label: '', amount: '' }])}
                style={{
                  padding: '7px 14px', background: 'var(--color-primary-bg)', color: C.green,
                  border: `1.5px solid var(--color-primary-muted)`, borderRadius: '8px',
                  fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                }}
              >
                + Add Custom Cost
              </button>
              <p style={{ fontSize: '13px', fontWeight: 800, color: C.text }}>
                Total: UGX {fmt(Math.round(totalCosts))}
              </p>
            </div>
          </div>
        </section>

        {/* ── Market price input ── */}
        <section style={{ background: C.cardBg, borderRadius: '16px', boxShadow: C.shadow, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, background: 'var(--color-harvest-bg)' }}>
            <p style={{ fontSize: '14px', fontWeight: 800, color: C.amber }}>📊 Step 3 — Market & Selling Price</p>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: C.muted, display: 'block', marginBottom: '6px' }}>
                  Current Market Price (UGX/kg)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: C.muted }}>UGX</span>
                  <input
                    type="number" min="0"
                    value={marketPriceInput}
                    onChange={e => setMarketPriceInput(e.target.value)}
                    placeholder="e.g. 650"
                    style={{ ...inp, paddingLeft: '48px' }}
                  />
                </div>
                <p style={{ fontSize: '11px', color: C.muted, marginTop: '3px' }}>
                  {marketPrices[cropType] ? `Live market: UGX ${fmt(marketPrices[cropType])}/kg` : 'Check Prices page for live data'}
                </p>
              </div>
              <div style={{ padding: '14px', background: 'var(--d-subtle)', borderRadius: '10px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: C.muted, marginBottom: '6px' }}>Market Tip</p>
                <p style={{ fontSize: '12px', color: C.text, lineHeight: '1.5' }}>{profile.marketPriceTip}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ━━━━━━━━ RIGHT: Results (sticky) ━━━━━━━━ */}
      <div style={{ width: '360px', flexShrink: 0, position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {result ? (
          <>
            {/* Verdict */}
            <div style={{ borderRadius: '16px', padding: '20px', background: verdictCfg!.bg, border: `2px solid ${verdictCfg!.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{ fontSize: '24px' }}>{verdictCfg!.icon}</span>
                <p style={{ fontSize: '16px', fontWeight: 800, color: verdictCfg!.color }}>{verdictCfg!.label}</p>
              </div>
              <p style={{ fontSize: '13px', color: C.text, lineHeight: '1.5' }}>{result.verdictMessage}</p>
            </div>

            {/* Yield projections */}
            <div style={{ background: C.cardBg, borderRadius: '16px', boxShadow: C.shadow, padding: '20px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
                Expected Harvest — {ha} ha of {profile.name}
              </p>
              {(['pessimistic', 'realistic', 'optimistic'] as const).map((scenario, i) => {
                const yieldVal = result.yield[scenario];
                const rev = result.revenue[scenario];
                const pct = result.yield.optimistic > 0 ? Math.round((yieldVal / result.yield.optimistic) * 100) : 0;
                const colors = ['var(--color-danger)', 'var(--color-success)', 'var(--color-sky)'];
                const labels = ['Pessimistic', 'Realistic', 'Optimistic'];
                return (
                  <div key={scenario} style={{ marginBottom: i < 2 ? '14px' : '0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: C.muted }}>{labels[i]}</p>
                      <p style={{ fontSize: '12px', fontWeight: 800, color: C.text }}>{fmt(yieldVal)} kg</p>
                    </div>
                    <div style={{ height: '8px', background: 'var(--color-surface-2)', borderRadius: '4px', overflow: 'hidden', marginBottom: '3px' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: colors[i], borderRadius: '4px' }} />
                    </div>
                    {marketPriceNum > 0 && (
                      <p style={{ fontSize: '11px', color: C.muted }}>
                        Revenue: UGX {fmt(rev)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Key numbers */}
            <div style={{ background: C.cardBg, borderRadius: '16px', boxShadow: C.shadow, padding: '0', overflow: 'hidden' }}>
              {[
                { label: 'Total Input Costs',     value: `UGX ${fmt(result.totalCosts)}`,              color: C.red },
                { label: 'Expected Revenue',       value: marketPriceNum > 0 ? `UGX ${fmt(result.revenue.realistic)}` : '—', color: C.green },
                { label: 'Net Profit (realistic)', value: marketPriceNum > 0 ? `${result.profit.realistic >= 0 ? '+' : ''}UGX ${fmt(result.profit.realistic)}` : '—', color: result.profit.realistic >= 0 ? C.greenMed : C.red, big: true },
                { label: 'Profit Margin',          value: marketPriceNum > 0 ? `${result.marginPct.realistic}%` : '—', color: result.marginPct.realistic >= 0 ? C.greenMed : C.red },
                { label: 'Return on Investment',   value: `${result.roiPct}%`,                          color: result.roiPct >= 0 ? C.greenMed : C.red },
                { label: 'Cost per kg',            value: `UGX ${fmt(result.costPerKgRealistic)}/kg`,   color: C.text },
                { label: '⚠ Break-even Price',    value: `UGX ${fmt(result.breakEvenPricePerKg)}/kg`, color: C.amber },
                { label: '✅ Suggested Sell Price', value: `UGX ${fmt(result.suggestedPricePerKg)}/kg`, color: C.blue, big: true },
              ].map(({ label, value, color, big }, i) => (
                <div
                  key={label}
                  style={{
                    padding: big ? '12px 16px' : '10px 16px',
                    borderBottom: i < 7 ? `1px solid ${C.border}` : 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: label.includes('Suggested') ? 'var(--color-sky-bg)' : label.includes('break-even') || label.includes('Break-even') ? 'var(--color-harvest-bg)' : 'transparent',
                  }}
                >
                  <p style={{ fontSize: '12px', fontWeight: 600, color: C.muted }}>{label}</p>
                  <p style={{ fontSize: big ? '16px' : '14px', fontWeight: 800, color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Cost breakdown */}
            {result.costBreakdown.length > 0 && (
              <div style={{ background: C.cardBg, borderRadius: '16px', boxShadow: C.shadow, padding: '20px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                  Cost Breakdown
                </p>
                {result.costBreakdown.slice(0, 6).map(item => (
                  <div key={item.key} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <p style={{ fontSize: '12px', color: C.text }}>{item.label}</p>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: C.text }}>{item.pct}%</p>
                    </div>
                    <div style={{ height: '5px', background: 'var(--color-surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${item.pct}%`, background: C.greenMed, borderRadius: '3px' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Save button */}
            <button
              onClick={saveProjection}
              disabled={saving || saved}
              style={{
                padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 800,
                background: saved ? 'var(--color-success-bg)' : saving ? 'var(--color-surface-2)' : `linear-gradient(135deg, ${C.green} 0%, #2D6A4F 100%)`,
                color: saved ? 'var(--color-success)' : saving ? C.muted : '#FFFFFF',
                border: 'none', cursor: saving || saved ? 'default' : 'pointer',
                width: '100%',
              }}
            >
              {saved ? '✓ Saved to Farm Plans' : saving ? 'Saving…' : '💾 Save This Plan'}
            </button>
          </>
        ) : (
          <div style={{ background: C.cardBg, borderRadius: '16px', boxShadow: C.shadow, padding: '40px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', marginBottom: '12px' }}>🧮</p>
            <p style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>Results appear here</p>
            <p style={{ fontSize: '13px', color: C.muted, lineHeight: '1.5' }}>Fill in your farm details and costs — results update instantly</p>
          </div>
        )}
      </div>

      <style>{`
        .calc-layout { flex-direction: row; }
        @media (max-width: 900px) {
          .calc-layout { flex-direction: column !important; }
          .calc-layout > div:last-child { width: 100% !important; position: relative !important; top: 0 !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Cost group sub-component ───────────────────────────────────────────────

function CostGroup({
  label, icon, costKeys, costs, setCosts, inp,
}: {
  label: string;
  icon: string;
  costKeys: string[];
  costs: Record<string, string>;
  setCosts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  inp: React.CSSProperties;
}) {
  const [open, setOpen] = useState(true);
  const groupTotal = costKeys.reduce((s, k) => s + (parseFloat(costs[k] || '0') || 0), 0);

  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: '12px', marginBottom: '12px' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '4px 0', marginBottom: open ? '10px' : '0',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>
          {icon} {label}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {groupTotal > 0 && (
            <span style={{ fontSize: '12px', fontWeight: 700, color: C.greenMed }}>
              UGX {groupTotal.toLocaleString()}
            </span>
          )}
          <span style={{ fontSize: '16px', color: C.muted, transform: open ? 'rotate(90deg)' : 'none', transition: '0.2s' }}>›</span>
        </span>
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {costKeys.map(key => (
            <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: '8px', alignItems: 'center' }}>
              <label style={{ fontSize: '12px', color: C.muted }}>{COST_LABELS[key] ?? key}</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: C.muted }}>UGX</span>
                <input
                  type="number"
                  min="0"
                  value={costs[key] ?? ''}
                  onChange={e => setCosts(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder="0"
                  style={{ ...inp, paddingLeft: '40px' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
