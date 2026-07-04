import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Leaf, AlertTriangle, ClipboardList } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', red: 'var(--color-danger)', amber: 'var(--color-harvest)',
};

const ALL_ALERTS = [
  { crop: 'Maize',   disease: 'Fall Armyworm (FAW)',           risk: 'high',   months: [2,3,4,8,9,10],              districts: 'Northern, Eastern Uganda',    action: 'Spray emamectin benzoate within 24h of detection. Scout weekly during peak periods.' },
  { crop: 'Maize',   disease: 'Maize Lethal Necrosis (MLN)',   risk: 'high',   months: [0,1,2,3,4,5],               districts: 'All maize-growing regions',   action: 'No cure — rogue and destroy infected plants immediately. Use certified virus-free seed.' },
  { crop: 'Maize',   disease: 'Gray Leaf Spot',                risk: 'medium', months: [3,4,5,9,10,11],             districts: 'High-altitude areas',         action: 'Apply fungicide (Mancozeb) at first sign. Improve air circulation between rows.' },
  { crop: 'Coffee',  disease: 'Coffee Berry Disease (CBD)',     risk: 'high',   months: [3,4,5,9,10,11],             districts: 'Mt. Elgon, Rwenzori',         action: 'Spray copper-based fungicide at berry formation. Harvest ripe berries promptly.' },
  { crop: 'Coffee',  disease: 'Coffee Leaf Rust',              risk: 'medium', months: [0,1,2,9,10,11],             districts: 'All coffee growing areas',    action: 'Apply Copper Oxychloride. Remove and burn heavily infected leaves.' },
  { crop: 'Cassava', disease: 'Cassava Brown Streak (CBSD)',   risk: 'medium', months: [0,1,2,9,10,11],             districts: 'Western, Central Uganda',     action: 'Use certified clean planting material. Control whitefly vectors with appropriate insecticides.' },
  { crop: 'Cassava', disease: 'Cassava Mosaic Disease (CMD)',  risk: 'high',   months: Array.from({length:12},(_,i)=>i), districts: 'All cassava regions',     action: 'Plant CMD-resistant varieties (NASE 14, NASE 19). Remove and destroy infected plants.' },
  { crop: 'Banana',  disease: 'Banana Xanthomonas Wilt (BXW)',risk: 'high',   months: Array.from({length:12},(_,i)=>i), districts: 'Central, Western Uganda', action: 'Destroy infected mats immediately. Disinfect all tools with 10% bleach. Use clean planting material.' },
  { crop: 'Banana',  disease: 'Fusarium Wilt (Panama Disease)',risk: 'high',   months: Array.from({length:12},(_,i)=>i), districts: 'East, Central Uganda',    action: 'No chemical cure. Remove infected plants. Plant Fusarium-resistant varieties.' },
  { crop: 'Tomato',  disease: 'Late Blight',                   risk: 'medium', months: [3,4,9,10],                   districts: 'Kabale, Kisoro highlands',    action: 'Spray Mancozeb or Metalaxyl preventively in wet season. Avoid overhead irrigation.' },
  { crop: 'Tomato',  disease: 'Bacterial Wilt',                risk: 'medium', months: [2,3,4,8,9,10],              districts: 'Lowland areas',               action: 'Use resistant varieties. Rotate with non-solanaceous crops for 2+ seasons.' },
  { crop: 'Beans',   disease: 'Bean Common Mosaic Virus',      risk: 'medium', months: Array.from({length:12},(_,i)=>i), districts: 'All bean-growing areas',  action: 'Plant virus-free certified seed. Control aphid vectors with selective insecticides.' },
];

const RISK: Record<string, { color: string; bg: string; border: string }> = {
  high:   { color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)',  border: 'var(--color-danger)'  },
  medium: { color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)', border: 'var(--color-harvest)' },
  low:    { color: 'var(--color-success)', bg: 'var(--color-success-bg)', border: 'var(--color-success)' },
};

export default async function DiseaseAlertsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const currentMonth = new Date().getMonth();
  const activeNow = ALL_ALERTS.filter(a => a.months.includes(currentMonth));
  const otherAlerts = ALL_ALERTS.filter(a => !a.months.includes(currentMonth));

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Disease Alert Library</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Uganda crop disease calendar — active threats and treatment protocols</p>
      </div>

      <div style={{ padding: '14px 18px', background: 'var(--color-danger-bg)', borderRadius: 12, border: '1px solid var(--color-danger)' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: C.red, margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} />{activeNow.length} disease{activeNow.length !== 1 ? 's' : ''} active this month</p>
        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Based on Uganda seasonal disease calendar for {new Date().toLocaleString('en-UG', { month: 'long' })}</p>
      </div>

      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Active This Month</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeNow.map(a => {
            const cfg = RISK[a.risk];
            return (
              <div key={`${a.crop}-${a.disease}`} style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '16px 20px', borderLeft: `4px solid ${cfg.border}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: cfg.color }}>
                    <Leaf size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }}>{a.disease}</p>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: cfg.bg, color: cfg.color, textTransform: 'uppercase' }}>{a.risk}</span>
                    </div>
                    <p style={{ fontSize: 12, color: C.muted, margin: '0 0 8px' }}>{a.crop} · {a.districts}</p>
                    <p style={{ fontSize: 12, fontWeight: 600, color: cfg.color, margin: 0, lineHeight: 1.5 }}>→ {a.action}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {otherAlerts.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Other Seasonal Diseases</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {otherAlerts.map(a => {
              const cfg = RISK[a.risk];
              return (
                <div key={`${a.crop}-${a.disease}`} style={{ background: C.cardBg, borderRadius: 12, boxShadow: C.cardShadow, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, opacity: 0.7 }}>
                  <span style={{ display: 'flex', color: cfg.color }}><Leaf size={18} /></span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{a.disease}</p>
                    <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{a.crop} · not in season now</p>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: cfg.bg, color: cfg.color, textTransform: 'uppercase' }}>{a.risk}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
