import { redirect } from 'next/navigation';
import { getAuthSession, getSupabase } from '@/lib/supabase/auth-cache';
import {
  PLANTING_CALENDAR,
  generatePlantingAlerts,
  getCurrentSeasonSummary,
  type PlantingWindow,
} from '@/lib/planting-calendar';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)', greenBright: 'var(--color-primary-muted)',
  amber: 'var(--color-accent)', red: 'var(--color-danger)', blue: 'var(--color-info)',
  cardBg: 'var(--d-card)', pageBg: 'var(--d-page)',
  cardShadow: 'var(--d-shadow-card)',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const URGENCY_CFG: Record<string, { bg: string; color: string; border: string }> = {
  high:   { bg: '#FEF2F2', color: 'var(--color-danger)', border: '#FECACA' },
  medium: { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  low:    { bg: '#F0FDF4', color: '#059669', border: '#BBF7D0' },
};

const ALERT_TYPE_ICON: Record<string, string> = {
  plant_now: '🌱', plant_soon: '⏰', harvest_now: '🌾', harvest_soon: '⏳', prepare: '🔧',
};

const PHASE_CFG: Record<string, { bg: string; color: string; icon: string }> = {
  planting: { bg: '#D1FAE5', color: '#059669', icon: '🌱' },
  growing:  { bg: '#DBEAFE', color: 'var(--color-info)', icon: '🌿' },
  harvest:  { bg: '#FEF3C7', color: '#D97706', icon: '🌾' },
  dry:      { bg: '#F3F4F6', color: '#6B7280', icon: '☀️' },
};

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.cardBg, borderRadius: '12px', boxShadow: C.cardShadow, ...style }}>
      {children}
    </div>
  );
}

function MonthBar({ cal, currentMonth }: { cal: PlantingWindow; currentMonth: number }) {
  const cells = MONTHS.map((_, m) => {
    let type: 'plant-a' | 'harvest-a' | 'plant-b' | 'harvest-b' | 'empty' = 'empty';

    const inRange = (start: number, end: number) => {
      if (start <= end) return m >= start && m <= end;
      return m >= start || m <= end;
    };

    if (cal.seasonA) {
      if (inRange(cal.seasonA.plantStart, cal.seasonA.plantEnd)) type = 'plant-a';
      else if (inRange(cal.seasonA.harvestStart, cal.seasonA.harvestEnd)) type = 'harvest-a';
    }
    if (cal.seasonB) {
      if (inRange(cal.seasonB.plantStart, cal.seasonB.plantEnd)) type = 'plant-b';
      else if (inRange(cal.seasonB.harvestStart, cal.seasonB.harvestEnd)) type = 'harvest-b';
    }

    const colors: Record<string, { bg: string; border: string }> = {
      'plant-a':   { bg: '#D1FAE5', border: '#34D399' },
      'harvest-a': { bg: '#FEF3C7', border: '#FCD34D' },
      'plant-b':   { bg: '#DBEAFE', border: '#93C5FD' },
      'harvest-b': { bg: '#FDE8D8', border: '#FDBA74' },
      'empty':     { bg: '#F9FAFB', border: 'var(--d-border)' },
    };

    const cfg = colors[type];
    const isCurrent = m === currentMonth;

    return (
      <div
        key={m}
        title={`${MONTHS[m]}: ${type.replace(/-/g, ' ')}`}
        style={{
          flex: 1,
          height: '28px',
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          borderRadius: isCurrent ? '6px' : '4px',
          outline: isCurrent ? `2px solid ${C.green}` : 'none',
          outlineOffset: '1px',
          position: 'relative',
        }}
      />
    );
  });

  return (
    <div style={{ display: 'flex', gap: '2px', flex: 1 }}>
      {cells}
    </div>
  );
}

