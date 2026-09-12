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

export type ClimateZone = 'tropical_africa' | 'temperate_north' | 'temperate_south' | 'tropical_general';

export interface LocationContext {
  latitude?: number | null;
  longitude?: number | null;
  location?: string | null;
  district?: string | null;
  country?: string | null;
}

export interface SeasonalPlan {
  season: string;
  phase: string;
  daysLeft: number;
  recommendedCrops: string[];
  currentTask: string;
  nextTask: string;
  urgency: InsightSeverity;
  climateZone?: ClimateZone;
  zoneName?: string;
}

// ─── Climate & Continental Detection ──────────────────────────────────────────

export function detectClimateZone(loc?: LocationContext): ClimateZone {
  if (!loc) return 'tropical_africa';

  const lat = loc.latitude !== null && loc.latitude !== undefined ? Number(loc.latitude) : null;
  const lon = loc.longitude !== null && loc.longitude !== undefined ? Number(loc.longitude) : null;

  // Coordinate-based detection (most accurate)
  if (lat !== null && !isNaN(lat) && (lat !== 0 || (lon !== null && lon !== 0))) {
    if (lat > 23.5) return 'temperate_north'; // Above Tropic of Cancer (Europe, North America, Northern Asia)
    if (lat < -23.5) return 'temperate_south'; // Below Tropic of Capricorn (Southern South America, Australia, New Zealand, South Africa)
    
    // Within tropics (-23.5 to 23.5)
    if (lon !== null && !isNaN(lon)) {
      if (lon >= -20 && lon <= 55) {
        return 'tropical_africa'; // African tropical belt
      }
      return 'tropical_general'; // Other equatorial/tropical zones
    }
  }

  // Text-based heuristics
  const rawText = [loc.location, loc.district, loc.country].filter(Boolean).join(' ').toLowerCase();
  if (rawText) {
    // Temperate North: Europe, UK, US, Canada, etc.
    const temperateNorthKeywords = [
      'europe', 'united kingdom', 'uk', 'england', 'scotland', 'wales', 'ireland',
      'france', 'germany', 'spain', 'italy', 'netherlands', 'holland', 'belgium',
      'austria', 'switzerland', 'poland', 'sweden', 'norway', 'denmark', 'finland',
      'portugal', 'greece', 'czech', 'hungary', 'romania', 'bulgaria', 'ukraine',
      'russia', 'united states', 'usa', 'america', 'canada', 'london', 'paris',
      'berlin', 'madrid', 'rome', 'amsterdam', 'brussels', 'vienna', 'warsaw',
      'stockholm', 'oslo', 'copenhagen', 'helsinki', 'dublin', 'lisbon', 'athens',
      'new york', 'chicago', 'toronto', 'vancouver', 'montreal', 'texas', 'california'
    ];
    if (temperateNorthKeywords.some(kw => rawText.includes(kw))) {
      return 'temperate_north';
    }

    // Temperate South: Australia, New Zealand, Argentina, Chile, Southern Africa
    const temperateSouthKeywords = [
      'australia', 'new zealand', 'argentina', 'chile', 'uruguay', 'south africa',
      'melbourne', 'sydney', 'brisbane', 'adelaide', 'perth', 'auckland', 'wellington',
      'buenos aires', 'santiago', 'cape town', 'johannesburg', 'durban'
    ];
    if (temperateSouthKeywords.some(kw => rawText.includes(kw))) {
      return 'temperate_south';
    }

    // Tropical General: Latin America / South & Southeast Asia
    const tropicalGeneralKeywords = [
      'brazil', 'colombia', 'ecuador', 'peru', 'venezuela', 'india', 'pakistan',
      'bangladesh', 'vietnam', 'thailand', 'indonesia', 'philippines', 'malaysia',
      'singapore', 'sri lanka', 'mexico'
    ];
    if (tropicalGeneralKeywords.some(kw => rawText.includes(kw))) {
      return 'tropical_general';
    }
  }

  // Default to tropical Africa (Uganda, Kenya, Rwanda, Tanzania, etc.)
  return 'tropical_africa';
}

