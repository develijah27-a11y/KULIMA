export interface SeasonWindow {
  plantStart: number; plantEnd: number;
  weedStart: number; weedEnd: number;
  harvestStart: number; harvestEnd: number;
}

export interface PlantingWindow {
  crop: string;
  emoji: string;
  category: 'cereal' | 'legume' | 'root' | 'cash' | 'vegetable' | 'fruit' | 'oilseed';
  rains1: SeasonWindow | null; // first rains — roughly Mar–Jun
  rains2: SeasonWindow | null; // second rains — roughly Sep–Dec
  irrigated?: SeasonWindow;
  durationDays: number;
  notes: string;
  zone?: 'all' | 'highland' | 'lowland';
}

// Months are 0-indexed (0=Jan). Weeding windows are the critical first
// weeding, typically 2-5 weeks after planting begins.
export const PLANTING_CALENDAR: PlantingWindow[] = [
  {
    crop: 'maize', emoji: '🌽', category: 'cereal',
    rains1: { plantStart: 1, plantEnd: 2, weedStart: 2, weedEnd: 3, harvestStart: 5, harvestEnd: 6 },
    rains2: { plantStart: 7, plantEnd: 8, weedStart: 8, weedEnd: 9, harvestStart: 11, harvestEnd: 0 },
    durationDays: 120,
    notes: 'Short-cycle varieties (90 days) best for the second rains. Apply DAP at planting; top-dress with CAN at weeding.',
  },
  {
    crop: 'beans', emoji: '🫘', category: 'legume',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 3, harvestStart: 4, harvestEnd: 5 },
    rains2: { plantStart: 8, plantEnd: 9, weedStart: 9, weedEnd: 9, harvestStart: 10, harvestEnd: 11 },
    durationDays: 75,
    notes: 'Intercrop with maize in the first rains. Climbing varieties need staking. Weed once, 3 weeks after planting.',
  },
  {
    crop: 'groundnuts', emoji: '🥜', category: 'legume',
    rains1: { plantStart: 1, plantEnd: 3, weedStart: 2, weedEnd: 4, harvestStart: 5, harvestEnd: 6 },
    rains2: { plantStart: 8, plantEnd: 9, weedStart: 9, weedEnd: 10, harvestStart: 11, harvestEnd: 11 },
    durationDays: 100,
    notes: 'Requires well-drained soils. Inoculate seed with Rhizobium for best yield.',
  },
  {
    crop: 'sorghum', emoji: '🌾', category: 'cereal',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 4, harvestStart: 6, harvestEnd: 7 },
    rains2: { plantStart: 8, plantEnd: 9, weedStart: 9, weedEnd: 10, harvestStart: 11, harvestEnd: 11 },
    durationDays: 120,
    notes: 'Drought-tolerant. Best for semi-arid zones (Northern Uganda, Soroti, Kiruhura).',
    zone: 'all',
  },
  {
    crop: 'millet', emoji: '🌾', category: 'cereal',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 4, harvestStart: 6, harvestEnd: 7 },
    rains2: { plantStart: 8, plantEnd: 9, weedStart: 9, weedEnd: 10, harvestStart: 11, harvestEnd: 11 },
    durationDays: 110,
    notes: 'Finger millet — very drought-tolerant, common in Eastern and Northern Uganda. Weed twice for best yield.',
    zone: 'all',
  },
  {
    crop: 'rice', emoji: '🌾', category: 'cereal',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 4, harvestStart: 6, harvestEnd: 7 },
    rains2: null,
    durationDays: 130,
    notes: 'Requires lowland or irrigated areas. Best in Doho, Kibimba, and lakeside zones.',
    zone: 'lowland',
  },
  {
    crop: 'cassava', emoji: '🥔', category: 'root',
    rains1: { plantStart: 1, plantEnd: 3, weedStart: 3, weedEnd: 4, harvestStart: 10, harvestEnd: 2 },
    rains2: { plantStart: 8, plantEnd: 9, weedStart: 9, weedEnd: 10, harvestStart: 4, harvestEnd: 8 },
    durationDays: 270,
    notes: 'Long-cycle crop (9–18 months). Use virus-free certified cuttings.',
  },
  {
    crop: 'sweet_potatoes', emoji: '🍠', category: 'root',
    rains1: { plantStart: 2, plantEnd: 4, weedStart: 3, weedEnd: 5, harvestStart: 5, harvestEnd: 7 },
    rains2: { plantStart: 8, plantEnd: 10, weedStart: 9, weedEnd: 11, harvestStart: 11, harvestEnd: 1 },
    durationDays: 90,
    notes: 'Vines need 30–45 cm spacing. Orange-flesh varieties have high market value.',
  },
  {
    crop: 'irish_potatoes', emoji: '🥔', category: 'root',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 4, harvestStart: 5, harvestEnd: 6 },
    rains2: { plantStart: 8, plantEnd: 9, weedStart: 9, weedEnd: 10, harvestStart: 11, harvestEnd: 0 },
    durationDays: 100,
    notes: 'Highland crop — Kabale, Kisoro, Mbale, Kapchorwa. Earth up (hill) at weeding stage.',
    zone: 'highland',
  },
  {
    crop: 'yams', emoji: '🍠', category: 'root',
    rains1: { plantStart: 1, plantEnd: 3, weedStart: 3, weedEnd: 5, harvestStart: 9, harvestEnd: 11 },
    rains2: null,
    durationDays: 240,
    notes: 'Stake vines for support. Common in Northern and Eastern Uganda.',
  },
  {
    crop: 'banana', emoji: '🍌', category: 'fruit',
    rains1: { plantStart: 2, plantEnd: 5, weedStart: 4, weedEnd: 6, harvestStart: 9, harvestEnd: 1 },
    rains2: null,
    durationDays: 270,
    notes: 'Plant at start of the first rains. Matooke produces year-round once established.',
    zone: 'highland',
  },
  {
    crop: 'coffee', emoji: '☕', category: 'cash',
    rains1: { plantStart: 3, plantEnd: 5, weedStart: 5, weedEnd: 6, harvestStart: 9, harvestEnd: 1 },
    rains2: null,
    durationDays: 365,
    notes: 'Robusta: lowland/central. Arabica: highland. 3 years to first harvest. Weed and mulch each rains.',
  },
  {
    crop: 'tea', emoji: '🍵', category: 'cash',
    rains1: { plantStart: 3, plantEnd: 5, weedStart: 5, weedEnd: 6, harvestStart: 0, harvestEnd: 11 },
    rains2: null,
    durationDays: 730,
    notes: 'Highland perennial (Kabale, Bushenyi, Mityana). Plucked year-round every 7–14 days once mature.',
    zone: 'highland',
  },
  {
    crop: 'cotton', emoji: '☁️', category: 'cash',
    rains1: { plantStart: 3, plantEnd: 4, weedStart: 4, weedEnd: 5, harvestStart: 8, harvestEnd: 10 },
    rains2: null,
    durationDays: 180,
    notes: 'Major cash crop in Northern and Eastern Uganda. Spray for bollworm during flowering.',
  },
  {
    crop: 'tobacco', emoji: '🍂', category: 'cash',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 4, harvestStart: 6, harvestEnd: 8 },
    rains2: null,
    durationDays: 150,
    notes: 'Grown under contract in West Nile and Mid-Western Uganda. Nursery raised 6–8 weeks before transplanting.',
  },
  {
    crop: 'soybeans', emoji: '🫘', category: 'legume',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 4, harvestStart: 6, harvestEnd: 7 },
    rains2: { plantStart: 8, plantEnd: 9, weedStart: 9, weedEnd: 10, harvestStart: 11, harvestEnd: 11 },
    durationDays: 100,
    notes: 'Growing demand for oil and animal feed processing. Inoculate seed for better nodulation.',
  },
  {
    crop: 'cowpeas', emoji: '🫛', category: 'legume',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 3, harvestStart: 4, harvestEnd: 5 },
    rains2: { plantStart: 8, plantEnd: 9, weedStart: 9, weedEnd: 9, harvestStart: 10, harvestEnd: 11 },
    durationDays: 70,
    notes: 'Drought-tolerant, dual-purpose (grain + leafy vegetable). Good for semi-arid areas.',
  },
  {
    crop: 'pigeon_peas', emoji: '🫘', category: 'legume',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 4, harvestStart: 9, harvestEnd: 11 },
    rains2: null,
    durationDays: 240,
    notes: 'Long-duration legume, improves soil fertility. Common intercrop in Eastern Uganda.',
  },
  {
    crop: 'sesame', emoji: '🌱', category: 'oilseed',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 4, harvestStart: 5, harvestEnd: 6 },
    rains2: { plantStart: 8, plantEnd: 9, weedStart: 9, weedEnd: 10, harvestStart: 11, harvestEnd: 0 },
    durationDays: 100,
    notes: 'Simsim — high-value oilseed, drought-tolerant. Harvest before pods shatter.',
  },
  {
    crop: 'sunflower', emoji: '🌻', category: 'oilseed',
    rains1: { plantStart: 1, plantEnd: 3, weedStart: 2, weedEnd: 4, harvestStart: 5, harvestEnd: 7 },
    rains2: { plantStart: 8, plantEnd: 9, weedStart: 9, weedEnd: 10, harvestStart: 11, harvestEnd: 0 },
    durationDays: 100,
    notes: 'High oil content varieties (R-SUNCO, Salve) preferred for commercial sale.',
  },
  {
    crop: 'sugarcane', emoji: '🎋', category: 'cash',
    rains1: { plantStart: 1, plantEnd: 3, weedStart: 3, weedEnd: 5, harvestStart: 11, harvestEnd: 2 },
    rains2: null,
    durationDays: 540,
    notes: 'Grown under contract near mills (Busoga, Kakira, Kinyara). 12–18 months to maturity.',
  },
  {
    crop: 'cocoa', emoji: '🍫', category: 'cash',
    rains1: { plantStart: 2, plantEnd: 4, weedStart: 4, weedEnd: 6, harvestStart: 9, harvestEnd: 0 },
    rains2: null,
    durationDays: 365,
    notes: 'Grown in Bundibugyo and West Nile. Needs shade trees when young.',
    zone: 'lowland',
  },
  {
    crop: 'wheat', emoji: '🌾', category: 'cereal',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 4, harvestStart: 6, harvestEnd: 7 },
    rains2: null,
    durationDays: 120,
    notes: 'Highland crop (Kapchorwa, Kabale). Requires cool temperatures to grow well.',
    zone: 'highland',
  },
  {
    crop: 'tomato', emoji: '🍅', category: 'vegetable',
    rains1: null,
    rains2: { plantStart: 6, plantEnd: 8, weedStart: 7, weedEnd: 9, harvestStart: 9, harvestEnd: 11 },
    irrigated: { plantStart: 0, plantEnd: 1, weedStart: 1, weedEnd: 2, harvestStart: 2, harvestEnd: 3 },
    durationDays: 75,
    notes: 'Start seedlings in nursery 4 weeks before transplanting. Needs staking and regular spraying for blight.',
  },
  {
    crop: 'onion', emoji: '🧅', category: 'vegetable',
    rains1: null,
    rains2: { plantStart: 6, plantEnd: 7, weedStart: 8, weedEnd: 9, harvestStart: 10, harvestEnd: 11 },
    irrigated: { plantStart: 11, plantEnd: 0, weedStart: 1, weedEnd: 2, harvestStart: 2, harvestEnd: 3 },
    durationDays: 100,
    notes: 'High-value vegetable, often irrigated in dry season. Nursery raised before transplanting.',
  },
  {
    crop: 'cabbage', emoji: '🥬', category: 'vegetable',
    rains1: { plantStart: 1, plantEnd: 2, weedStart: 2, weedEnd: 3, harvestStart: 4, harvestEnd: 5 },
    rains2: { plantStart: 7, plantEnd: 8, weedStart: 8, weedEnd: 9, harvestStart: 10, harvestEnd: 11 },
    durationDays: 90,
    notes: 'Popular market vegetable — plant in nursery, transplant after 3–4 weeks.',
  },
  {
    crop: 'watermelon', emoji: '🍉', category: 'fruit',
    rains1: { plantStart: 1, plantEnd: 2, weedStart: 2, weedEnd: 3, harvestStart: 4, harvestEnd: 5 },
    rains2: { plantStart: 7, plantEnd: 8, weedStart: 8, weedEnd: 9, harvestStart: 10, harvestEnd: 11 },
    durationDays: 90,
    notes: 'Fast cash crop. Needs well-drained soil and consistent watering while fruiting.',
  },
  {
    crop: 'pineapple', emoji: '🍍', category: 'fruit',
    rains1: { plantStart: 2, plantEnd: 4, weedStart: 4, weedEnd: 6, harvestStart: 11, harvestEnd: 2 },
    rains2: null,
    durationDays: 450,
    notes: 'Grown in Kayunga, Mukono, Luwero. 15–18 months to first harvest.',
  },
  {
    crop: 'mango', emoji: '🥭', category: 'fruit',
    rains1: { plantStart: 2, plantEnd: 4, weedStart: 4, weedEnd: 5, harvestStart: 11, harvestEnd: 1 },
    rains2: null,
    durationDays: 1095,
    notes: 'Fruit tree — 3 years to first harvest, then annual. Grafted varieties fruit faster.',
  },
  {
    crop: 'avocado', emoji: '🥑', category: 'fruit',
    rains1: { plantStart: 2, plantEnd: 4, weedStart: 4, weedEnd: 5, harvestStart: 2, harvestEnd: 5 },
    rains2: null,
    durationDays: 1095,
    notes: 'Fruit tree — Hass variety in high demand for export. 2–3 years to first harvest once grafted.',
  },
  {
    crop: 'passion_fruit', emoji: '🍈', category: 'fruit',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 4, harvestStart: 8, harvestEnd: 11 },
    rains2: null,
    durationDays: 240,
    notes: 'Needs trellising. High market demand for juice processing.',
  },
  {
    crop: 'vanilla', emoji: '🌿', category: 'cash',
    rains1: { plantStart: 2, plantEnd: 4, weedStart: 4, weedEnd: 6, harvestStart: 5, harvestEnd: 7 },
    rains2: null,
    durationDays: 1095,
    notes: 'High-value export crop (Bundibugyo, Mukono). Hand-pollination required; 3 years to first harvest.',
  },
  {
    crop: 'chili', emoji: '🌶️', category: 'vegetable',
    rains1: { plantStart: 1, plantEnd: 2, weedStart: 2, weedEnd: 3, harvestStart: 4, harvestEnd: 6 },
    rains2: { plantStart: 7, plantEnd: 8, weedStart: 8, weedEnd: 9, harvestStart: 10, harvestEnd: 0 },
    durationDays: 100,
    notes: 'Bird’s eye chili — export cash crop. Multiple harvests once fruiting starts.',
  },
];

