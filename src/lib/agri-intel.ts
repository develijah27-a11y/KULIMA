import type { WeatherData } from './weather';

export type InsightSeverity = 'info' | 'warning' | 'critical' | 'positive';

export interface AgriInsight {
  id: string;
  category: 'weather' | 'market' | 'seasonal' | 'disease' | 'financial';
  severity: InsightSeverity;
  title: string;
  body: string;
  action?: string;
  icon: string;
}

export interface SeasonalPlan {
  season: string;
  phase: string;
  daysLeft: number;
  recommendedCrops: string[];
  currentTask: string;
  nextTask: string;
  urgency: InsightSeverity;
}

// ─── Uganda Seasons ──────────────────────────────────────────────────────────

export function getUgandaSeason(month: number): {
  name: string;
  code: 'A' | 'B' | 'dry1' | 'dry2';
  daysLeft: number;
} {
  // month: 0-indexed
  const ends: Record<string, number[]> = {
    A:    [2, 3, 4],       // Mar–May
    B:    [9, 10],         // Oct–Nov
    dry1: [11, 0, 1],      // Dec–Feb
    dry2: [5, 6, 7, 8],    // Jun–Sep
  };

  const NAMES: Record<string, string> = {
    A: 'Rainy Season (March–May)',
    B: 'Rainy Season (September–November)',
    dry1: 'Dry Season (Dec–Feb)',
    dry2: 'Dry Season (Jun–Sep)',
  };

  let code: 'A' | 'B' | 'dry1' | 'dry2' = 'dry1';
  for (const [k, months] of Object.entries(ends)) {
    if (months.includes(month)) { code = k as typeof code; break; }
  }

  const endMonth = ends[code][ends[code].length - 1];
  const endDay = new Date(new Date().getFullYear(), endMonth + 1, 0);
  const daysLeft = Math.max(0, Math.round((endDay.getTime() - Date.now()) / 86400000));

  return { name: NAMES[code], code, daysLeft };
}

export function buildSeasonalPlan(month: number, primaryCrop?: string): SeasonalPlan {
  const season = getUgandaSeason(month);

  const plans: Record<string, {
    recommendedCrops: string[];
    currentTask: string;
    nextTask: string;
    urgency: InsightSeverity;
  }> = {
    A: {
      recommendedCrops: ['Maize', 'Beans', 'Groundnuts', 'Sunflower', 'Sorghum'],
      currentTask: 'Land prep & planting. Apply basal fertilizer before first rains.',
      nextTask: 'Top-dress with nitrogen at knee height (~3 weeks post-germination).',
      urgency: 'positive',
    },
    B: {
      recommendedCrops: ['Cassava', 'Sweet Potato', 'Sorghum', 'Tomato', 'Cabbage'],
      currentTask: 'Plant short-cycle crops. Mulch to retain soil moisture.',
      nextTask: 'Monitor for late blight. Begin harvesting short-cycle vegetables.',
      urgency: 'info',
    },
    dry1: {
      recommendedCrops: ['Onion', 'Tomato (irrigated)', 'Capsicum', 'Watermelon'],
      currentTask: 'Irrigate if possible. Harvest September–November crops & dry properly.',
      nextTask: 'Prepare land and inputs for the March rains.',
      urgency: 'warning',
    },
    dry2: {
      recommendedCrops: ['Sweet Potato', 'Cassava', 'Watermelon (irrigated)'],
      currentTask: 'Harvest March–May crops. Dry and store maize at <13% moisture.',
      nextTask: 'Prepare nurseries for the September rains (tomato, cabbage).',
      urgency: 'info',
    },
  };

  const plan = plans[season.code];

  return {
    season: season.name,
    phase: season.code,
    daysLeft: season.daysLeft,
    recommendedCrops: plan.recommendedCrops,
    currentTask: plan.currentTask,
    nextTask: plan.nextTask,
    urgency: plan.urgency,
  };
}

// ─── Weather Insights ─────────────────────────────────────────────────────────