// ─── Multi-Continental Seasons ────────────────────────────────────────────────

export function getContinentalSeason(month: number, loc?: LocationContext): {
  name: string;
  code: string;
  daysLeft: number;
  climateZone: ClimateZone;
  zoneName: string;
} {
  const climateZone = detectClimateZone(loc);

  if (climateZone === 'temperate_north') {
    // 4 astronomical/meteorological seasons (Europe, UK, North America)
    const ends: Record<string, number[]> = {
      spring: [2, 3, 4],     // Mar–May
      summer: [5, 6, 7],     // Jun–Aug
      autumn: [8, 9, 10],    // Sep–Nov (Autumn / Fall)
      winter: [11, 0, 1],    // Dec–Feb
    };

    const NAMES: Record<string, string> = {
      spring: 'Spring (March–May)',
      summer: 'Summer (June–August)',
      autumn: 'Autumn / Fall (September–November)',
      winter: 'Winter (December–February)',
    };

    let code = 'autumn';
    for (const [k, months] of Object.entries(ends)) {
      if (months.includes(month)) { code = k; break; }
    }

    const endMonth = ends[code][ends[code].length - 1];
    const now = new Date();
    let targetYear = now.getFullYear();
    if (code === 'winter' && month === 11) {
      targetYear += 1;
    }
    const endDay = new Date(targetYear, endMonth + 1, 0);
    const daysLeft = Math.max(0, Math.round((endDay.getTime() - Date.now()) / 86400000));

    return {
      name: NAMES[code],
      code,
      daysLeft,
      climateZone,
      zoneName: 'Europe & Northern Temperate',
    };
  }

  if (climateZone === 'temperate_south') {
    // 4 seasons inverted (Australia, NZ, Southern South America, South Africa)
    const ends: Record<string, number[]> = {
      autumn: [2, 3, 4],     // Mar–May
      winter: [5, 6, 7],     // Jun–Aug
      spring: [8, 9, 10],    // Sep–Nov
      summer: [11, 0, 1],    // Dec–Feb
    };

    const NAMES: Record<string, string> = {
      spring: 'Spring (September–November)',
      summer: 'Summer (December–February)',
      autumn: 'Autumn / Fall (March–May)',
      winter: 'Winter (June–August)',
    };

    let code = 'spring';
    for (const [k, months] of Object.entries(ends)) {
      if (months.includes(month)) { code = k; break; }
    }

    const endMonth = ends[code][ends[code].length - 1];
    const now = new Date();
    let targetYear = now.getFullYear();
    if (code === 'summer' && month === 11) {
      targetYear += 1;
    }
    const endDay = new Date(targetYear, endMonth + 1, 0);
    const daysLeft = Math.max(0, Math.round((endDay.getTime() - Date.now()) / 86400000));

    return {
      name: NAMES[code],
      code,
      daysLeft,
      climateZone,
      zoneName: 'Southern Hemisphere Temperate',
    };
  }

  if (climateZone === 'tropical_general') {
    // Monsoon / Wet-Dry cycle
    const isWet = month >= 5 && month <= 9; // Jun–Oct
    const code = isWet ? 'wet' : 'dry';
    const endMonth = isWet ? 9 : 4;
    const now = new Date();
    let targetYear = now.getFullYear();
    if (!isWet && month >= 10) targetYear += 1;
    const endDay = new Date(targetYear, endMonth + 1, 0);
    const daysLeft = Math.max(0, Math.round((endDay.getTime() - Date.now()) / 86400000));

    return {
      name: isWet ? 'Monsoon / Wet Season (June–October)' : 'Dry Season (November–May)',
      code,
      daysLeft,
      climateZone,
      zoneName: 'Tropical Monsoon Region',
    };
  }

  // Tropical Africa (Uganda, Kenya, Rwanda, Tanzania bimodal cycle)
  const ends: Record<'A' | 'B' | 'dry1' | 'dry2', number[]> = {
    A:    [2, 3, 4],       // Mar–May (Season A)
    dry1: [5, 6, 7],       // Jun–Aug (Dry 1)
    B:    [8, 9, 10],      // Sep–Nov (Season B)
    dry2: [11, 0, 1],      // Dec–Feb (Dry 2)
  };

  const NAMES: Record<'A' | 'B' | 'dry1' | 'dry2', string> = {
    A: 'Season A (March–May Main Rains)',
    dry1: 'Dry Season 1 (June–August)',
    B: 'Season B (September–November Second Rains)',
    dry2: 'Dry Season 2 (December–February)',
  };

  const codes: ('A' | 'B' | 'dry1' | 'dry2')[] = ['A', 'dry1', 'B', 'dry2'];
  let code: 'A' | 'B' | 'dry1' | 'dry2' = 'B';
  for (const c of codes) {
    if (ends[c].includes(month)) { code = c; break; }
  }

  const endMonth = ends[code][ends[code].length - 1];
  const now = new Date();
  let targetYear = now.getFullYear();
  if (code === 'dry2' && month === 11) {
    targetYear += 1;
  }
  const endDay = new Date(targetYear, endMonth + 1, 0);
  const daysLeft = Math.max(0, Math.round((endDay.getTime() - Date.now()) / 86400000));

  return {
    name: NAMES[code],
    code,
    daysLeft,
    climateZone: 'tropical_africa',
    zoneName: 'East Africa / Equatorial Belt',
  };
}

