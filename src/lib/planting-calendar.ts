import {
  detectClimateZone,
  type LocationContext,
  type ClimateZone,
} from './agri-intel';

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
    crop: 'maize', emoji: '', category: 'cereal',
    rains1: { plantStart: 1, plantEnd: 2, weedStart: 2, weedEnd: 3, harvestStart: 5, harvestEnd: 6 },
    rains2: { plantStart: 7, plantEnd: 8, weedStart: 8, weedEnd: 9, harvestStart: 11, harvestEnd: 0 },
    durationDays: 120,
    notes: 'Short-cycle varieties (90 days) best for the second rains. Apply DAP at planting; top-dress with CAN at weeding.',
  },
  {
    crop: 'beans', emoji: '', category: 'legume',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 3, harvestStart: 4, harvestEnd: 5 },
    rains2: { plantStart: 8, plantEnd: 9, weedStart: 9, weedEnd: 9, harvestStart: 10, harvestEnd: 11 },
    durationDays: 75,
    notes: 'Intercrop with maize in the first rains. Climbing varieties need staking. Weed once, 3 weeks after planting.',
  },
  {
    crop: 'groundnuts', emoji: '', category: 'legume',
    rains1: { plantStart: 1, plantEnd: 3, weedStart: 2, weedEnd: 4, harvestStart: 5, harvestEnd: 6 },
    rains2: { plantStart: 8, plantEnd: 9, weedStart: 9, weedEnd: 10, harvestStart: 11, harvestEnd: 11 },
    durationDays: 100,
    notes: 'Requires well-drained soils. Inoculate seed with Rhizobium for best yield.',
  },
  {
    crop: 'sorghum', emoji: '', category: 'cereal',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 4, harvestStart: 6, harvestEnd: 7 },
    rains2: { plantStart: 8, plantEnd: 9, weedStart: 9, weedEnd: 10, harvestStart: 11, harvestEnd: 11 },
    durationDays: 120,
    notes: 'Drought-tolerant. Best for semi-arid zones (Northern Uganda, Soroti, Kiruhura).',
    zone: 'all',
  },
  {
    crop: 'millet', emoji: '', category: 'cereal',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 4, harvestStart: 6, harvestEnd: 7 },
    rains2: { plantStart: 8, plantEnd: 9, weedStart: 9, weedEnd: 10, harvestStart: 11, harvestEnd: 11 },
    durationDays: 110,
    notes: 'Finger millet — very drought-tolerant, common in Eastern and Northern Uganda. Weed twice for best yield.',
    zone: 'all',
  },
  {
    crop: 'rice', emoji: '', category: 'cereal',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 4, harvestStart: 6, harvestEnd: 7 },
    rains2: null,
    durationDays: 130,
    notes: 'Requires lowland or irrigated areas. Best in Doho, Kibimba, and lakeside zones.',
    zone: 'lowland',
  },
  {
    crop: 'cassava', emoji: '', category: 'root',
    rains1: { plantStart: 1, plantEnd: 3, weedStart: 3, weedEnd: 4, harvestStart: 10, harvestEnd: 2 },
    rains2: { plantStart: 8, plantEnd: 9, weedStart: 9, weedEnd: 10, harvestStart: 4, harvestEnd: 8 },
    durationDays: 270,
    notes: 'Long-cycle crop (9–18 months). Use virus-free certified cuttings.',
  },
  {
    crop: 'sweet_potatoes', emoji: '', category: 'root',
    rains1: { plantStart: 2, plantEnd: 4, weedStart: 3, weedEnd: 5, harvestStart: 5, harvestEnd: 7 },
    rains2: { plantStart: 8, plantEnd: 10, weedStart: 9, weedEnd: 11, harvestStart: 11, harvestEnd: 11 },
    durationDays: 90,
    notes: 'Vines need 30–45 cm spacing. Orange-flesh varieties have high market value.',
  },
  {
    crop: 'irish_potatoes', emoji: '', category: 'root',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 4, harvestStart: 5, harvestEnd: 6 },
    rains2: { plantStart: 8, plantEnd: 9, weedStart: 9, weedEnd: 10, harvestStart: 11, harvestEnd: 0 },
    durationDays: 100,
    notes: 'Highland crop — Kabale, Kisoro, Mbale, Kapchorwa. Earth up (hill) at weeding stage.',
    zone: 'highland',
  },
  {
    crop: 'yams', emoji: '', category: 'root',
    rains1: { plantStart: 1, plantEnd: 3, weedStart: 3, weedEnd: 5, harvestStart: 9, harvestEnd: 11 },
    rains2: null,
    durationDays: 240,
    notes: 'Stake vines for support. Common in Northern and Eastern Uganda.',
  },
  {
    crop: 'banana', emoji: '', category: 'fruit',
    rains1: { plantStart: 2, plantEnd: 5, weedStart: 4, weedEnd: 6, harvestStart: 9, harvestEnd: 1 },
    rains2: null,
    durationDays: 270,
    notes: 'Plant at start of the first rains. Matooke produces year-round once established.',
    zone: 'highland',
  },
  {
    crop: 'coffee', emoji: '', category: 'cash',
    rains1: { plantStart: 3, plantEnd: 5, weedStart: 5, weedEnd: 6, harvestStart: 9, harvestEnd: 1 },
    rains2: null,
    durationDays: 365,
    notes: 'Robusta: lowland/central. Arabica: highland. 3 years to first harvest. Weed and mulch each rains.',
  },
  {
    crop: 'tea', emoji: '', category: 'cash',
    rains1: { plantStart: 3, plantEnd: 5, weedStart: 5, weedEnd: 6, harvestStart: 0, harvestEnd: 11 },
    rains2: null,
    durationDays: 730,
    notes: 'Highland perennial (Kabale, Bushenyi, Mityana). Plucked year-round every 7–14 days once mature.',
    zone: 'highland',
  },
  {
    crop: 'cotton', emoji: '', category: 'cash',
    rains1: { plantStart: 3, plantEnd: 4, weedStart: 4, weedEnd: 5, harvestStart: 8, harvestEnd: 10 },
    rains2: null,
    durationDays: 180,
    notes: 'Major cash crop in Northern and Eastern Uganda. Spray for bollworm during flowering.',
  },
  {
    crop: 'tobacco', emoji: '', category: 'cash',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 4, harvestStart: 6, harvestEnd: 8 },
    rains2: null,
    durationDays: 150,
    notes: 'Grown under contract in West Nile and Mid-Western Uganda. Nursery raised 6–8 weeks before transplanting.',
  },
  {
    crop: 'soybeans', emoji: '', category: 'legume',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 4, harvestStart: 6, harvestEnd: 7 },
    rains2: { plantStart: 8, plantEnd: 9, weedStart: 9, weedEnd: 10, harvestStart: 11, harvestEnd: 11 },
    durationDays: 100,
    notes: 'Growing demand for oil and animal feed processing. Inoculate seed for better nodulation.',
  },
  {
    crop: 'cowpeas', emoji: '', category: 'legume',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 3, harvestStart: 4, harvestEnd: 5 },
    rains2: { plantStart: 8, plantEnd: 9, weedStart: 9, weedEnd: 9, harvestStart: 10, harvestEnd: 11 },
    durationDays: 70,
    notes: 'Drought-tolerant, dual-purpose (grain + leafy vegetable). Good for semi-arid areas.',
  },
  {
    crop: 'pigeon_peas', emoji: '', category: 'legume',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 4, harvestStart: 9, harvestEnd: 11 },
    rains2: null,
    durationDays: 240,
    notes: 'Long-duration legume, improves soil fertility. Common intercrop in Eastern Uganda.',
  },
  {
    crop: 'sesame', emoji: '', category: 'oilseed',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 4, harvestStart: 5, harvestEnd: 6 },
    rains2: { plantStart: 8, plantEnd: 9, weedStart: 9, weedEnd: 10, harvestStart: 11, harvestEnd: 0 },
    durationDays: 100,
    notes: 'Simsim — high-value oilseed, drought-tolerant. Harvest before pods shatter.',
  },
  {
    crop: 'sunflower', emoji: '', category: 'oilseed',
    rains1: { plantStart: 1, plantEnd: 3, weedStart: 2, weedEnd: 4, harvestStart: 5, harvestEnd: 7 },
    rains2: { plantStart: 8, plantEnd: 9, weedStart: 9, weedEnd: 10, harvestStart: 11, harvestEnd: 0 },
    durationDays: 100,
    notes: 'High oil content varieties (R-SUNCO, Salve) preferred for commercial sale.',
  },
  {
    crop: 'sugarcane', emoji: '', category: 'cash',
    rains1: { plantStart: 1, plantEnd: 3, weedStart: 3, weedEnd: 5, harvestStart: 11, harvestEnd: 2 },
    rains2: null,
    durationDays: 540,
    notes: 'Grown under contract near mills (Busoga, Kakira, Kinyara). 12–18 months to maturity.',
  },
  {
    crop: 'cocoa', emoji: '', category: 'cash',
    rains1: { plantStart: 2, plantEnd: 4, weedStart: 4, weedEnd: 6, harvestStart: 9, harvestEnd: 0 },
    rains2: null,
    durationDays: 365,
    notes: 'Grown in Bundibugyo and West Nile. Needs shade trees when young.',
    zone: 'lowland',
  },
  {
    crop: 'wheat', emoji: '', category: 'cereal',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 4, harvestStart: 6, harvestEnd: 7 },
    rains2: null,
    durationDays: 120,
    notes: 'Highland crop (Kapchorwa, Kabale). Requires cool temperatures to grow well.',
    zone: 'highland',
  },
  {
    crop: 'tomato', emoji: '', category: 'vegetable',
    rains1: null,
    rains2: { plantStart: 6, plantEnd: 8, weedStart: 7, weedEnd: 9, harvestStart: 9, harvestEnd: 11 },
    irrigated: { plantStart: 0, plantEnd: 1, weedStart: 1, weedEnd: 2, harvestStart: 2, harvestEnd: 3 },
    durationDays: 75,
    notes: 'Start seedlings in nursery 4 weeks before transplanting. Needs staking and regular spraying for blight.',
  },
  {
    crop: 'onion', emoji: '', category: 'vegetable',
    rains1: null,
    rains2: { plantStart: 6, plantEnd: 7, weedStart: 8, weedEnd: 9, harvestStart: 10, harvestEnd: 11 },
    irrigated: { plantStart: 11, plantEnd: 0, weedStart: 1, weedEnd: 2, harvestStart: 2, harvestEnd: 3 },
    durationDays: 100,
    notes: 'High-value vegetable, often irrigated in dry season. Nursery raised before transplanting.',
  },
  {
    crop: 'cabbage', emoji: '', category: 'vegetable',
    rains1: { plantStart: 1, plantEnd: 2, weedStart: 2, weedEnd: 3, harvestStart: 4, harvestEnd: 5 },
    rains2: { plantStart: 7, plantEnd: 8, weedStart: 8, weedEnd: 9, harvestStart: 10, harvestEnd: 11 },
    durationDays: 90,
    notes: 'Popular market vegetable — plant in nursery, transplant after 3–4 weeks.',
  },
  {
    crop: 'watermelon', emoji: '', category: 'fruit',
    rains1: { plantStart: 1, plantEnd: 2, weedStart: 2, weedEnd: 3, harvestStart: 4, harvestEnd: 5 },
    rains2: { plantStart: 7, plantEnd: 8, weedStart: 8, weedEnd: 9, harvestStart: 10, harvestEnd: 11 },
    durationDays: 90,
    notes: 'Fast cash crop. Needs well-drained soil and consistent watering while fruiting.',
  },
  {
    crop: 'pineapple', emoji: '', category: 'fruit',
    rains1: { plantStart: 2, plantEnd: 4, weedStart: 4, weedEnd: 6, harvestStart: 11, harvestEnd: 2 },
    rains2: null,
    durationDays: 450,
    notes: 'Grown in Kayunga, Mukono, Luwero. 15–18 months to first harvest.',
  },
  {
    crop: 'mango', emoji: '', category: 'fruit',
    rains1: { plantStart: 2, plantEnd: 4, weedStart: 4, weedEnd: 5, harvestStart: 11, harvestEnd: 1 },
    rains2: null,
    durationDays: 1095,
    notes: 'Fruit tree — 3 years to first harvest, then annual. Grafted varieties fruit faster.',
  },
  {
    crop: 'avocado', emoji: '', category: 'fruit',
    rains1: { plantStart: 2, plantEnd: 4, weedStart: 4, weedEnd: 5, harvestStart: 2, harvestEnd: 5 },
    rains2: null,
    durationDays: 1095,
    notes: 'Fruit tree — Hass variety in high demand for export. 2–3 years to first harvest once grafted.',
  },
  {
    crop: 'passion_fruit', emoji: '', category: 'fruit',
    rains1: { plantStart: 2, plantEnd: 3, weedStart: 3, weedEnd: 4, harvestStart: 8, harvestEnd: 11 },
    rains2: null,
    durationDays: 240,
    notes: 'Needs trellising. High market demand for juice processing.',
  },
  {
    crop: 'vanilla', emoji: '', category: 'cash',
    rains1: { plantStart: 2, plantEnd: 4, weedStart: 4, weedEnd: 6, harvestStart: 5, harvestEnd: 7 },
    rains2: null,
    durationDays: 1095,
    notes: 'High-value export crop (Bundibugyo, Mukono). Hand-pollination required; 3 years to first harvest.',
  },
  {
    crop: 'chili', emoji: '', category: 'vegetable',
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
  windowDates?: string;
  daysRemaining?: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatMonthWindow(startMonth: number, endMonth: number): string {
  return `${MONTH_NAMES[startMonth]} – ${MONTH_NAMES[endMonth]}`;
}

const SEASON_LABEL: Record<'rains1' | 'rains2' | 'irrigated', string> = {
  rains1: 'First Wet Season (March–May)',
  rains2: 'Second Wet Season (August–November)',
  irrigated: 'Dry Season (Irrigated)',
};

export function generatePlantingAlerts(
  month: number,
  day: number,
  farmerCrops: string[],
  loc?: LocationContext,
): PlantingAlert[] {
  const alerts: PlantingAlert[] = [];
  const zone = detectClimateZone(loc);

  if (zone === 'temperate_north') {
    // Europe / North America temperate alerting
    const userCrops = farmerCrops.map(c => c.toLowerCase());
    const wants = (name: string) => userCrops.length === 0 || userCrops.some(c => c.includes(name));

    // Autumn (Sep–Nov, months 8, 9, 10)
    if (month >= 8 && month <= 10) {
      if (wants('wheat')) {
        alerts.push({
          crop: 'wheat', emoji: '',
          type: 'plant_now',
          title: 'Drill Winter Wheat',
          message: 'Autumn drilling window is open for winter wheat. Ensure good seedbed consolidation and apply pre-emergence weed control.',
          urgency: 'high',
          daysUntil: 0,
          season: 'rains2',
        });
      }
      if (wants('barley')) {
        alerts.push({
          crop: 'barley', emoji: '',
          type: 'plant_now',
          title: 'Drill Winter Barley',
          message: 'Drill winter barley early in autumn to establish strong root systems ahead of winter frost.',
          urgency: 'medium',
          daysUntil: 0,
          season: 'rains2',
        });
      }
      if (wants('maize') || wants('corn')) {
        alerts.push({
          crop: 'maize', emoji: '',
          type: 'harvest_now',
          title: 'Harvest Grain & Silage Maize',
          message: 'Combine grain maize as dry matter reaches 65-70%. Store at under 14% moisture.',
          urgency: 'high',
          daysUntil: 0,
          season: 'rains2',
        });
      }
      if (wants('potato') || wants('irish_potatoes')) {
        alerts.push({
          crop: 'irish_potatoes', emoji: '',
          type: 'harvest_now',
          title: 'Lift Maincrop Potatoes',
          message: 'Complete potato lifting before ground temperatures drop below 8°C to prevent tuber bruising and rot.',
          urgency: 'high',
          daysUntil: 0,
          season: 'rains2',
        });
      }
    }
    // Winter (Dec–Feb, months 11, 0, 1)
    else if (month === 11 || month === 0 || month === 1) {
      alerts.push({
        crop: 'wheat', emoji: '',
        type: 'prepare',
        title: 'Winter Crop Dormancy Monitoring',
        message: 'Monitor winter cereals for waterlogging and frost heave. Service combine harvesters and calibrate sprayers.',
        urgency: 'low',
        daysUntil: 0,
        season: 'irrigated',
      });
      if (wants('barley') || wants('oats') || wants('maize')) {
        alerts.push({
          crop: 'barley', emoji: '',
          type: 'prepare',
          title: 'Prepare Spring Drilling Plan',
          message: 'Finalize certified seed orders for spring barley, peas, and sugar beet. Test soil pH and P/K reserves.',
          urgency: 'low',
          daysUntil: 21,
          season: 'irrigated',
        });
      }
    }
    // Spring (Mar–May, months 2, 3, 4)
    else if (month >= 2 && month <= 4) {
      if (wants('barley') || wants('oats')) {
        alerts.push({
          crop: 'barley', emoji: '',
          type: 'plant_now',
          title: 'Drill Spring Barley & Oats',
          message: 'Spring drilling window active as soil warms above 6°C. Cultivate seedbeds evenly.',
          urgency: 'high',
          daysUntil: 0,
          season: 'rains1',
        });
      }
      if (wants('potato') || wants('irish_potatoes')) {
        alerts.push({
          crop: 'irish_potatoes', emoji: '',
          type: 'plant_now',
          title: 'Plant Seed Potatoes',
          message: 'Plant sprouted seed tubers into warm, well-aerated ridges. Protect from late spring frost.',
          urgency: 'high',
          daysUntil: 0,
          season: 'rains1',
        });
      }
      if (wants('wheat')) {
        alerts.push({
          crop: 'wheat', emoji: '',
          type: 'weed_now',
          title: 'Spring Top-Dressing on Winter Wheat',
          message: 'Apply first nitrogen split as active spring tillering begins (GS30-31).',
          urgency: 'high',
          daysUntil: 0,
          season: 'rains1',
        });
      }
      if (wants('maize') || wants('corn')) {
        alerts.push({
          crop: 'maize', emoji: '',
          type: month >= 3 ? 'plant_now' : 'plant_soon',
          title: month >= 3 ? 'Drill Maize / Corn' : 'Prepare for Maize Drilling',
          message: 'Drill maize when soil temperature reaches a steady 8-10°C.',
          urgency: 'medium',
          daysUntil: month >= 3 ? 0 : 14,
          season: 'rains1',
        });
      }
    }
    // Summer (Jun–Aug, months 5, 6, 7)
    else if (month >= 5 && month <= 7) {
      if (wants('barley') || wants('wheat')) {
        alerts.push({
          crop: 'wheat', emoji: '',
          type: 'harvest_now',
          title: 'Summer Grain Combine Harvest',
          message: 'Combine winter barley and wheat as moisture drops below 15%. Bale straw immediately after combine.',
          urgency: 'high',
          daysUntil: 0,
          season: 'rains1',
        });
      }
      if (wants('vegetable') || wants('tomato') || wants('cabbage')) {
        alerts.push({
          crop: 'tomato', emoji: '',
          type: 'weed_now',
          title: 'Summer Irrigation & Heat Protection',
          message: 'Maintain drip irrigation during peak evapotranspiration. Mulch vegetables to prevent soil drying.',
          urgency: 'medium',
          daysUntil: 0,
          season: 'irrigated',
        });
      }
    }

    if (alerts.length > 0) {
      return alerts.slice(0, 8);
    }
  }

  // Tropical Africa & General Fallback (Uganda / East Africa)
  const checkCrops = farmerCrops.length > 0
    ? PLANTING_CALENDAR.filter(c => farmerCrops.includes(c.crop))
    : PLANTING_CALENDAR;

  for (const cal of checkCrops) {
    for (const [seasonKey, window] of [['rains1', cal.rains1], ['rains2', cal.rains2], ['irrigated', cal.irrigated]] as const) {
      if (!window) continue;

      const { plantStart, plantEnd, weedStart, weedEnd, harvestStart, harvestEnd } = window;
      const label = SEASON_LABEL[seasonKey];
      const plantDates = formatMonthWindow(plantStart, plantEnd);
      const weedDates = formatMonthWindow(weedStart, weedEnd);
      const harvestDates = formatMonthWindow(harvestStart, harvestEnd);

      // Is it currently planting time?
      if (isInWindow(month, plantStart, plantEnd)) {
        const daysLeft = daysUntilEnd(month, day, plantEnd);
        alerts.push({
          crop: cal.crop, emoji: cal.emoji,
          type: 'plant_now',
          title: daysLeft <= 10
            ? `Plant ${capitalize(cal.crop)} Now (${daysLeft}d left)`
            : `Plant ${capitalize(cal.crop)} Now`,
          message: `${label} (${plantDates}) · ${daysLeft} days remaining in planting window. ${cal.notes}`,
          urgency: daysLeft <= 14 ? 'high' : 'medium',
          daysUntil: 0,
          season: seasonKey,
          windowDates: plantDates,
          daysRemaining: daysLeft,
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
              ? `Planting window opens in ${daysUntilPlant} days (${plantDates} · ${label}). Get seeds and prepare land now.`
              : `Start land preparation for ${plantDates} window. Buy certified ${cal.crop} seeds. ${cal.notes}`,
            urgency: daysUntilPlant <= 7 ? 'high' : 'low',
            daysUntil: daysUntilPlant,
            season: seasonKey,
            windowDates: plantDates,
            daysRemaining: daysUntilPlant,
          });
        }
      }

      // Is it weeding time?
      if (isInWindow(month, weedStart, weedEnd)) {
        const daysLeft = daysUntilEnd(month, day, weedEnd);
        alerts.push({
          crop: cal.crop, emoji: cal.emoji,
          type: 'weed_now',
          title: `Weed Your ${capitalize(cal.crop)} (${daysLeft}d left)`,
          message: `${label} (${weedDates}) · Critical weeding window closes in ${daysLeft} days. Weeding now protects maximum yield.`,
          urgency: daysLeft <= 7 ? 'high' : 'medium',
          daysUntil: 0,
          season: seasonKey,
          windowDates: weedDates,
          daysRemaining: daysLeft,
        });
      }

      // Is it harvest time?
      if (isInWindow(month, harvestStart, harvestEnd)) {
        const daysLeft = daysUntilEnd(month, day, harvestEnd);
        alerts.push({
          crop: cal.crop, emoji: cal.emoji,
          type: 'harvest_now',
          title: `Harvest ${capitalize(cal.crop)} (${daysLeft}d left)`,
          message: `${label} (${harvestDates}) · Crop is mature. ${daysLeft} days left in harvest window. Dry thoroughly to prevent mold.`,
          urgency: 'medium',
          daysUntil: 0,
          season: seasonKey,
          windowDates: harvestDates,
          daysRemaining: daysLeft,
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

export function getCurrentSeasonSummary(month: number, loc?: LocationContext): {
  name: string;
  phase: 'planting' | 'weeding' | 'harvest' | 'dry' | 'growing' | 'dormant';
  crops: string[];
  action: string;
  nextSeason: string;
  daysToNextSeason: number;
  climateZone?: ClimateZone;
  zoneName?: string;
} {
  const zone = detectClimateZone(loc);

  if (zone === 'temperate_north') {
    // Europe & North America (4 astronomical/meteorological seasons)
    const isSpring = month >= 2 && month <= 4;  // Mar–May
    const isSummer = month >= 5 && month <= 7;  // Jun–Aug
    const isAutumn = month >= 8 && month <= 10; // Sep–Nov
    // Winter: Dec–Feb (11, 0, 1)

    if (isAutumn) {
      return {
        name: 'Autumn / Fall (September–November)',
        phase: month <= 8 ? 'harvest' : 'planting',
        crops: ['Winter Wheat', 'Winter Barley', 'Oilseed Rape', 'Maize / Corn', 'Sugar Beet', 'Apples'],
        action: 'Drill winter cereals and cover crops. Combine grain maize and lift late root crops before winter frosts.',
        nextSeason: 'Winter (December–February)',
        daysToNextSeason: Math.max(0, Math.round((new Date(new Date().getFullYear(), 11, 1).getTime() - Date.now()) / 86400000)),
        climateZone: zone,
        zoneName: 'Europe & Northern Temperate',
      };
    }

    if (isSpring) {
      return {
        name: 'Spring (March–May)',
        phase: 'planting',
        crops: ['Spring Barley', 'Sugar Beet', 'Potatoes', 'Oats', 'Peas', 'Maize', 'Sunflowers'],
        action: 'Cultivate and drill spring crops once soil warms above 6-8°C. Top-dress winter cereals with early nitrogen.',
        nextSeason: 'Summer (June–August)',
        daysToNextSeason: Math.max(0, Math.round((new Date(new Date().getFullYear(), 5, 1).getTime() - Date.now()) / 86400000)),
        climateZone: zone,
        zoneName: 'Europe & Northern Temperate',
      };
    }

    if (isSummer) {
      return {
        name: 'Summer (June–August)',
        phase: month >= 6 ? 'harvest' : 'growing',
        crops: ['Winter Barley', 'Oilseed Rape', 'Winter Wheat', 'Silage Crops', 'Vegetables'],
        action: 'Combine winter barley and oilseed rape. Monitor wheat ripening, bale straw, and manage heat stress.',
        nextSeason: 'Autumn / Fall (September–November)',
        daysToNextSeason: Math.max(0, Math.round((new Date(new Date().getFullYear(), 8, 1).getTime() - Date.now()) / 86400000)),
        climateZone: zone,
        zoneName: 'Europe & Northern Temperate',
      };
    }

    // Winter (Dec–Feb)
    const now = new Date();
    const targetYear = month === 11 ? now.getFullYear() + 1 : now.getFullYear();
    return {
      name: 'Winter (December–February)',
      phase: 'dormant',
      crops: ['Winter Cereals', 'Winter Rye', 'Overwintering Greens', 'Garlic'],
      action: 'Winter dormancy and field rest. Service tractors and implements, test grain storage moisture, and plan spring rotations.',
      nextSeason: 'Spring (March–May)',
      daysToNextSeason: Math.max(0, Math.round((new Date(targetYear, 2, 1).getTime() - Date.now()) / 86400000)),
      climateZone: zone,
      zoneName: 'Europe & Northern Temperate',
    };
  }

  if (zone === 'temperate_south') {
    // Southern Hemisphere (Australia, South Africa, Southern South America)
    const isSpring = month >= 8 && month <= 10; // Sep–Nov
    const isSummer = month === 11 || month === 0 || month === 1; // Dec–Feb
    const isAutumn = month >= 2 && month <= 4;  // Mar–May
    // Winter: Jun–Aug (5, 6, 7)

    if (isSpring) {
      return {
        name: 'Spring (September–November)',
        phase: 'planting',
        crops: ['Spring Cereals', 'Corn / Maize', 'Sunflower', 'Soybeans', 'Pasture'],
        action: 'Spring sowing and active pasture growth. Drill summer grains and monitor soil moisture.',
        nextSeason: 'Summer (December–February)',
        daysToNextSeason: Math.max(0, Math.round((new Date(new Date().getFullYear(), 11, 1).getTime() - Date.now()) / 86400000)),
        climateZone: zone,
        zoneName: 'Southern Hemisphere Temperate',
      };
    }

    if (isSummer) {
      const now = new Date();
      const targetYear = month === 11 ? now.getFullYear() + 1 : now.getFullYear();
      return {
        name: 'Summer (December–February)',
        phase: 'harvest',
        crops: ['Winter Wheat (harvest)', 'Barley', 'Sorghum', 'Grapes', 'Stone Fruit'],
        action: 'Harvest winter grains and manage intensive irrigation during high heat conditions.',
        nextSeason: 'Autumn / Fall (March–May)',
        daysToNextSeason: Math.max(0, Math.round((new Date(targetYear, 2, 1).getTime() - Date.now()) / 86400000)),
        climateZone: zone,
        zoneName: 'Southern Hemisphere Temperate',
      };
    }

    if (isAutumn) {
      return {
        name: 'Autumn / Fall (March–May)',
        phase: 'planting',
        crops: ['Winter Wheat', 'Winter Barley', 'Canola', 'Lupins', 'Faba Beans'],
        action: 'Sow winter grains and canola following the autumn break rains. Pre-emergence weed control.',
        nextSeason: 'Winter (June–August)',
        daysToNextSeason: Math.max(0, Math.round((new Date(new Date().getFullYear(), 5, 1).getTime() - Date.now()) / 86400000)),
        climateZone: zone,
        zoneName: 'Southern Hemisphere Temperate',
      };
    }

    // Winter (Jun–Aug)
    return {
      name: 'Winter (June–August)',
      phase: 'growing',
      crops: ['Winter Cereals', 'Winter Pastures'],
      action: 'Winter crop establishment, selective in-crop spraying, and nitrogen top-dressing.',
      nextSeason: 'Spring (September–November)',
      daysToNextSeason: Math.max(0, Math.round((new Date(new Date().getFullYear(), 8, 1).getTime() - Date.now()) / 86400000)),
      climateZone: zone,
      zoneName: 'Southern Hemisphere Temperate',
    };
  }

  // Tropical Africa (Uganda, Kenya, Rwanda, Tanzania bimodal cycle)
  const isRains1 = month >= 2 && month <= 4;   // Mar–May (First Wet Season)
  const isDry1   = month >= 5 && month <= 7;   // Jun–Aug (Mid-Year Dry Season)
  const isRains2 = month >= 8 && month <= 10;  // Sep–Nov (Second Wet Season)
  // Main Dry Season: Dec–Feb (11, 0, 1)

  if (isRains1) {
    const phase: 'planting' | 'weeding' | 'harvest' = month <= 2 ? 'planting' : month <= 3 ? 'weeding' : 'harvest';
    return {
      name: 'First Wet Season (March–May Main Rains)',
      phase,
      crops: ['Maize', 'Beans', 'Groundnuts', 'Sunflower', 'Sorghum', 'Soybeans'],
      action: phase === 'planting'
        ? 'Main planting window: plant maize, beans, groundnuts now. Apply basal DAP/NPK fertilizer.'
        : phase === 'weeding'
        ? 'Weed and top-dress maize with CAN/Urea at knee height (~3 weeks post-germination).'
        : 'Begin harvesting early maize and beans. Sun-dry thoroughly to <13% moisture.',
      nextSeason: 'Mid-Year Dry Season (June–July)',
      daysToNextSeason: Math.max(0, Math.round((new Date(new Date().getFullYear(), 5, 1).getTime() - Date.now()) / 86400000)),
      climateZone: 'tropical_africa',
      zoneName: 'East Africa / Equatorial Belt',
    };
  }

  if (isRains2) {
    const phase: 'planting' | 'weeding' | 'harvest' = month <= 8 ? 'planting' : month <= 9 ? 'weeding' : 'harvest';
    return {
      name: 'Second Wet Season (August–November Second Rains)',
      phase,
      crops: ['Beans', 'Sweet Potato', 'Cassava', 'Sorghum', 'Tomato', 'Cabbage'],
      action: phase === 'planting'
        ? 'Second Wet Season planting of short-cycle crops (beans, sweet potatoes) and vegetable transplants. Mulch to retain soil moisture.'
        : phase === 'weeding'
        ? 'Weed and mulch fields. Monitor for late blight on tomatoes and armyworm on cereals.'
        : 'Harvest beans and short-cycle vegetables. Sun-dry grain thoroughly to prevent aflatoxin.',
      nextSeason: 'Main Dry Season (December–February)',
      daysToNextSeason: Math.max(0, Math.round((new Date(new Date().getFullYear(), 11, 1).getTime() - Date.now()) / 86400000)),
      climateZone: 'tropical_africa',
      zoneName: 'East Africa / Equatorial Belt',
    };
  }

  if (isDry1) {
    return {
      name: 'Mid-Year Dry Season (June–July)',
      phase: 'dry',
      crops: ['Tomato (irrigated)', 'Onion', 'Watermelon', 'Sweet Potato'],
      action: 'Harvest First Wet Season crops. Dry and store maize at <13% moisture. Prepare nurseries and beds for Second Wet Season rains arriving in August.',
      nextSeason: 'Second Wet Season (August–November Second Rains)',
      daysToNextSeason: Math.max(0, Math.round((new Date(new Date().getFullYear(), 8, 1).getTime() - Date.now()) / 86400000)),
      climateZone: 'tropical_africa',
      zoneName: 'East Africa / Equatorial Belt',
    };
  }

  // Dec–Feb (Main Dry Season)
  const now = new Date();
  const targetYear = month === 11 ? now.getFullYear() + 1 : now.getFullYear();
  return {
    name: 'Main Dry Season (December–February)',
    phase: 'dry',
    crops: ['Onion (irrigated)', 'Tomato (irrigated)', 'Watermelon', 'Chili'],
    action: 'Harvest Second Wet Season crops and dry thoroughly. Protect stored produce from pests. Procure certified seeds and fertilizer for the March First Wet Season rains.',
    nextSeason: 'First Wet Season (March–May Main Rains)',
    daysToNextSeason: Math.max(0, Math.round((new Date(targetYear, 2, 1).getTime() - Date.now()) / 86400000)),
    climateZone: 'tropical_africa',
    zoneName: 'East Africa / Equatorial Belt',
  };
}

/** All crop keys tracked by the planting calendar — the single source of
 * truth other pages (listing forms, group-listing forms) should draw their
 * crop dropdowns from, so a crop with calendar data is always listable. */
export const ALL_CROP_KEYS = PLANTING_CALENDAR.map(c => c.crop);

/**
 * Weather cross-check for plant_now / plant_soon alerts only. The calendar
 * is purely climatological (same window every year), but Uganda's rains
 * shift year to year — a farmer told "plant now" when no rain has actually
 * shown up yet is exactly the kind of confusing guidance this guards
 * against. weed_now/harvest_now/harvest_soon/prepare are left untouched
 * since they're less timing-sensitive to short-term rainfall.
 *
 * Threshold: under 10mm of total forecast rain over the next 7 days is
 * treated as "the rain hasn't arrived yet" — a single useful rain event in
 * Uganda is typically 5-15mm, so less than that across a whole week means
 * the ground likely isn't wet enough to plant into. This is a deliberately
 * simple, defensible cutoff, not a precise agronomic figure. 25mm+ over the
 * same window is treated as a healthy signal worth reinforcing.
 */
export function applyWeatherToPlantingAlerts(
  alerts: PlantingAlert[],
  next7DaysForecast: { precipMm: number }[],
): PlantingAlert[] {
  const DRY_THRESHOLD_MM = 10;
  const WET_THRESHOLD_MM = 25;
  const totalMm = next7DaysForecast
    .slice(0, 7)
    .reduce((sum, d) => sum + (d.precipMm ?? 0), 0);

  return alerts.map((alert) => {
    if (alert.type !== 'plant_now' && alert.type !== 'plant_soon') return alert;

    if (totalMm < DRY_THRESHOLD_MM) {
      return {
        ...alert,
        message: `${alert.message} Weather update: very little rain is forecast in your area over the next 7 days (about ${Math.round(totalMm)}mm). The calendar window is open, but the rain hasn't arrived yet — you may want to wait a few days so seeds don't sit in dry soil.`,
      };
    }
    if (totalMm >= WET_THRESHOLD_MM) {
      return {
        ...alert,
        message: `${alert.message} Weather update: good rain is forecast in your area over the next 7 days (about ${Math.round(totalMm)}mm) — conditions look favorable to plant now.`,
      };
    }
    return alert;
  });
}
