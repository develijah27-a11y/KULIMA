import { redirect } from 'next/navigation';
import { getAuthSession, getSupabase } from '@/lib/supabase/auth-cache';
import { fetchWeatherForDistrict } from '@/lib/weather-server';
import { DISTRICT_NAMES } from '@/lib/districts';
import { getCurrentSeasonSummary, generatePlantingAlerts } from '@/lib/planting-calendar';
import { WeatherDistrictSelector } from './WeatherDistrictSelector';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)', greenBright: 'var(--color-primary-muted)',
  amber: 'var(--color-harvest)', red: 'var(--color-danger)', blue: 'var(--color-sky)',
  cardBg: 'var(--d-card)', pageBg: 'var(--d-page)',
  cardShadow: 'var(--d-shadow-card)',
};

const WEATHER_ICON: Record<string, string> = {
  '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '⛅',
  '03d': '☁️', '03n': '☁️', '04d': '☁️', '04n': '☁️',
  '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌦️',
  '11d': '⛈️', '11n': '⛈️', '13d': '❄️', '50d': '🌫️',
};

const PHASE_COLOR: Record<string, { bg: string; color: string; label: string }> = {
  planting: { bg: '#D1FAE5', color: '#059669', label: 'Planting Season' },
  growing:  { bg: 'var(--color-sky-bg)', color: 'var(--color-info)', label: 'Growing Season' },
  harvest:  { bg: '#FEF3C7', color: '#D97706', label: 'Harvest Season' },
  dry:      { bg: '#F3F4F6', color: '#6B7280', label: 'Dry Season' },
};

const URGENCY_COLOR: Record<string, { bg: string; color: string }> = {
  high:   { bg: '#FEE2E2', color: 'var(--color-danger)' },
  medium: { bg: '#FEF3C7', color: '#D97706' },
  low:    { bg: '#F0FDF4', color: '#059669' },
};

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.cardBg, borderRadius: '12px', boxShadow: C.cardShadow, ...style }}>
      {children}
    </div>
  );
}