export function getUgandaSeason(month: number): {
  name: string;
  code: 'A' | 'B' | 'dry1' | 'dry2';
  daysLeft: number;
} {
  const res = getContinentalSeason(month, { location: 'Uganda' });
  return {
    name: res.name,
    code: (res.code as 'A' | 'B' | 'dry1' | 'dry2'),
    daysLeft: res.daysLeft,
  };
}

export function buildSeasonalPlan(
  month: number,
  primaryCrop?: string,
  loc?: LocationContext
): SeasonalPlan {
  const seasonInfo = getContinentalSeason(month, loc);

  if (seasonInfo.climateZone === 'temperate_north') {
    const plans: Record<string, {
      recommendedCrops: string[];
      currentTask: string;
      nextTask: string;
      urgency: InsightSeverity;
    }> = {
      autumn: {
        recommendedCrops: ['Winter Wheat', 'Winter Barley', 'Oilseed Rape', 'Cover Crops', 'Maize / Corn', 'Sugar Beet'],
        currentTask: 'Autumn drilling and late harvest. Drill winter cereals, combine corn, lift sugar beets, and establish green cover crops.',
        nextTask: 'Clean and service combine harvesters. Apply pre-emergence herbicides on winter cereals before first ground frosts.',
        urgency: 'positive',
      },
      winter: {
        recommendedCrops: ['Winter Cereals (in dormancy)', 'Winter Rye', 'Overwintering Brassicas', 'Garlic'],
        currentTask: 'Winter dormancy and soil rest. Maintain machinery, test stored grain moisture and temperatures, and frost-proof water lines.',
        nextTask: 'Finalize spring crop rotations, review seed orders, and plan early nitrogen applications ahead of spring thaw.',
        urgency: 'info',
      },
      spring: {
        recommendedCrops: ['Spring Barley', 'Sugar Beet', 'Potatoes', 'Oats', 'Peas', 'Sunflowers', 'Maize'],
        currentTask: 'Spring cultivation and seedbed preparation once soils reach 6-8°C. Top-dress winter crops with early nitrogen.',
        nextTask: 'Monitor emergence, manage broadleaf weeds, and calibrate boom sprayers for targeted plant protection.',
        urgency: 'positive',
      },
      summer: {
        recommendedCrops: ['Wheat (ripening)', 'Winter Barley', 'Oilseed Rape', 'Vegetables', 'Berries', 'Silage Maize'],
        currentTask: 'Summer grain ripening and combining. Harvest winter barley and oilseed rape. Monitor soil moisture and heat stress.',
        nextTask: 'Bale and store straw. Prepare stubbles for post-harvest min-till cultivation.',
        urgency: 'warning',
      },
    };

    const plan = plans[seasonInfo.code] || plans.autumn;
    return {
      season: seasonInfo.name,
      phase: seasonInfo.code,
      daysLeft: seasonInfo.daysLeft,
      recommendedCrops: plan.recommendedCrops,
      currentTask: plan.currentTask,
      nextTask: plan.nextTask,
      urgency: plan.urgency,
      climateZone: seasonInfo.climateZone,
      zoneName: seasonInfo.zoneName,
    };
  }

  if (seasonInfo.climateZone === 'temperate_south') {
    const plans: Record<string, {
      recommendedCrops: string[];
      currentTask: string;
      nextTask: string;
      urgency: InsightSeverity;
    }> = {
      spring: {
        recommendedCrops: ['Spring Cereals', 'Corn / Maize', 'Sunflower', 'Soybeans', 'Pasture'],
        currentTask: 'Spring sowing and pasture management. Drill summer crops as soil temperature rises.',
        nextTask: 'Fertilizer side-dressing, irrigation scheduling, and early in-crop weed control.',
        urgency: 'positive',
      },
      summer: {
        recommendedCrops: ['Winter Grains Harvest', 'Sorghum', 'Cotton', 'Grapes', 'Stone Fruit'],
        currentTask: 'Summer grain harvesting and intensive irrigation monitoring during peak evapotranspiration.',
        nextTask: 'Stubble management, grain storage aeration, and farm fire break maintenance.',
        urgency: 'warning',
      },
      autumn: {
        recommendedCrops: ['Winter Wheat', 'Winter Barley', 'Canola', 'Lupins', 'Faba Beans'],
        currentTask: 'Autumn sowing of winter grains and canola following the autumn break rains.',
        nextTask: 'Monitor seedling emergence and control early pests (slugs, earth mites).',
        urgency: 'positive',
      },
      winter: {
        recommendedCrops: ['Winter Cereals', 'Winter Pastures'],
        currentTask: 'Winter crop establishment, selective in-crop spraying, and nitrogen top-dressing.',
        nextTask: 'Pre-spring fungicide preparation and sprayer calibrations.',
        urgency: 'info',
      },
    };

    const plan = plans[seasonInfo.code] || plans.spring;
    return {
      season: seasonInfo.name,
      phase: seasonInfo.code,
      daysLeft: seasonInfo.daysLeft,
      recommendedCrops: plan.recommendedCrops,
      currentTask: plan.currentTask,
      nextTask: plan.nextTask,
      urgency: plan.urgency,
      climateZone: seasonInfo.climateZone,
      zoneName: seasonInfo.zoneName,
    };
  }

  if (seasonInfo.climateZone === 'tropical_general') {
    const plans: Record<string, {
      recommendedCrops: string[];
      currentTask: string;
      nextTask: string;
      urgency: InsightSeverity;
    }> = {
      wet: {
        recommendedCrops: ['Rice / Paddy', 'Maize', 'Soybeans', 'Sugarcane', 'Chili'],
        currentTask: 'Monsoon planting and water regulation. Maintain bunds and drainage channels.',
        nextTask: 'Top-dressing and preventive fungicide applications against high humidity blights.',
        urgency: 'positive',
      },
      dry: {
        recommendedCrops: ['Pulses', 'Irrigated Vegetables', 'Groundnuts', 'Sesame'],
        currentTask: 'Dry season harvesting, sun-drying, and drip irrigation on high-value cash crops.',
        nextTask: 'Soil solarization and organic compost incorporation ahead of the next monsoon.',
        urgency: 'info',
      },
    };

    const plan = plans[seasonInfo.code] || plans.wet;
    return {
      season: seasonInfo.name,
      phase: seasonInfo.code,
      daysLeft: seasonInfo.daysLeft,
      recommendedCrops: plan.recommendedCrops,
      currentTask: plan.currentTask,
      nextTask: plan.nextTask,
      urgency: plan.urgency,
      climateZone: seasonInfo.climateZone,
      zoneName: seasonInfo.zoneName,
    };
  }

  // Tropical Africa (Default: Uganda, Kenya, Rwanda, Tanzania)
  const plans: Record<string, {
    recommendedCrops: string[];
    currentTask: string;
    nextTask: string;
    urgency: InsightSeverity;
  }> = {
    A: {
      recommendedCrops: ['Maize', 'Beans', 'Groundnuts', 'Sunflower', 'Sorghum', 'Soybeans'],
      currentTask: 'Season A land prep and planting. Apply basal fertilizer (DAP/NPK) before first rains.',
      nextTask: 'Top-dress with nitrogen (CAN/Urea) at knee height (~3 weeks post-germination).',
      urgency: 'positive',
    },
    B: {
      recommendedCrops: ['Cassava', 'Sweet Potato', 'Sorghum', 'Tomato', 'Cabbage', 'Beans'],
      currentTask: 'Season B planting of short-cycle crops. Mulch heavily to retain soil moisture.',
      nextTask: 'Monitor for late blight and fall armyworm. Begin harvesting short-cycle vegetables.',
      urgency: 'info',
    },
    dry1: {
      recommendedCrops: ['Sweet Potato', 'Cassava', 'Watermelon (irrigated)', 'Vegetables'],
      currentTask: 'Harvest Season A crops. Dry and store maize at <13% moisture to prevent aflatoxin.',
      nextTask: 'Prepare nurseries and field beds for Season B rains arriving in September.',
      urgency: 'info',
    },
    dry2: {
      recommendedCrops: ['Onion', 'Tomato (irrigated)', 'Capsicum', 'Watermelon'],
      currentTask: 'Dry season irrigation. Harvest September–November Season B crops and dry thoroughly.',
      nextTask: 'Procure certified inputs and prepare land for the March Season A rains.',
      urgency: 'warning',
    },
  };

  const plan = plans[seasonInfo.code] || plans.B;

  return {
    season: seasonInfo.name,
    phase: seasonInfo.code,
    daysLeft: seasonInfo.daysLeft,
    recommendedCrops: plan.recommendedCrops,
    currentTask: plan.currentTask,
    nextTask: plan.nextTask,
    urgency: plan.urgency,
    climateZone: seasonInfo.climateZone,
    zoneName: seasonInfo.zoneName,
  };
}

// ─── Weather Insights ─────────────────────────────────────────────────────────

export function generateWeatherInsights(
  weather: WeatherData,
  month: number,
  loc?: LocationContext
): AgriInsight[] {
  const insights: AgriInsight[] = [];
  const season = getContinentalSeason(month, loc);
  const isDry = season.code.startsWith('dry') || season.code === 'winter';

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
  } else if (weather.rainfall > 4 && !isDry) {
    insights.push({
      id: 'good-rain',
      category: 'weather',
      severity: 'positive',
      icon: 'cloud-sun',
      title: 'Good Planting Rains',
      body: `${weather.rainfall.toFixed(1)} mm — ideal soil moisture for germination and top-dressing.`,
      action: 'Window open for planting and fertilizer application.',
    });
  } else if (weather.rainfall < 1.5 && (season.code === 'A' || season.code === 'B' || season.code === 'spring')) {
    insights.push({
      id: 'dry-spell',
      category: 'weather',
      severity: 'critical',
      icon: 'sun',
      title: 'Dry Spell During Active Growing Season',
      body: 'Rainfall below 1.5 mm during active season — stress risk for seedlings.',
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
