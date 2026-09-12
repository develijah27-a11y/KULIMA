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
      icon: 'cloud-rain',
      title: 'Heavy Rain Alert',
      body: `${weather.rainfall.toFixed(1)} mm expected. Delay fertilizer application — runoff will reduce effectiveness.`,
      action: 'Inspect drainage channels and protect stored grain from moisture.',
    });
  } else if (weather.rainfall > 4 && season.code !== 'dry1' && season.code !== 'dry2') {
    insights.push({
      id: 'good-rain',
      category: 'weather',
      severity: 'positive',
      icon: 'cloud-sun',
      title: 'Good Planting Rains',
      body: `${weather.rainfall.toFixed(1)} mm — ideal soil moisture for germination and top-dressing.`,
      action: 'Window open for planting and fertilizer application.',
    });
  } else if (weather.rainfall < 1.5 && (season.code === 'A' || season.code === 'B')) {
    insights.push({
      id: 'dry-spell',
      category: 'weather',
      severity: 'critical',
      icon: 'sun',
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
      icon: 'droplets',
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
      icon: 'wind',
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
      icon: 'thermometer',
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
        icon: 'trending-up',
        title: `${crop.charAt(0).toUpperCase() + crop.slice(1)} Price Surge`,
        body: `Price up ${change.toFixed(0)}% recently — UGX ${Math.round(latest).toLocaleString()}/kg now.`,
        action: `Good time to sell your ${crop} if ready.`,
      });
    } else if (change < -10) {
      insights.push({
        id: `price-drop-${crop}`,
        category: 'market',
        severity: 'warning',
        icon: 'trending-down',
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
        icon: 'lightbulb',
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
  const crop = (primaryCrop ?? '').toLowerCase();

  // 1. Fall Armyworm: peaks March–June (Season A) and September–November (Season B onset)
  if ([2, 3, 4, 5, 8, 9, 10].includes(month) && (crop.includes('maize') || crop === '' || crop.includes('sorghum'))) {
    const isSeasonB = [8, 9, 10].includes(month);
    alerts.push({
      id: 'armyworm-active',
      category: 'disease',
      severity: 'critical',
      icon: 'bug',
      title: isSeasonB ? 'Fall Armyworm Season B Alert' : 'Fall Armyworm Active',
      body: isSeasonB
        ? 'Second rains emergence: young maize seedlings are highly vulnerable to fall armyworm broods.'
        : 'Fall armyworm peaks across central and western maize corridors.',
      action: 'Scout leaf funnels at dawn. Apply Emamectin benzoate or Chlorantraniliprole at first sign of pinholes.',
    });
  }

  // 2. Coffee Berry Borer & Coffee Leaf Rust: peak during maturation/ripening & Second Rains (August–November)
  if ([7, 8, 9, 10].includes(month) && (crop.includes('coffee') || crop === '')) {
    alerts.push({
      id: 'coffee-berry-borer',
      category: 'disease',
      severity: 'warning',
      icon: 'shield-alert',
      title: 'Coffee Berry Borer & Leaf Rust',
      body: 'Second rains moisture elevates leaf rust incidence and berry borer beetle activity on ripening cherries.',
      action: 'Strip-pick and destroy infested cherries. Apply copper hydroxide or systemic fungicide on rust lesions.',
    });
  }

  // 3. Late Blight & Bacterial Wilt (Tomato, Potato): damp wet soils (March–May and September–November)
  if ([2, 3, 4, 8, 9, 10].includes(month) && (crop.includes('tomato') || crop.includes('potato') || crop === '')) {
    alerts.push({
      id: 'tomato-late-blight',
      category: 'disease',
      severity: 'warning',
      icon: 'leaf',
      title: 'Late Blight & Bacterial Wilt Warning',
      body: 'Elevated ambient humidity and damp foliage accelerate Phytophthora blight spread in solanaceous crops.',
      action: 'Maintain proper plant spacing for airflow. Apply preventive Mancozeb or metalaxyl before heavy rains.',
    });
  }

  // 4. Bean Anthracnose & Bean Fly: cotyledon seedling attack during planting months
  if (([2, 3, 8, 9].includes(month)) && (crop.includes('bean') || crop.includes('legume') || crop === '')) {
    alerts.push({
      id: 'bean-anthracnose',
      category: 'disease',
      severity: 'warning',
      icon: 'bug',
      title: 'Bean Seedling Anthracnose & Stem Fly',
      body: 'Damp seedbeds in early planting windows trigger fungal root rot and bean stem fly wilting.',
      action: 'Use certified dressed seed (Thiamethoxam + Difenoconazole). Avoid cultivating bean fields while foliage is wet.',
    });
  }

  // 5. Banana Bacterial Wilt (BXW) & Black Sigatoka: year-round vector transmission, high during pruning
  if ([0, 1, 6, 7, 8, 9, 10].includes(month) && (crop.includes('banana') || crop.includes('matooke') || crop === '')) {
    alerts.push({
      id: 'banana-bxw',
      category: 'disease',
      severity: 'critical',
      icon: 'shield-alert',
      title: 'Banana Bacterial Wilt (BXW) Surveillance',
      body: 'Insect vectors and unsterilized pruning knives spread Xanthomonas wilt rapidly between mats.',
      action: 'De-bud male buds with a forked wooden stick. Disinfect machetes in Jik bleach (1:5 dilution) between plants.',
    });
  }

  // 6. Cassava Brown Streak Disease (CBSD) & Mosaic (CMD): whitefly population shifts
  if ([5, 6, 7, 8, 9].includes(month) && (crop.includes('cassava') || crop === '')) {
    alerts.push({
      id: 'cassava-mosaic',
      category: 'disease',
      severity: 'info',
      icon: 'sprout',
      title: 'Cassava Brown Streak & Mosaic Monitoring',
      body: 'Whitefly vector activity increases root constriction and necrotic rot in susceptible varieties.',
      action: 'Rogue out and burn symptomatic yellow-mottled plants. Plant certified clean cuttings (e.g. NASE 14, NAROCAS 1).',
    });
  }

  // 7. Post-Harvest Storage & Aflatoxin Risk: dry season storage months (June–August & December–February)
  if ([0, 1, 5, 6, 7, 11].includes(month)) {
    alerts.push({
      id: 'storage-risk',
      category: 'disease',
      severity: 'info',
      icon: 'shield-alert',
      title: 'Post-Harvest Grain Storage Alert',
      body: 'Stored maize, beans, and groundnuts risk greater grain borer and Aspergillus flavus aflatoxin contamination.',
      action: 'Dry grain on clean tarpaulins to <13% moisture. Store in hermetic PICS bags without chemical dust.',
    });
  }

  // 8. General fallback alert if crop has no specific condition
  if (alerts.length === 0) {
    alerts.push({
      id: 'seasonal-scouting',
      category: 'disease',
      severity: 'info',
      icon: 'leaf',
      title: 'Seasonal Crop Scouting Window',
      body: 'Regular morning field scouting is recommended to identify early foliar spots or stem borers before economic injury levels.',
      action: 'Inspect 20 random plants across a W-pattern in each field twice weekly.',
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
