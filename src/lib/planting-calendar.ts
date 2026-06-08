export interface PlantingWindow {
  crop: string;
  emoji: string;
  seasonA: { plantStart: number; plantEnd: number; harvestStart: number; harvestEnd: number } | null;
  seasonB: { plantStart: number; plantEnd: number; harvestStart: number; harvestEnd: number } | null;
  irrigated?: { plantStart: number; plantEnd: number; harvestStart: number; harvestEnd: number };
  durationDays: number;
  notes: string;
  zone?: 'all' | 'highland' | 'lowland';
}

// Months are 0-indexed (0=Jan)
export const PLANTING_CALENDAR: PlantingWindow[] = [
  {
    crop: 'maize', emoji: '🌽',
    seasonA: { plantStart: 1, plantEnd: 2, harvestStart: 5, harvestEnd: 6 },   // Feb–Mar plant, Jun–Jul harvest
    seasonB: { plantStart: 7, plantEnd: 8, harvestStart: 11, harvestEnd: 0 },  // Aug–Sep plant, Dec–Jan harvest
    durationDays: 120,
    notes: 'Short-cycle varieties (90 days) best for Season B. Apply DAP at planting.',
  },
  {
    crop: 'beans', emoji: '🫘',
    seasonA: { plantStart: 2, plantEnd: 3, harvestStart: 4, harvestEnd: 5 },
    seasonB: { plantStart: 8, plantEnd: 9, harvestStart: 10, harvestEnd: 11 },
    durationDays: 75,
    notes: 'Intercrop with maize for Season A. Climbing varieties need staking.',
  },
  {
    crop: 'groundnuts', emoji: '🥜',
    seasonA: { plantStart: 1, plantEnd: 3, harvestStart: 5, harvestEnd: 6 },
    seasonB: { plantStart: 8, plantEnd: 9, harvestStart: 11, harvestEnd: 11 },
    durationDays: 100,
    notes: 'Requires well-drained soils. Inoculate seed with Rhizobium for best yield.',
  },
  {
    crop: 'sorghum', emoji: '🌾',
    seasonA: { plantStart: 2, plantEnd: 3, harvestStart: 6, harvestEnd: 7 },
    seasonB: { plantStart: 8, plantEnd: 9, harvestStart: 11, harvestEnd: 11 },
    durationDays: 120,
    notes: 'Drought-tolerant. Best for semi-arid zones (Northern, Soroti, Kiruhura).',
    zone: 'all',
  },
  {
    crop: 'rice', emoji: '🌾',
    seasonA: { plantStart: 2, plantEnd: 3, harvestStart: 6, harvestEnd: 7 },
    seasonB: null,
    durationDays: 130,
    notes: 'Requires lowland or irrigated areas. Best in Doho, Kibimba, and lakeside zones.',
    zone: 'lowland',
  },
  {
    crop: 'cassava', emoji: '🥔',
    seasonA: { plantStart: 1, plantEnd: 3, harvestStart: 10, harvestEnd: 2 },
    seasonB: { plantStart: 8, plantEnd: 9, harvestStart: 4, harvestEnd: 8 },
    durationDays: 270,
    notes: 'Long-cycle crop (9–18 months). Use virus-free certified cuttings.',
  },
  {
    crop: 'sweet_potatoes', emoji: '🍠',
    seasonA: { plantStart: 2, plantEnd: 4, harvestStart: 5, harvestEnd: 7 },
    seasonB: { plantStart: 8, plantEnd: 10, harvestStart: 11, harvestEnd: 1 },
    durationDays: 90,
    notes: 'Vines need 30–45 cm spacing. Orange-flesh varieties have high market value.',
  },
  {
    crop: 'banana', emoji: '🍌',
    seasonA: { plantStart: 2, plantEnd: 5, harvestStart: 9, harvestEnd: 1 },
    seasonB: null,
    durationDays: 270,
    notes: 'Plant at start of long rains. Matooke produces year-round once established.',
    zone: 'highland',
  },
  {
    crop: 'coffee', emoji: '☕',
    seasonA: { plantStart: 3, plantEnd: 5, harvestStart: 9, harvestEnd: 1 },
    seasonB: null,
    durationDays: 365,
    notes: 'Robusta: lowland/central. Arabica: highland. 3 years to first harvest.',
  },
  {
    crop: 'tomato', emoji: '🍅',
    seasonA: null,
    seasonB: { plantStart: 6, plantEnd: 8, harvestStart: 9, harvestEnd: 11 },
    irrigated: { plantStart: 0, plantEnd: 1, harvestStart: 2, harvestEnd: 3 },
    durationDays: 75,
    notes: 'Start seedlings in nursery 4 weeks before transplanting. Needs staking.',
  },
  {
    crop: 'sunflower', emoji: '🌻',
    seasonA: { plantStart: 1, plantEnd: 3, harvestStart: 5, harvestEnd: 7 },
    seasonB: { plantStart: 8, plantEnd: 9, harvestStart: 11, harvestEnd: 0 },
    durationDays: 100,
    notes: 'High oil content varieties (R-SUNCO, Salve) preferred for commercial sale.',
  },
];

