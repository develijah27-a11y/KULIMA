'use client';

import { useState, useRef, useEffect } from 'react';
import { Microscope, Paperclip, AlertTriangle, FlaskConical, Lightbulb, Clock, Check, Leaf, Camera, BookOpen, ChevronRight, X, History } from 'lucide-react';
import { cacheDiseaseScan, getCachedDiseaseScans, type CachedDiseaseScan } from '@/lib/db';

const CROPS = [
  { value: 'maize',         label: 'Maize'        },
  { value: 'beans',         label: 'Beans'        },
  { value: 'coffee',        label: 'Coffee'       },
  { value: 'cassava',       label: 'Cassava'      },
  { value: 'tomato',        label: 'Tomato'       },
  { value: 'banana',        label: 'Banana'       },
  { value: 'groundnuts',    label: 'Groundnuts'   },
  { value: 'sorghum',       label: 'Sorghum'      },
  { value: 'sweet_potatoes',label: 'Sweet Potato' },
  { value: 'rice',          label: 'Rice'         },
  { value: 'sunflower',     label: 'Sunflower'    },
];

const PARTS = ['Leaf', 'Stem', 'Root', 'Fruit / Pod', 'Whole Plant', 'Soil'];

const SEVERITY_CFG = {
  high:   { label: 'HIGH SEVERITY',   bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)',  dot: 'var(--color-danger)'  },
  medium: { label: 'MEDIUM SEVERITY', bg: 'var(--color-harvest-bg)', color: 'var(--color-harvest)', dot: 'var(--color-harvest)' },
  low:    { label: 'LOW SEVERITY',    bg: 'var(--color-success-bg)', color: 'var(--color-success)', dot: 'var(--color-success)' },
};

interface DiseaseGuideItem {
  name: string;
  crop: string;
  color: string;
  bg: string;
  severity: 'high' | 'medium' | 'low';
  symptoms: string[];
  treatment: string[];
  prevention: string[];
  urgency: string;
}