export interface PlantingAlert {
  crop: string;
  emoji: string;
  type: 'plant_now' | 'weed_now' | 'harvest_now' | 'plant_soon' | 'harvest_soon' | 'prepare';
  title: string;
  message: string;
  urgency: 'high' | 'medium' | 'low';
  daysUntil: number;
  season: 'rains1' | 'rains2' | 'irrigated';
}

const SEASON_LABEL: Record<'rains1' | 'rains2' | 'irrigated', string> = {
  rains1: 'March–May rains',
  rains2: 'September–November rains',
  irrigated: 'irrigated/dry-season',
};

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
    for (const [seasonKey, window] of [['rains1', cal.rains1], ['rains2', cal.rains2], ['irrigated', cal.irrigated]] as const) {
      if (!window) continue;

      const { plantStart, plantEnd, weedStart, weedEnd, harvestStart, harvestEnd } = window;
      const label = SEASON_LABEL[seasonKey];

      // Is it currently planting time?
      if (isInWindow(month, plantStart, plantEnd)) {
        const daysLeft = daysUntilEnd(month, day, plantEnd);
        alerts.push({
          crop: cal.crop, emoji: cal.emoji,
          type: 'plant_now',
          title: `Plant ${capitalize(cal.crop)} Now`,
          message: `${label}: planting window is open — ${daysLeft} days remaining. ${cal.notes}`,
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
            title: daysUntilPlant <= 7 ? `Prepare to Plant ${capitalize(cal.crop)}` : `${capitalize(cal.crop)} planting in ${daysUntilPlant} days`,
            message: daysUntilPlant <= 7
              ? `Planting window opens in ${daysUntilPlant} days (${label}). Get seeds and prepare land now.`
              : `Start land preparation. Buy ${cal.crop} seeds. ${cal.notes}`,
            urgency: daysUntilPlant <= 7 ? 'high' : 'low',
            daysUntil: daysUntilPlant,
            season: seasonKey,
          });
        }
      }

      // Is it weeding time?
      if (isInWindow(month, weedStart, weedEnd)) {
        const daysLeft = daysUntilEnd(month, day, weedEnd);
        alerts.push({
          crop: cal.crop, emoji: cal.emoji,
          type: 'weed_now',
          title: `Weed Your ${capitalize(cal.crop)}`,
          message: `${label}: this is the critical weeding window — ${daysLeft} days left. Weeding now protects your yield the most.`,
          urgency: daysLeft <= 7 ? 'high' : 'medium',
          daysUntil: 0,
          season: seasonKey,
        });
      }

      // Is it harvest time?
      if (isInWindow(month, harvestStart, harvestEnd)) {
        const daysLeft = daysUntilEnd(month, day, harvestEnd);
        alerts.push({
          crop: cal.crop, emoji: cal.emoji,
          type: 'harvest_now',
          title: `Harvest ${capitalize(cal.crop)}`,
          message: `${label} crop should be ready. Check for maturity signs. ${daysLeft} days left in window.`,
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
  phase: 'planting' | 'weeding' | 'harvest' | 'dry';
  crops: string[];
  action: string;
  nextSeason: string;
  daysToNextSeason: number;
} {
  // First rains peak: Mar–May | Second rains peak: Sep–Nov
  const isRains1 = month >= 2 && month <= 5;
  const isRains2 = month >= 8 && month <= 11;
  const isDry2   = month >= 5 && month <= 8; // Jun–Aug, between the two rains

  if (isRains1) {
    const phase: 'planting' | 'weeding' | 'harvest' = month <= 2 ? 'planting' : month <= 4 ? 'weeding' : 'harvest';
    return {
      name: 'Rainy Season (March–May)',
      phase,
      crops: ['Maize', 'Beans', 'Groundnuts', 'Sunflower', 'Sorghum'],
      action: phase === 'planting' ? 'Plant maize and beans now. Apply basal DAP fertilizer.' : phase === 'weeding' ? 'Weed and top-dress maize with CAN. Monitor for armyworm.' : 'Begin harvesting maize. Dry beans to 14% moisture.',
      nextSeason: 'Dry Season (June–August)',
      daysToNextSeason: Math.round((new Date(new Date().getFullYear(), 5, 1).getTime() - Date.now()) / 86400000),
    };
  }

  if (isRains2) {
    const phase: 'planting' | 'weeding' | 'harvest' = month <= 8 ? 'planting' : month <= 10 ? 'weeding' : 'harvest';
    return {
      name: 'Rainy Season (September–November)',
      phase,
      crops: ['Beans', 'Sweet Potato', 'Cassava', 'Sorghum', 'Tomato'],
      action: phase === 'planting' ? 'Plant short-cycle crops. Prepare tomato nurseries.' : phase === 'weeding' ? 'Weed and mulch. Monitor for late blight on tomatoes.' : 'Harvest beans and sweet potatoes. Store properly.',
      nextSeason: 'Dry Season (December–February)',
      daysToNextSeason: Math.round((new Date(new Date().getFullYear() + 1, 11, 1).getTime() - Date.now()) / 86400000),
    };
  }

  if (isDry2) {
    return {
      name: 'Dry Season (June–August)',
      phase: 'dry',
      crops: ['Tomato (irrigated)', 'Onion', 'Watermelon', 'Sweet Potato'],
      action: 'Harvest March–May crops. Dry and store maize properly. Prepare for the September rains.',
      nextSeason: 'Rainy Season (September–November)',
      daysToNextSeason: Math.round((new Date(new Date().getFullYear(), 8, 1).getTime() - Date.now()) / 86400000),
    };
  }

  // Dec–Feb
  return {
    name: 'Dry Season (December–February)',
    phase: 'dry',
    crops: ['Onion (irrigated)', 'Tomato (irrigated)', 'Watermelon', 'Chili'],
    action: 'Harvest September–November crops. Prepare land for the March rains. Buy seeds and fertilizer.',
    nextSeason: 'Rainy Season (March–May)',
    daysToNextSeason: Math.round((new Date(new Date().getFullYear(), 2, 1).getTime() - Date.now()) / 86400000),
  };
}

/** All crop keys tracked by the planting calendar — the single source of
 * truth other pages (listing forms, group-listing forms) should draw their
 * crop dropdowns from, so a crop with calendar data is always listable. */
export const ALL_CROP_KEYS = PLANTING_CALENDAR.map(c => c.crop);