export interface PlantingAlert {
  crop: string;
  emoji: string;
  type: 'plant_now' | 'harvest_now' | 'plant_soon' | 'harvest_soon' | 'prepare';
  title: string;
  message: string;
  urgency: 'high' | 'medium' | 'low';
  daysUntil: number;
  season: 'A' | 'B' | 'irrigated';
}

export function generatePlantingAlerts(
  month: number,
  day: number,
  farmerCrops: string[],
): PlantingAlert[] {
  const alerts: PlantingAlert[] = [];

  const checkCrops = farmerCrops.length > 0
    ? PLANTING_CALENDAR.filter(c => farmerCrops.includes(c.crop))
    : PLANTING_CALENDAR;

  for (const cal of checkCrops) {
    for (const [seasonKey, window] of [['A', cal.seasonA], ['B', cal.seasonB], ['irrigated', cal.irrigated]] as const) {
      if (!window) continue;

      const { plantStart, plantEnd, harvestStart, harvestEnd } = window;

      // Is it currently planting time?
      if (isInWindow(month, plantStart, plantEnd)) {
        const daysLeft = daysUntilEnd(month, day, plantEnd);
        alerts.push({
          crop: cal.crop, emoji: cal.emoji,
          type: 'plant_now',
          title: `Plant ${capitalize(cal.crop)} Now`,
          message: `Season ${seasonKey}: Planting window open — ${daysLeft} days remaining. ${cal.notes}`,
          urgency: daysLeft <= 14 ? 'high' : 'medium',
          daysUntil: 0,
          season: seasonKey,
        });
      }
      // Is planting window coming up in 3 weeks?
      else {
        const daysUntilPlant = daysUntilStart(month, day, plantStart);
        if (daysUntilPlant > 0 && daysUntilPlant <= 21) {
          alerts.push({
            crop: cal.crop, emoji: cal.emoji,
            type: daysUntilPlant <= 7 ? 'plant_soon' : 'prepare',
            title: daysUntilPlant <= 7 ? `Prepare to Plant ${capitalize(cal.crop)}` : `${capitalize(cal.crop)} Season ${seasonKey} in ${daysUntilPlant} days`,
            message: daysUntilPlant <= 7
              ? `Planting window opens in ${daysUntilPlant} days. Get seeds and prepare land now.`
              : `Start land preparation. Buy ${cal.crop} seeds. ${cal.notes}`,
            urgency: daysUntilPlant <= 7 ? 'high' : 'low',
            daysUntil: daysUntilPlant,
            season: seasonKey,
          });
        }
      }

      // Is it harvest time?
      if (isInWindow(month, harvestStart, harvestEnd)) {
        const daysLeft = daysUntilEnd(month, day, harvestEnd);
        alerts.push({
          crop: cal.crop, emoji: cal.emoji,
          type: 'harvest_now',
          title: `Harvest ${capitalize(cal.crop)}`,
          message: `Season ${seasonKey} crop should be ready. Check for maturity signs. ${daysLeft} days left in window.`,
          urgency: 'medium',
          daysUntil: 0,
          season: seasonKey,
        });
      }
    }
  }

  // Sort: high urgency first, then by daysUntil
  return alerts
    .sort((a, b) => {
      const urgOrder = { high: 0, medium: 1, low: 2 };
      return urgOrder[a.urgency] - urgOrder[b.urgency] || a.daysUntil - b.daysUntil;
    })
    .slice(0, 8);
}