export function generateWeatherInsights(weather: WeatherData, month: number): AgriInsight[] {
  const insights: AgriInsight[] = [];
  const season = getUgandaSeason(month);

  if (weather.rainfall > 8) {
    insights.push({
      id: 'heavy-rain',
      category: 'weather',
      severity: 'warning',
      icon: '🌧️',
      title: 'Heavy Rain Alert',
      body: `${weather.rainfall.toFixed(1)} mm expected. Delay fertilizer application — runoff will reduce effectiveness.`,
      action: 'Inspect drainage channels and protect stored grain from moisture.',
    });
  } else if (weather.rainfall > 4 && season.code !== 'dry1' && season.code !== 'dry2') {
    insights.push({
      id: 'good-rain',
      category: 'weather',
      severity: 'positive',
      icon: '🌦️',
      title: 'Good Planting Rains',
      body: `${weather.rainfall.toFixed(1)} mm — ideal soil moisture for germination and top-dressing.`,
      action: 'Window open for planting and fertilizer application.',
    });
  } else if (weather.rainfall < 1.5 && (season.code === 'A' || season.code === 'B')) {
    insights.push({
      id: 'dry-spell',
      category: 'weather',
      severity: 'critical',
      icon: '☀️',
      title: 'Dry Spell During Rain Season',
      body: 'Rainfall below 1.5 mm during planting season — stress risk for seedlings.',
      action: 'Irrigate if possible. Mulch to retain soil moisture.',
    });
  }

  if (weather.humidity > 85) {
    insights.push({
      id: 'high-humidity',
      category: 'weather',
      severity: 'warning',
      icon: '💧',
      title: 'High Humidity Risk',
      body: `Humidity at ${weather.humidity}%. Fungal disease conditions — blight and mildew risk elevated.`,
      action: 'Apply preventive fungicide on beans and tomatoes.',
    });
  }

  if (weather.windSpeed > 7) {
    insights.push({
      id: 'strong-wind',
      category: 'weather',
      severity: 'info',
      icon: '💨',
      title: 'Strong Winds',
      body: `Wind at ${weather.windSpeed.toFixed(1)} m/s. Maize lodging risk for tall varieties.`,
      action: 'Stake tall crops and avoid spraying today.',
    });
  }

  if (weather.temp > 32) {
    insights.push({
      id: 'heat-stress',
      category: 'weather',
      severity: 'warning',
      icon: '🌡️',
      title: 'Heat Stress Risk',
      body: `Temperature ${weather.temp}°C. Pollination failure risk in beans and maize.`,
      action: 'Irrigate early morning. Avoid field work midday.',
    });
  }

  return insights;
}

// ─── Market Insights ──────────────────────────────────────────────────────────

export interface MarketPrice {
  crop_type: string;
  price_per_kg: number;
  district?: string;
  recorded_at: string;
}

export function generateMarketInsights(
  prices: MarketPrice[],
  primaryCrop?: string
): AgriInsight[] {
  const insights: AgriInsight[] = [];

  if (prices.length === 0) return insights;

  const groups: Record<string, number[]> = {};
  prices.forEach((p) => {
    const k = p.crop_type.toLowerCase();
    if (!groups[k]) groups[k] = [];
    groups[k].push(p.price_per_kg);
  });

  for (const [crop, priceList] of Object.entries(groups)) {
    if (priceList.length < 2) continue;
    const sorted = [...priceList].sort((a, b) => a - b);
    const latest = priceList[0];
    const oldest = priceList[priceList.length - 1];
    const change = ((latest - oldest) / oldest) * 100;

    if (change > 15) {
      insights.push({
        id: `price-surge-${crop}`,
        category: 'market',
        severity: 'positive',
        icon: '📈',
        title: `${crop.charAt(0).toUpperCase() + crop.slice(1)} Price Surge`,
        body: `Price up ${change.toFixed(0)}% recently — UGX ${Math.round(latest).toLocaleString()}/kg now.`,
        action: `Good time to sell your ${crop} if ready.`,
      });
    } else if (change < -10) {
      insights.push({
        id: `price-drop-${crop}`,
        category: 'market',
        severity: 'warning',
        icon: '📉',
        title: `${crop.charAt(0).toUpperCase() + crop.slice(1)} Price Falling`,
        body: `Price dropped ${Math.abs(change).toFixed(0)}% — hold if storage allows.`,
        action: 'Consider holding stock until market recovers.',
      });
    }

    // Spread between high and low markets
    if (sorted[sorted.length - 1] - sorted[0] > sorted[0] * 0.3) {
      insights.push({
        id: `price-spread-${crop}`,
        category: 'market',
        severity: 'info',
        icon: '💡',
        title: `${crop.charAt(0).toUpperCase() + crop.slice(1)} Market Arbitrage`,
        body: `Price spread of UGX ${Math.round(sorted[sorted.length - 1] - sorted[0]).toLocaleString()}/kg across districts.`,
        action: 'Compare local vs national buyers to maximize margin.',
      });
    }
  }

  return insights.slice(0, 3);
}