const COMMON_DISEASES: DiseaseGuideItem[] = [
  {
    name: 'Fall Armyworm',
    crop: 'Maize',
    color: 'var(--color-danger)',
    bg: 'var(--color-danger-bg)',
    severity: 'high',
    symptoms: [
      'Chewed ragged holes in whorl leaves',
      'Sawdust-like brownish larval frass inside the leaf whorl',
      'Young caterpillars burrowing into growing cob tips',
      'Window-pane feeding marks from early instars',
    ],
    treatment: [
      'Early stage: Handpick caterpillars or apply wood ash/fine sand directly into the whorl',
      'Organic: Spray neem leaf/seed extract (Azadirachtin) late in the afternoon',
      'Chemical: Apply Emamectin benzoate (e.g. Striker 5WDG) or Spinetoram (Radiant) into whorls',
    ],
    prevention: [
      'Intercrop maize with silverleaf desmodium (Push-Pull strategy) to repel moths',
      'Plant early with first seasonal rains to escape peak moth populations',
      'Regular scouting: inspect 20 consecutive plants across 5 spots weekly',
    ],
    urgency: 'Action required within 48 hours to prevent severe grain loss',
  },
  {
    name: 'Northern Leaf Blight',
    crop: 'Maize',
    color: 'var(--color-harvest)',
    bg: 'var(--color-harvest-bg)',
    severity: 'medium',
    symptoms: [
      'Long cigar-shaped elliptical grayish-green or tan lesions (3-15cm long)',
      'Lesions merge to scorch entire leaf surface in humid weather',
      'Premature plant death causing loose chaffy ears',
    ],
    treatment: [
      'Remove and bury severely infected lower leaves before tasseling',
      'Fungicide: Spray Mancozeb (Dithane M-45) or Azoxystrobin early when lower lesions appear',
    ],
    prevention: [
      'Plant certified certified hybrid seeds bred for blight tolerance (e.g., Longe 10H, Bazooka)',
      'Rotate maize fields with non-grass crops (beans, groundnuts, sunflower)',
      'Deep plow old maize stover to bury fungal spores',
    ],
    urgency: 'Monitor and spray if lesions appear before ear silk emergence',
  },
  {
    name: 'Bacterial Wilt',
    crop: 'Tomato',
    color: 'var(--color-purple)',
    bg: 'var(--color-purple-bg)',
    severity: 'high',
    symptoms: [
      'Rapid wilting of entire plant while leaves remain completely green (no yellowing)',
      'Dark brown discoloration inside the vascular ring of the lower stem',
      'Clear water test: milky white bacterial stream oozes from cut stem in glass of water',
    ],
    treatment: [
      'No chemical cure exists once plant is infected',
      'Immediately uproot (rogue) wilted plants with root ball and burn away from field',
      'Do not throw infected plants into compost piles',
    ],
    prevention: [
      'Solarize seedbeds with clear polythene sheets for 4-6 weeks before transplanting',
      'Rotate with sugarcane, maize, or pasture grasses (avoid potatoes, peppers, eggplant)',
      'Graft commercial tomato scions onto resistant wild eggplant rootstocks',
    ],
    urgency: 'Immediate rogueing required to stop soil contamination',
  },
  {
    name: 'Mosaic Virus',
    crop: 'Cassava',
    color: 'var(--color-sky)',
    bg: 'var(--color-sky-bg)',
    severity: 'medium',
    symptoms: [
      'Characteristic mosaic pattern of bright yellow and green patches on leaf blades',
      'Distorted, twisted, crinkled, and stunted leaf growth',
      'Reduced tuber yield and root size',
    ],
    treatment: [
      'Uproot and burn diseased cassava plants at first sign',
      'Control whitefly populations (vectors) with botanical sprays like neem extract',
    ],
    prevention: [
      'Plant only certified clean cuttings from NARO (e.g., NASE 14, NAROCASS 1, NAROCASS 2)',
      'Never take stem cuttings from plants showing any yellowing or leaf curling',
      'Maintain at least 100 meters separation from neighboring infected cassava plots',
    ],
    urgency: 'Inspect weekly during the first 3 months of sprouting',
  },
  {
    name: 'Coffee Berry Disease',
    crop: 'Coffee',
    color: 'var(--color-harvest)',
    bg: 'var(--color-harvest-bg)',
    severity: 'high',
    symptoms: [
      'Dark sunken brownish necrotic spots on developing green berries',
      'Berry clusters turn black, dry out, and drop prematurely',
      'Mummified black berries left hanging on stems',
    ],
    treatment: [
      'Apply protective copper sprays (Copper Oxychloride 50% WP) during peak flowering and pinhead stages',
      'Strip and burn mummified cherries from trees after harvest',
    ],
    prevention: [
      'Prune old shade trees and branches to allow morning sunlight and reduce canopy humidity',
      'Plant resistant Arabica/Robusta clonal lines recommended by UCDA',
      'Ensure proper tree spacing (2.5m x 2.5m) to maintain cross-breeze',
    ],
    urgency: 'Fungicide schedule must begin before the first seasonal rains',
  },
  {
    name: 'Bean Anthracnose',
    crop: 'Beans',
    color: 'var(--color-success)',
    bg: 'var(--color-primary-bg)',
    severity: 'medium',
    symptoms: [
      'Dark brick-red to purplish sunken lesions along leaf veins on undersides',
      'Circular sunken lesions with reddish-brown borders on bean pods',
      'Infected seeds have dark discolored blotches',
    ],
    treatment: [
      'Apply foliar fungicide such as Mancozeb or Carbendazim at first flowering',
      'Do not cultivate or harvest while plants are wet with dew or rain',
    ],
    prevention: [
      'Use certified pathogen-free seed (e.g. NABE 4, NABE 15, NAROBEAN varieties)',
      '2-year crop rotation with maize or sorghum',
      'Destroy crop residue after harvest by burning or burying deep',
    ],
    urgency: 'Spray at initial pod formation if weather is cool and wet',
  },
];