function isInWindow(month: number, start: number, end: number): boolean {
  if (start <= end) return month >= start && month <= end;
  // Wraps around year (e.g., Nov to Jan: 10 <= month || month <= 0)
  return month >= start || month <= end;
}

function daysUntilStart(currentMonth: number, currentDay: number, targetMonth: number): number {
  const now = new Date();
  const target = new Date(now.getFullYear(), targetMonth, 1);
  if (target < now) target.setFullYear(target.getFullYear() + 1);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

function daysUntilEnd(currentMonth: number, currentDay: number, endMonth: number): number {
  const now = new Date();
  const target = new Date(now.getFullYear(), endMonth, 28);
  if (target < now) target.setFullYear(target.getFullYear() + 1);
  return Math.max(0, Math.round((target.getTime() - now.getTime()) / 86400000));
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

export function getCurrentSeasonSummary(month: number): {
  name: string;
  phase: 'planting' | 'growing' | 'harvest' | 'dry';
  crops: string[];
  action: string;
  nextSeason: string;
  daysToNextSeason: number;
} {
  // Season A peak: Mar–May | Season B peak: Sep–Nov
  const isSeasonA = month >= 2 && month <= 5;
  const isSeasonB = month >= 8 && month <= 11;
  const isDry1    = month >= 11 || month <= 1;
  const isDry2    = month >= 5 && month <= 8;

  if (isSeasonA) {
    const phase: 'planting' | 'growing' | 'harvest' = month <= 3 ? 'planting' : month === 4 ? 'growing' : 'harvest';
    return {
      name: 'Season A — Long Rains',
      phase,
      crops: ['Maize', 'Beans', 'Groundnuts', 'Sunflower', 'Sorghum'],
      action: phase === 'planting' ? 'Plant maize and beans now. Apply basal DAP fertilizer.' : phase === 'growing' ? 'Top-dress maize with CAN. Monitor for armyworm.' : 'Begin harvesting maize. Dry beans to 14% moisture.',
      nextSeason: 'Season B',
      daysToNextSeason: Math.round((new Date(new Date().getFullYear(), 8, 1).getTime() - Date.now()) / 86400000),
    };
  }

  if (isSeasonB) {
    const phase: 'planting' | 'growing' | 'harvest' = month <= 9 ? 'planting' : month === 10 ? 'growing' : 'harvest';
    return {
      name: 'Season B — Short Rains',
      phase,
      crops: ['Beans', 'Sweet Potato', 'Cassava', 'Sorghum', 'Tomato'],
      action: phase === 'planting' ? 'Plant short-cycle crops. Prepare tomato nurseries.' : phase === 'growing' ? 'Weed and mulch. Monitor for late blight on tomatoes.' : 'Harvest beans and sweet potatoes. Store properly.',
      nextSeason: 'Season A',
      daysToNextSeason: Math.round((new Date(new Date().getFullYear() + 1, 2, 1).getTime() - Date.now()) / 86400000),
    };
  }

  if (isDry2) {
    return {
      name: 'Dry Season (Jun–Aug)',
      phase: 'dry',
      crops: ['Tomato (irrigated)', 'Onion', 'Watermelon', 'Sweet Potato'],
      action: 'Harvest Season A crops. Dry and store maize properly. Prepare for Season B.',
      nextSeason: 'Season B',
      daysToNextSeason: Math.round((new Date(new Date().getFullYear(), 8, 1).getTime() - Date.now()) / 86400000),
    };
  }

  // isDry1 (Dec–Feb)
  return {
    name: 'Dry Season (Dec–Feb)',
    phase: 'dry',
    crops: ['Onion (irrigated)', 'Tomato (irrigated)', 'Watermelon', 'Capsicum'],
    action: 'Harvest Season B crops. Prepare land for Season A. Buy seeds and fertilizer.',
    nextSeason: 'Season A',
    daysToNextSeason: Math.round((new Date(new Date().getFullYear(), 2, 1).getTime() - Date.now()) / 86400000),
  };
}