// ─── Disease / Risk Alerts ────────────────────────────────────────────────────

export function generateDiseaseAlerts(month: number, primaryCrop?: string): AgriInsight[] {
  const alerts: AgriInsight[] = [];
  const crop = primaryCrop?.toLowerCase() ?? '';

  // Armyworm: March–June peak
  if ([2, 3, 4, 5].includes(month)) {
    alerts.push({
      id: 'armyworm',
      category: 'disease',
      severity: 'critical',
      icon: '🐛',
      title: 'Armyworm Season Active',
      body: 'Fall armyworm peaks March–June. Maize fields highly vulnerable.',
      action: 'Scout fields at dawn. Apply Emamectin benzoate at first sign of damage.',
    });
  }

  // Bean fly: March–April
  if ([2, 3].includes(month) && (crop.includes('bean') || crop === '')) {
    alerts.push({
      id: 'bean-fly',
      category: 'disease',
      severity: 'warning',
      icon: '🪲',
      title: 'Bean Fly Risk',
      body: 'Bean fly attacks seedlings at cotyledon stage during March–April planting.',
      action: 'Treat seeds with thiamethoxam before planting.',
    });
  }

  // Late blight (tomato, potato): high humidity seasons
  if ([2, 3, 9, 10].includes(month)) {
    alerts.push({
      id: 'late-blight',
      category: 'disease',
      severity: 'warning',
      icon: '🍃',
      title: 'Late Blight Alert',
      body: 'Wet conditions increase late blight risk for tomatoes and potatoes.',
      action: 'Apply copper-based fungicide weekly during heavy rain periods.',
    });
  }

  // Post-harvest storage risk: after harvest dry seasons
  if ([5, 6, 11].includes(month)) {
    alerts.push({
      id: 'storage-risk',
      category: 'disease',
      severity: 'info',
      icon: '🏚️',
      title: 'Post-Harvest Storage Alert',
      body: 'Maize must be dried to <13% moisture before storage to prevent aflatoxin.',
      action: 'Use hermetic bags or metal silos. Check moisture with a meter.',
    });
  }

  // Cassava mosaic: year-round but note during dry2
  if ([5, 6, 7, 8].includes(month) && (crop.includes('cassava') || crop === '')) {
    alerts.push({
      id: 'cassava-mosaic',
      category: 'disease',
      severity: 'info',
      icon: '🌿',
      title: 'Cassava Mosaic Monitoring',
      body: 'Dry season can stress cassava and increase mosaic virus susceptibility via whitefly.',
      action: 'Use virus-free certified cuttings. Remove infected plants immediately.',
    });
  }

  return alerts.slice(0, 4);
}

// ─── All Insights Combined ────────────────────────────────────────────────────

export function generateAllInsights(
  weather: WeatherData | null,
  prices: MarketPrice[],
  month: number,
  primaryCrop?: string
): AgriInsight[] {
  const all: AgriInsight[] = [];

  if (weather) {
    all.push(...generateWeatherInsights(weather, month));
  }
  all.push(...generateMarketInsights(prices, primaryCrop));
  all.push(...generateDiseaseAlerts(month, primaryCrop));

  return all.slice(0, 8);
}