export default async function PlantingPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect('/auth/signin');

  const supabase = await getSupabase();
  const [profileRes, farmsRes] = await Promise.all([
    supabase.from('profiles').select('primary_crop, full_name').eq('user_id', session.user.id).single(),
    (supabase.from as any)('farms').select('crop_types').eq('user_id', session.user.id).eq('is_active', true),
  ]);

  const primaryCrop = profileRes.data?.primary_crop ?? '';
  const farmCrops: string[] = (farmsRes.data ?? []).flatMap((f: any) => f.crop_types ?? []);
  if (primaryCrop) farmCrops.push(primaryCrop);
  const farmerCrops = [...new Set(farmCrops)];

  const now = new Date();
  const currentMonth = now.getMonth();
  const alerts = generatePlantingAlerts(currentMonth, now.getDate(), farmerCrops);
  const season = getCurrentSeasonSummary(currentMonth);
  const phaseCfg = PHASE_CFG[season.phase];

  // Separate farmer's crops from others
  const myCrops = PLANTING_CALENDAR.filter((c) => farmerCrops.includes(c.crop));
  const otherCrops = PLANTING_CALENDAR.filter((c) => !farmerCrops.includes(c.crop));

  return (
    <div style={{ background: C.pageBg, minHeight: '100vh', paddingBottom: '32px' }}>
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: '4px' }}>
            Planting Calendar
          </h1>
          <p style={{ fontSize: '13px', color: C.muted }}>
            Seasonal planting guide for Uganda · {MONTHS[currentMonth]} {now.getFullYear()}
          </p>
        </div>

        {/* Season summary hero */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
            borderRadius: '16px',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{ fontSize: '28px' }}>{phaseCfg.icon}</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {phaseCfg.bg && 'Current Season'}
                </span>
              </div>
              <p style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>{season.name}</p>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', lineHeight: '1.5', maxWidth: '480px' }}>
                {season.action}
              </p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', minWidth: '180px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                Next Season
              </p>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>{season.nextSeason}</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                in {season.daysToNextSeason} days
              </p>
            </div>
          </div>

          {/* Recommended crops */}
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>
              Recommended crops this season:
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {season.crops.map((crop) => (
                <span
                  key={crop}
                  style={{
                    fontSize: '12px', fontWeight: 600, padding: '4px 12px',
                    background: 'rgba(82,183,136,0.25)', color: '#A7F3D0',
                    borderRadius: '20px',
                  }}
                >
                  {crop}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Planting alerts */}
        {alerts.length > 0 && (
          <Card>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
              <p style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>Your Crop Alerts</p>
              <p style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>
                {farmerCrops.length > 0
                  ? `Based on your crops: ${farmerCrops.join(', ')}`
                  : 'Showing general alerts — add crops to your profile for personalized alerts'}
              </p>
            </div>
            <div className="divide-y" style={{ borderColor: C.border }}>
              {alerts.map((alert, i) => {
                const cfg = URGENCY_CFG[alert.urgency];
                const typeIcon = ALERT_TYPE_ICON[alert.type] ?? '📋';
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '14px',
                      padding: '14px 20px',
                      background: alert.urgency === 'high' ? '#FFFAF0' : 'transparent',
                    }}
                  >
                    <div
                      style={{
                        width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                        background: cfg.bg, border: `1px solid ${cfg.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '20px',
                      }}
                    >
                      {alert.emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{alert.title}</p>
                        <span
                          style={{
                            fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                            background: cfg.bg, color: cfg.color,
                          }}
                        >
                          {alert.urgency.toUpperCase()}
                        </span>
                        <span
                          style={{
                            fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px',
                            background: '#F3F4F6', color: C.muted,
                          }}
                        >
                          {typeIcon} {alert.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: C.muted, lineHeight: '1.5' }}>{alert.message}</p>
                      <p style={{ fontSize: '12px', color: C.muted, marginTop: '4px' }}>
                        Season {alert.season}
                        {alert.daysUntil > 0 ? ` · Starts in ${alert.daysUntil} days` : ' · Action required now'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Calendar legend */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { color: '#D1FAE5', border: '#34D399', label: 'Plant (Season A)' },
            { color: '#FEF3C7', border: '#FCD34D', label: 'Harvest (Season A)' },
            { color: '#DBEAFE', border: '#93C5FD', label: 'Plant (Season B)' },
            { color: '#FDE8D8', border: '#FDBA74', label: 'Harvest (Season B)' },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: item.color, border: `1.5px solid ${item.border}` }} />
              <span style={{ fontSize: '12px', color: C.muted }}>{item.label}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#F9FAFB', border: `2px solid ${C.green}` }} />
            <span style={{ fontSize: '12px', color: C.muted }}>Current month</span>
          </div>
        </div>

        {/* Month header row */}
        <Card>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>
              {farmerCrops.length > 0 ? 'Your Crops' : 'All Crops'} — Planting Calendar
            </p>
          </div>

          {/* Month labels */}
          <div style={{ padding: '8px 20px 4px', display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '160px', flexShrink: 0 }} />
            <div style={{ display: 'flex', gap: '2px', flex: 1 }}>
              {MONTHS.map((m, i) => (
                <div
                  key={m}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: '10px',
                    fontWeight: i === currentMonth ? 800 : 600,
                    color: i === currentMonth ? C.green : C.muted,
                  }}
                >
                  {m}
                </div>
              ))}
            </div>
          </div>

          {/* Crop rows */}
          <div className="divide-y" style={{ borderColor: C.border }}>
            {(myCrops.length > 0 ? myCrops : PLANTING_CALENDAR).map((cal) => {
              const isMyCrop = farmerCrops.includes(cal.crop);
              return (
                <div
                  key={cal.crop}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 20px',
                    background: isMyCrop ? '#F0FDF4' : 'transparent',
                  }}
                >
                  <div style={{ width: '160px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>{cal.emoji}</span>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: C.text, textTransform: 'capitalize' }}>
                        {cal.crop.replace(/_/g, ' ')}
                      </p>
                      {isMyCrop && (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#059669' }}>YOUR CROP</span>
                      )}
                    </div>
                  </div>
                  <MonthBar cal={cal} currentMonth={currentMonth} />
                </div>
              );
            })}
          </div>

          {/* Other crops */}
          {myCrops.length > 0 && otherCrops.length > 0 && (
            <>
              <div className="px-5 py-3" style={{ borderTop: `1px solid ${C.border}`, background: '#FAFAFA' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Other Crops
                </p>
              </div>

              {/* Month labels again */}
              <div style={{ padding: '8px 20px 4px', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '160px', flexShrink: 0 }} />
                <div style={{ display: 'flex', gap: '2px', flex: 1 }}>
                  {MONTHS.map((m, i) => (
                    <div
                      key={m}
                      style={{
                        flex: 1, textAlign: 'center', fontSize: '10px',
                        fontWeight: i === currentMonth ? 800 : 600,
                        color: i === currentMonth ? C.green : C.muted,
                      }}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </div>

              <div className="divide-y" style={{ borderColor: C.border }}>
                {otherCrops.map((cal) => (
                  <div
                    key={cal.crop}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px' }}
                  >
                    <div style={{ width: '160px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>{cal.emoji}</span>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: C.text, textTransform: 'capitalize' }}>
                        {cal.crop.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <MonthBar cal={cal} currentMonth={currentMonth} />
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Crop details / notes */}
        <Card>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>Crop Growing Notes</p>
          </div>
          <div className="grid md:grid-cols-2" style={{ gap: 0 }}>
            {PLANTING_CALENDAR.map((cal, i) => {
              const isMyCrop = farmerCrops.includes(cal.crop);
              const isLast = i === PLANTING_CALENDAR.length - 1;
              return (
                <div
                  key={cal.crop}
                  style={{
                    padding: '14px 20px',
                    borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
                    borderRight: i % 2 === 0 ? `1px solid ${C.border}` : 'none',
                    background: isMyCrop ? '#F0FDF4' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '18px' }}>{cal.emoji}</span>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: C.text, textTransform: 'capitalize' }}>
                      {cal.crop.replace(/_/g, ' ')}
                    </p>
                    {isMyCrop && (
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#059669', background: '#D1FAE5', padding: '2px 6px', borderRadius: '10px' }}>
                        YOURS
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: C.muted, marginLeft: 'auto' }}>{cal.durationDays}d</span>
                  </div>
                  <p style={{ fontSize: '12px', color: C.muted, lineHeight: '1.5' }}>{cal.notes}</p>
                  {cal.zone && cal.zone !== 'all' && (
                    <p style={{ fontSize: '11px', fontWeight: 600, color: C.blue, marginTop: '4px' }}>
                      Best zone: {cal.zone}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Add crops CTA */}
        {farmerCrops.length === 0 && (
          <div
            style={{
              background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: '12px',
              padding: '20px', display: 'flex', alignItems: 'center', gap: '16px',
            }}
          >
            <span style={{ fontSize: '32px' }}>🌾</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '4px' }}>
                Add your crops for personalized alerts
              </p>
              <p style={{ fontSize: '13px', color: C.muted }}>
                Set your primary crop in your profile or register a farm to get tailored planting reminders.
              </p>
            </div>
            <a
              href="/farmer/profile"
              style={{
                padding: '8px 16px', background: C.green, color: '#FFFFFF',
                borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                textDecoration: 'none', whiteSpace: 'nowrap',
              }}
            >
              Update Profile
            </a>
          </div>
        )}

      </div>
    </div>
  );
}