type DiagnosisResult = {
  diseaseName: string;
  confidence: number;
  severity: 'high' | 'medium' | 'low';
  affectedPart: string;
  symptoms: string[];
  treatment: string[];
  prevention: string[];
  urgency: string;
  cropType: string;
};

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)', greenBright: 'var(--color-primary-muted)',
  red: 'var(--color-danger)', amber: 'var(--color-harvest)',
  cardBg: 'var(--d-card)', pageBg: 'var(--d-page)',
  shadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)',
};

export function PathologistClient() {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [crop, setCrop] = useState('maize');
  const [part, setPart] = useState('Leaf');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState<CachedDiseaseScan[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<DiseaseGuideItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load past scans saved in IndexedDB
  useEffect(() => {
    async function loadScans() {
      const cached = await getCachedDiseaseScans();
      if (cached && cached.length > 0) {
        setHistory(cached);
      }
    }
    loadScans();
  }, []);

  function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10MB'); return; }
    setError('');
    setResult(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function requestDiagnosis() {
    if (!preview) return;
    setLoading(true);
    setError('');

    // Check offline connectivity
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLoading(false);
      setError("You're offline. While online AI vision is paused, you can use the built-in Field Guide below to identify symptoms and treatments immediately!");
      // Auto-select corresponding crop in field guide
      const guideMatch = COMMON_DISEASES.find(d => d.crop.toLowerCase() === crop.toLowerCase());
      if (guideMatch) setSelectedGuide(guideMatch);
      return;
    }

    try {
      const res = await fetch('/api/doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: preview, cropType: crop, affectedPart: part }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Analysis failed');
      setResult(json.data);

      // Cache scan to IndexedDB
      const scanEntry: CachedDiseaseScan = {
        id: `scan-${Date.now()}`,
        diseaseName: json.data.diseaseName,
        confidence: json.data.confidence,
        severity: json.data.severity,
        affectedPart: json.data.affectedPart,
        symptoms: json.data.symptoms,
        treatment: json.data.treatment,
        prevention: json.data.prevention,
        urgency: json.data.urgency,
        cropType: json.data.cropType,
        imageUrl: preview,
        createdAt: Date.now(),
      };
      await cacheDiseaseScan(scanEntry);
      setHistory(prev => [scanEntry, ...prev.filter(h => h.id !== scanEntry.id)]);
    } catch (e: any) {
      setError(e.message ?? 'Could not complete analysis. Please check your connection.');
    }
    setLoading(false);
  }

  function clearAll() {
    setPreview(null);
    setFileName('');
    setResult(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  const sevCfg = result ? SEVERITY_CFG[result.severity] ?? SEVERITY_CFG.low : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Main 2-column panel ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }} className="md:grid-cols-2 grid-cols-1">

        {/* ── LEFT: Upload + controls ── */}
        <div style={{ background: C.cardBg, borderRadius: '16px', boxShadow: C.shadow, overflow: 'hidden' }}>

          {/* Upload zone */}
          <div
            onClick={() => !preview && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            style={{
              minHeight: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: dragOver ? 'var(--color-primary-bg)' : preview ? '#000' : 'var(--d-subtle)',
              border: dragOver ? `2px dashed ${C.greenBright}` : `2px dashed ${C.border}`,
              borderRadius: '0',
              cursor: preview ? 'default' : 'pointer',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {preview ? (
              <>
                <img
                  src={preview}
                  alt="Uploaded plant photo"
                  style={{ width: '100%', maxHeight: '320px', objectFit: 'contain', display: 'block' }}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); clearAll(); }}
                  style={{
                    position: 'absolute', top: '10px', right: '10px',
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none',
                    cursor: 'pointer', fontSize: '18px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                  }}
                  title="Remove image"
                >
                  ×
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 24px' }}>
                <div
                  style={{
                    width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 16px',
                    background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--color-primary)',
                  }}
                >
                  <Microscope size={28} />
                </div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '6px' }}>
                  Upload Plant Photo
                </p>
                <p style={{ fontSize: '13px', color: C.muted, marginBottom: '4px' }}>
                  Drag & drop or tap to select
                </p>
                <p style={{ fontSize: '12px', color: C.muted }}>JPG · PNG · WEBP · max 10MB</p>
              </div>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {/* Controls */}
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {fileName && (
              <p style={{ fontSize: '12px', color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Paperclip size={12} />{fileName}
              </p>
            )}

            {/* Crop selector */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: C.muted, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Crop Type
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {CROPS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCrop(c.value)}
                    style={{
                      padding: '5px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                      border: `1.5px solid ${crop === c.value ? C.green : C.border}`,
                      background: crop === c.value ? 'var(--color-primary-bg)' : 'var(--d-card)',
                      color: crop === c.value ? C.green : C.muted,
                      cursor: 'pointer',
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Affected part */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: C.muted, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Affected Part
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {PARTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPart(p)}
                    style={{
                      padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                      border: `1.5px solid ${part === p ? C.green : C.border}`,
                      background: part === p ? 'var(--color-primary-bg)' : 'var(--d-card)',
                      color: part === p ? C.green : C.muted,
                      cursor: 'pointer',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', color: C.red, background: 'var(--color-danger-bg)', padding: '10px 14px', borderRadius: '8px' }}>
                <AlertTriangle size={14} />{error}
              </div>
            )}

            <button
              onClick={requestDiagnosis}
              disabled={!preview || loading}
              style={{
                padding: '12px 20px',
                background: !preview || loading ? 'var(--color-surface-2)' : `linear-gradient(135deg, ${C.green} 0%, #2D6A4F 100%)`,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: !preview || loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.01em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  Analysing…
                </>
              ) : (
                <><Microscope size={16} />Request Diagnosis</>
              )}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Diagnosis report ── */}
        <div style={{ background: C.cardBg, borderRadius: '16px', boxShadow: C.shadow, overflow: 'hidden', minHeight: '480px' }}>
          {!result ? (
            /* Empty state */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '48px 32px', textAlign: 'center', minHeight: '480px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: C.muted }}><FlaskConical size={48} /></div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>
                Awaiting Sample
              </p>
              <p style={{ fontSize: '13px', color: C.muted, lineHeight: '1.6', maxWidth: '240px' }}>
                Upload a clear photo of your affected plant and select the crop type to receive an expert diagnosis.
              </p>
              <div
                style={{
                  marginTop: '24px', padding: '12px 20px',
                  background: 'var(--color-primary-bg)', borderRadius: '10px',
                  border: '1px solid var(--color-primary-muted)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: '12px', color: 'var(--color-primary-hover)', fontWeight: 600 }}>
                  <Lightbulb size={12} style={{ flexShrink: 0, marginTop: 1 }} />Best results: photograph in good daylight, focus on the most affected leaf or part
                </div>
              </div>
            </div>
          ) : (
            /* Diagnosis report */
            <>
              {/* Report header */}
              <div style={{ padding: '20px', background: sevCfg!.bg, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                      Diagnostic Report · {new Date().toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <p style={{ fontSize: '20px', fontWeight: 800, color: C.text, letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                      {result.diseaseName}
                    </p>
                    {result.affectedPart && result.affectedPart !== 'N/A' && (
                      <p style={{ fontSize: '13px', color: C.muted, marginTop: '4px' }}>
                        Affects: {result.affectedPart}
                        {result.cropType && ` · ${result.cropType.charAt(0).toUpperCase() + result.cropType.slice(1)}`}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '20px',
                        background: sevCfg!.bg, color: sevCfg!.color,
                        border: `1.5px solid ${sevCfg!.color}`,
                      }}
                    >
                      ● {sevCfg!.label}
                    </span>
                  </div>
                </div>

                {/* Confidence bar */}
                <div style={{ marginTop: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Confidence
                    </p>
                    <p style={{ fontSize: '13px', fontWeight: 800, color: result.confidence >= 50 ? sevCfg!.color : C.muted }}>
                      {result.confidence}%
                    </p>
                  </div>
                  <div style={{ height: '8px', background: 'var(--color-surface-2)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%', borderRadius: '4px',
                        width: `${result.confidence}%`,
                        background: result.confidence >= 70 ? sevCfg!.color : result.confidence >= 40 ? C.amber : 'var(--d-muted)',
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Report body */}
              <div style={{ padding: '0', overflowY: 'auto', maxHeight: '480px' }}>

                {/* Urgency notice */}
                {result.urgency && (
                  <div style={{ padding: '12px 20px', background: 'var(--color-harvest-bg)', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '12px', fontWeight: 600, color: C.amber }}>
                      <Clock size={12} />{result.urgency}
                    </div>
                  </div>
                )}

                {/* Symptoms */}
                {result.symptoms && result.symptoms.length > 0 && (
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
                    <p style={{ fontSize: '11px', fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                      Observed Symptoms
                    </p>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {result.symptoms.map((s, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: C.text }}>
                          <span style={{ color: C.red, fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>•</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Treatment */}
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
                  <p style={{ fontSize: '11px', fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                    Treatment Protocol
                  </p>
                  <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {result.treatment.map((t, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: C.text }}>
                        <span
                          style={{
                            width: '22px', height: '22px', borderRadius: '50%', background: 'var(--color-primary-bg)',
                            color: C.green, fontSize: '11px', fontWeight: 800, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `1.5px solid ${C.greenBright}`,
                          }}
                        >
                          {i + 1}
                        </span>
                        <span style={{ lineHeight: '1.5' }}>{t}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Prevention */}
                {result.prevention && result.prevention.length > 0 && (
                  <div style={{ padding: '16px 20px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                      Prevention
                    </p>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {result.prevention.map((p, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: C.text }}>
                          <span style={{ color: C.greenMed, flexShrink: 0, marginTop: '1px', display: 'flex' }}><Check size={12} /></span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Common diseases reference (Offline Field Guide) ── */}
      <div style={{ background: C.cardBg, borderRadius: '16px', boxShadow: C.shadow, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ fontSize: '14px', fontWeight: 700, color: C.text, margin: 0 }}>Uganda Crop Disease Field Guide</p>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: 'var(--color-primary-bg)', color: C.greenMed }}>
                Offline Ready
              </span>
            </div>
            <p style={{ fontSize: '12px', color: C.muted, marginTop: '2px', margin: 0 }}>
              Available without internet · Click any disease to view symptoms, organic remedies, and chemical treatments
            </p>
          </div>
        </div>

        {/* Selected Field Guide Details Drawer */}
        {selectedGuide && (
          <div
            style={{
              padding: '16px 20px',
              background: selectedGuide.bg,
              borderBottom: `1px solid ${selectedGuide.color}33`,
              position: 'relative',
            }}
          >
            <button
              onClick={() => setSelectedGuide(null)}
              style={{
                position: 'absolute', top: 14, right: 14,
                background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '50%',
                width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: C.text,
              }}
            >
              <X size={14} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ color: selectedGuide.color }}><Leaf size={20} /></span>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: selectedGuide.color, margin: 0 }}>
                {selectedGuide.name} ({selectedGuide.crop})
              </h3>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#FFFFFF', color: selectedGuide.color, border: `1px solid ${selectedGuide.color}44` }}>
                {selectedGuide.severity.toUpperCase()} SEVERITY
              </span>
            </div>

            <p style={{ fontSize: 12, fontWeight: 600, color: selectedGuide.color, marginBottom: 12 }}>
              ⚠ {selectedGuide.urgency}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              {/* Symptoms */}
              <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 10, border: `1px solid ${selectedGuide.color}22` }}>
                <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: C.muted, margin: '0 0 6px', letterSpacing: '0.05em' }}>
                  Field Symptoms
                </p>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: C.text, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {selectedGuide.symptoms.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              {/* Treatments */}
              <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 10, border: `1px solid ${selectedGuide.color}22` }}>
                <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: C.muted, margin: '0 0 6px', letterSpacing: '0.05em' }}>
                  Recommended Treatments
                </p>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: C.text, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {selectedGuide.treatment.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>

              {/* Prevention */}
              <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 10, border: `1px solid ${selectedGuide.color}22` }}>
                <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: C.muted, margin: '0 0 6px', letterSpacing: '0.05em' }}>
                  Agronomic Prevention
                </p>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: C.text, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {selectedGuide.prevention.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  const matchCrop = CROPS.find(c => c.label.toLowerCase() === selectedGuide.crop.toLowerCase());
                  if (matchCrop) setCrop(matchCrop.value);
                  inputRef.current?.click();
                }}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: selectedGuide.color, color: '#FFFFFF',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <Camera size={14} /> Upload photo of this crop
              </button>
            </div>
          </div>
        )}

        {/* Disease cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', padding: '16px 20px' }}>
          {COMMON_DISEASES.map((d) => (
            <div
              key={d.name}
              style={{
                padding: '14px', borderRadius: '12px', background: d.bg,
                border: selectedGuide?.name === d.name ? `2px solid ${d.color}` : `1px solid ${d.color}22`,
                cursor: 'pointer',
                transition: 'transform 0.1s ease',
              }}
              onClick={() => {
                setSelectedGuide(selectedGuide?.name === d.name ? null : d);
              }}
            >
              <span style={{ display: 'flex', marginBottom: '8px', color: d.color }}><Leaf size={24} /></span>
              <p style={{ fontSize: '13px', fontWeight: 700, color: d.color, lineHeight: '1.3', marginBottom: '3px' }}>{d.name}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '11px', color: C.muted, margin: 0 }}>{d.crop}</p>
                <span style={{ fontSize: '10px', color: d.color, fontWeight: 700 }}>Read guide →</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Past Diagnoses saved in IndexedDB ── */}
      {history.length > 0 && (
        <div style={{ background: C.cardBg, borderRadius: '16px', boxShadow: C.shadow, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <History size={16} style={{ color: C.green }} />
              <p style={{ fontSize: '14px', fontWeight: 700, color: C.text, margin: 0 }}>
                Saved Diagnoses on this Device ({history.length})
              </p>
            </div>
            <span style={{ fontSize: '11px', color: C.muted }}>Stored offline in phone storage</span>
          </div>
          <div className="divide-y" style={{ borderColor: C.border }}>
            {history.slice(0, 5).map((scan) => (
              <div
                key={scan.id}
                onClick={() => {
                  setResult({
                    diseaseName: scan.diseaseName,
                    confidence: scan.confidence,
                    severity: scan.severity,
                    affectedPart: scan.affectedPart,
                    symptoms: scan.symptoms,
                    treatment: scan.treatment,
                    prevention: scan.prevention,
                    urgency: scan.urgency || '',
                    cropType: scan.cropType,
                  });
                  if (scan.imageUrl) setPreview(scan.imageUrl);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{
                  padding: '12px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  background: 'transparent',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontSize: '13.5px', fontWeight: 700, color: C.text, margin: 0 }}>
                      {scan.diseaseName}
                    </p>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: SEVERITY_CFG[scan.severity]?.bg,
                        color: SEVERITY_CFG[scan.severity]?.color,
                      }}
                    >
                      {scan.severity.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ fontSize: '11.5px', color: C.muted, margin: '2px 0 0' }}>
                    {scan.cropType} · {scan.affectedPart} · {new Date(scan.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span style={{ fontSize: '11px', color: C.greenMed, fontWeight: 700 }}>
                  View Diagnosis →
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tips banner ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
          borderRadius: '16px', padding: '20px 24px',
          display: 'flex', gap: '16px', alignItems: 'flex-start',
        }}
      >
        <span style={{ display: 'flex', flexShrink: 0, color: 'rgba(255,255,255,0.7)' }}><Camera size={28} /></span>
        <div>
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
            How to get the best diagnosis
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px' }}>
            {[
              'Photograph in natural daylight',
              'Focus on the most affected area',
              'Include both healthy and sick parts',
              'Avoid shadows across the leaf',
              'Clean lens before shooting',
              'Take multiple angles if unsure',
            ].map((tip) => (
              <p key={tip} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                <Check size={12} style={{ flexShrink: 0, marginTop: 1 }} />{tip}
              </p>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .md\\:grid-cols-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