export default async function WeatherPage({
  searchParams,
}: {
  searchParams: any;
}) {
  const session = await getAuthSession();
  if (!session?.user) redirect('/auth/signin');

  const params = await searchParams;
  const district = (params?.district as string) || 'Kampala';

  const supabase = await getSupabase();
  const [weather, profileRes] = await Promise.all([
    fetchWeatherForDistrict(district),
    supabase.from('profiles').select('primary_crop').eq('user_id', session.user.id).single(),
  ]);

  const primaryCrop = profileRes.data?.primary_crop ?? '';
  const farmerCrops = primaryCrop ? [primaryCrop] : [];
  const now = new Date();
  const seasonSummary = getCurrentSeasonSummary(now.getMonth());
  const plantingAlerts = generatePlantingAlerts(now.getMonth(), now.getDate(), farmerCrops);
  const phaseStyle = PHASE_COLOR[seasonSummary.phase];

  return (
    <div style={{ background: C.pageBg, minHeight: '100vh', paddingBottom: '24px' }}>
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Header row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: '2px' }}>
              Weather & Forecast
            </h1>
            <p style={{ fontSize: '13px', color: C.muted }}>
              Live conditions for {district} · {weather.source === 'fallback' ? 'Estimated' : 'Live data'}
            </p>
          </div>
          <WeatherDistrictSelector current={district} districts={DISTRICT_NAMES.sort()} />
        </div>

        {/* Current conditions */}
        <Card>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x" style={{ borderColor: C.border }}>
            {/* Main temp */}
            <div className="p-5 col-span-2 md:col-span-1">
              <p style={{ fontSize: '11px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                Current Conditions
              </p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '52px', fontWeight: 900, color: C.text, letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {weather.now.temp}°
                </span>
                <span style={{ fontSize: '36px', marginBottom: '4px' }}>
                  {WEATHER_ICON[weather.now.icon] ?? '🌤️'}
                </span>
              </div>
              <p style={{ fontSize: '14px', color: C.muted, textTransform: 'capitalize', marginBottom: '4px' }}>
                {weather.now.description}
              </p>
              <p style={{ fontSize: '12px', color: C.muted }}>
                Feels like {weather.now.feelsLike}°C
              </p>
            </div>

            {/* Humidity */}
            <div className="p-5">
              <p style={{ fontSize: '11px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Humidity</p>
              <p style={{ fontSize: '32px', marginBottom: '4px' }}>💧</p>
              <p style={{ fontSize: '24px', fontWeight: 800, color: C.text }}>{weather.now.humidity}%</p>
              <p style={{ fontSize: '12px', color: C.muted, marginTop: '4px' }}>
                {weather.now.humidity > 80 ? 'High — disease risk' : weather.now.humidity > 60 ? 'Moderate' : 'Low — irrigation needed'}
              </p>
            </div>

            {/* Wind */}
            <div className="p-5">
              <p style={{ fontSize: '11px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Wind</p>
              <p style={{ fontSize: '32px', marginBottom: '4px' }}>💨</p>
              <p style={{ fontSize: '24px', fontWeight: 800, color: C.text }}>{weather.now.wind} m/s</p>
              <p style={{ fontSize: '12px', color: C.muted, marginTop: '4px' }}>
                {weather.now.wind > 8 ? 'Strong — delay spraying' : weather.now.wind > 4 ? 'Moderate' : 'Calm — good for spraying'}
              </p>
            </div>

            {/* Precipitation */}
            <div className="p-5">
              <p style={{ fontSize: '11px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Precipitation</p>
              <p style={{ fontSize: '32px', marginBottom: '4px' }}>🌧️</p>
              <p style={{ fontSize: '24px', fontWeight: 800, color: C.text }}>{weather.now.precipitation.toFixed(1)} mm</p>
              <p style={{ fontSize: '12px', color: C.muted, marginTop: '4px' }}>
                {weather.now.precipitation > 10 ? 'Heavy rain' : weather.now.precipitation > 2 ? 'Light rain' : 'No significant rain'}
              </p>
            </div>
          </div>
        </Card>

        {/* Season summary + top alerts */}
        <div className="grid md:grid-cols-2 gap-5">
          {/* Season card */}
          <Card>
            <div className="p-5">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Current Season</p>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: phaseStyle.bg, color: phaseStyle.color }}>
                  {phaseStyle.label}
                </span>
              </div>
              <p style={{ fontSize: '18px', fontWeight: 800, color: C.text, marginBottom: '6px' }}>{seasonSummary.name}</p>
              <p style={{ fontSize: '13px', color: C.muted, lineHeight: '1.5', marginBottom: '12px' }}>{seasonSummary.action}</p>
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '12px' }}>
                <p style={{ fontSize: '12px', color: C.muted, marginBottom: '6px' }}>
                  <strong style={{ color: C.text }}>Recommended crops:</strong> {seasonSummary.crops.join(', ')}
                </p>
                <p style={{ fontSize: '12px', color: C.greenMed, fontWeight: 600 }}>
                  {seasonSummary.daysToNextSeason > 0
                    ? `${seasonSummary.daysToNextSeason} days to ${seasonSummary.nextSeason}`
                    : `${seasonSummary.nextSeason} starts now`}
                </p>
              </div>
            </div>
          </Card>

          {/* Planting alerts */}
          <Card>
            <div className="p-5">
              <p style={{ fontSize: '11px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                Planting Alerts
              </p>
              {plantingAlerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <p style={{ fontSize: '28px', marginBottom: '8px' }}>📅</p>
                  <p style={{ fontSize: '13px', color: C.muted }}>No urgent alerts</p>
                  <p style={{ fontSize: '12px', color: C.muted, marginTop: '4px' }}>Add crops to your profile for personalized alerts</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {plantingAlerts.slice(0, 3).map((alert, i) => {
                    const urg = URGENCY_COLOR[alert.urgency];
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px', borderRadius: '10px', background: urg.bg }}>
                        <span style={{ fontSize: '20px', flexShrink: 0 }}>{alert.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: 700, color: C.text, marginBottom: '2px' }}>{alert.title}</p>
                          <p style={{ fontSize: '11px', color: C.muted, lineHeight: '1.4' }}>{alert.message}</p>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: urg.color, flexShrink: 0 }}>
                          {alert.urgency.toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                  {plantingAlerts.length > 3 && (
                    <a href="/farmer/planting" style={{ fontSize: '12px', fontWeight: 600, color: C.greenMed, textDecoration: 'none', textAlign: 'center', paddingTop: '4px' }}>
                      +{plantingAlerts.length - 3} more alerts →
                    </a>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* 14-day forecast */}
        <Card>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>14-Day Forecast</p>
            <p style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>Daily high/low, precipitation and farming conditions</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: '600px' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 48px 72px 72px 1fr 180px', gap: '0', padding: '8px 20px', borderBottom: `1px solid ${C.border}` }}>
                {['Date', '', 'High/Low', 'Rain mm', 'Chance', 'Farming Note'].map((h, i) => (
                  <p key={i} style={{ fontSize: '11px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</p>
                ))}
              </div>
              {weather.daily.map((day, i) => {
                const probPct = day.precipProbability;
                const barColor = probPct >= 70 ? C.blue : probPct >= 40 ? '#60A5FA' : '#BBF7D0';
                const rowBg = day.precipMm > 10 ? '#EFF6FF' : day.farmingNote.includes('⚠️') ? '#FEF2F2' : 'transparent';
                return (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 48px 72px 72px 1fr 180px',
                      gap: '0',
                      padding: '10px 20px',
                      borderBottom: i < weather.daily.length - 1 ? `1px solid ${C.border}` : 'none',
                      background: rowBg,
                      alignItems: 'center',
                    }}
                  >
                    <p style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{day.dayLabel}</p>
                    <p style={{ fontSize: '22px' }}>{WEATHER_ICON[day.icon] ?? '🌤️'}</p>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{day.high}°</span>
                      <span style={{ fontSize: '12px', color: C.muted }}> / {day.low}°</span>
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: probPct > 40 ? 700 : 400, color: probPct > 40 ? C.blue : C.muted }}>
                      {day.precipMm > 0 ? `${day.precipMm}` : '—'}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, background: '#F3F4F6', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                        <div style={{ width: `${probPct}%`, height: '100%', background: barColor, borderRadius: '4px' }} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: C.muted, width: '34px', textAlign: 'right' }}>{probPct}%</span>
                    </div>
                    <p style={{ fontSize: '12px', color: C.muted }}>{day.farmingNote}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Seasonal advisory */}
        <Card>
          <div
            style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
              borderRadius: '12px',
            }}
          >
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              Uganda Seasonal Rainfall Outlook
            </p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
              Bi-Modal Rainfall Pattern
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', marginBottom: '16px' }}>
              Uganda has two main rainy seasons. Season A (March–May) brings long rains ideal for maize and beans.
              Season B (September–November) brings shorter rains suited for beans, sweet potato and tomatoes.
              Northern Uganda has a single rainy season (April–October).
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { season: 'Season A · Long Rains', months: 'Mar – May', crops: 'Maize, Beans, Groundnuts', icon: '🌱' },
                { season: 'Season B · Short Rains', months: 'Sep – Nov', crops: 'Beans, Sweet Potato, Tomato', icon: '🫘' },
              ].map((s) => (
                <div key={s.season} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px' }}>
                  <p style={{ fontSize: '20px', marginBottom: '6px' }}>{s.icon}</p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', marginBottom: '2px' }}>{s.season}</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-primary-muted)', marginBottom: '4px' }}>{s.months}</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{s.crops}</p>
                </div>
              ))}
            </div>
            <a
              href="/farmer/planting"
              style={{
                display: 'inline-block', marginTop: '16px', padding: '8px 16px',
                background: 'var(--color-primary-muted)', color: 'var(--color-primary)', borderRadius: '8px',
                fontSize: '13px', fontWeight: 700, textDecoration: 'none',
              }}
            >
              View Full Planting Calendar →
            </a>
          </div>
        </Card>

      </div>
    </div>
  );
}
