import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
  amber: 'var(--color-harvest)',
};

const UG_SEASONS = [
  { name: 'Season A', months: 'Mar – Jun', desc: 'Long rains. Primary planting for maize, beans, groundnuts.', current: true },
  { name: 'Season B', months: 'Aug – Nov', desc: 'Short rains. Second crop and coffee main harvest.', current: false },
  { name: 'Dry Season', months: 'Dec – Feb', desc: 'Irrigated crops, coffee fly crop, sweet potato.', current: false },
];

const MILESTONES = [
  { icon: '🌱', title: 'Land Prep', month: 'Feb', done: true },
  { icon: '🫘', title: 'Planting', month: 'Mar', done: true },
  { icon: '💧', title: 'First Topdress', month: 'Apr', done: true },
  { icon: '🌿', title: 'Weeding', month: 'May', done: false },
  { icon: '🧪', title: 'Second Topdress', month: 'Jun', done: false },
  { icon: '🌽', title: 'Harvest', month: 'Jul', done: false },
];

export default async function SeasonPlannerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const currentSeason = UG_SEASONS.find(s => s.current)!;
  const completedMilestones = MILESTONES.filter(m => m.done).length;
  const progress = Math.round((completedMilestones / MILESTONES.length) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Season Planner 📅</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Coordinate your group's planting and harvest calendar</p>
      </div>

      {/* Current Season */}
      <div style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)', borderRadius: 16, padding: '20px', color: '#fff' }}>
        <p style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Current Season</p>
        <p style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px', letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{currentSeason.name} · {currentSeason.months}</p>
        <p style={{ fontSize: 13, opacity: 0.85, margin: '0 0 16px' }}>{currentSeason.desc}</p>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, height: 8, marginBottom: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: '#fff', borderRadius: 8, transition: 'width 0.5s' }} />
        </div>
        <p style={{ fontSize: 12, opacity: 0.8, margin: 0 }}>{completedMilestones}/{MILESTONES.length} milestones · {progress}% through season</p>
      </div>

      {/* Milestones */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Season A Milestones</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MILESTONES.map((m, i) => (
            <div key={m.title} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 12, background: C.cardBg, boxShadow: C.cardShadow, opacity: m.done ? 1 : 0.7 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: m.done ? 'var(--color-success-bg)' : 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                {m.done ? '✅' : m.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{m.title}</p>
                <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{m.month} 2026</p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: m.done ? 'var(--color-success-bg)' : 'var(--d-bg)', color: m.done ? 'var(--color-success)' : C.muted }}>
                {m.done ? 'Done' : 'Upcoming'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Season overview */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '16px 20px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 12px' }}>Uganda Farming Calendar</p>
        {UG_SEASONS.map(s => (
          <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: s.current ? 700 : 500, color: C.text, margin: '0 0 2px' }}>{s.name}</p>
              <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{s.desc}</p>
            </div>
            <p style={{ fontSize: 12, color: s.current ? C.greenMed : C.muted, fontWeight: s.current ? 700 : 400, margin: 0, textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>{s.months}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
