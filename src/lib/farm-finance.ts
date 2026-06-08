// Uganda-specific crop financial data. All costs in UGX.

export interface CropFinancialProfile {
  name: string;
  emoji: string;
  seedRateKgPerHa: number;        // kg of seed per hectare (0 = uses cuttings/suckers)
  seedCostUGXPerKg: number;       // cost of 1 kg of seed/planting material
  plantingMaterialNote?: string;  // for crops using cuttings
  plantingMaterialCostPerHa?: number; // direct cost if not seed-based
  yieldKgPerHa: { pessimistic: number; realistic: number; optimistic: number };
  irrigatedYieldMultiplier: number;
  durationDays: number;
  isPerennial: boolean;
  defaultCostsPerHa: {
    landPrep: number;
    dap: number;
    can: number;
    herbicide: number;
    pesticide: number;
    laborPlanting: number;
    laborWeeding: number;
    laborHarvest: number;
    transport: number;
    packaging: number;
  };
  marketPriceTip: string;
  agronomy: string;
}

export const CROP_PROFILES: Record<string, CropFinancialProfile> = {
  maize: {
    name: 'Maize', emoji: '🌽',
    seedRateKgPerHa: 25,
    seedCostUGXPerKg: 5000,
    yieldKgPerHa: { pessimistic: 1500, realistic: 2800, optimistic: 4500 },
    irrigatedYieldMultiplier: 1.35,
    durationDays: 120, isPerennial: false,
    defaultCostsPerHa: {
      landPrep: 350000, dap: 260000, can: 180000,
      herbicide: 80000, pesticide: 120000,
      laborPlanting: 80000, laborWeeding: 250000, laborHarvest: 200000,
      transport: 80000, packaging: 40000,
    },
    marketPriceTip: 'Best prices: dry season (Jul–Aug). Avoid selling immediately after harvest when prices crash.',
    agronomy: 'Apply DAP at planting, CAN at knee-high stage. Use hybrid seed (H614D, Longe 5) for top yields.',
  },
  beans: {
    name: 'Beans', emoji: '🫘',
    seedRateKgPerHa: 90,
    seedCostUGXPerKg: 4500,
    yieldKgPerHa: { pessimistic: 600, realistic: 1000, optimistic: 1600 },
    irrigatedYieldMultiplier: 1.2,
    durationDays: 75, isPerennial: false,
    defaultCostsPerHa: {
      landPrep: 300000, dap: 130000, can: 0,
      herbicide: 50000, pesticide: 100000,
      laborPlanting: 100000, laborWeeding: 200000, laborHarvest: 150000,
      transport: 60000, packaging: 30000,
    },
    marketPriceTip: 'Rose coco beans fetch 20–30% premium over local varieties. Export quality earns up to UGX 5,000/kg.',
    agronomy: 'Inoculate with Rhizobium to fix nitrogen. Intercrop with maize for land-use efficiency.',
  },
  groundnuts: {
    name: 'Groundnuts', emoji: '🥜',
    seedRateKgPerHa: 120,
    seedCostUGXPerKg: 4000,
    yieldKgPerHa: { pessimistic: 700, realistic: 1200, optimistic: 1800 },
    irrigatedYieldMultiplier: 1.25,
    durationDays: 100, isPerennial: false,
    defaultCostsPerHa: {
      landPrep: 300000, dap: 130000, can: 0,
      herbicide: 60000, pesticide: 80000,
      laborPlanting: 120000, laborWeeding: 200000, laborHarvest: 280000,
      transport: 60000, packaging: 30000,
    },
    marketPriceTip: 'Sell shelled groundnuts for 2× the price. BIDCO and local oil mills buy in bulk at UGX 2,500–4,000/kg.',
    agronomy: 'Apply gypsum at flowering for pod filling. Well-drained sandy loam soils are best.',
  },
  sorghum: {
    name: 'Sorghum', emoji: '🌾',
    seedRateKgPerHa: 8,
    seedCostUGXPerKg: 6000,
    yieldKgPerHa: { pessimistic: 1200, realistic: 2000, optimistic: 3200 },
    irrigatedYieldMultiplier: 1.4,
    durationDays: 120, isPerennial: false,
    defaultCostsPerHa: {
      landPrep: 280000, dap: 130000, can: 130000,
      herbicide: 60000, pesticide: 60000,
      laborPlanting: 60000, laborWeeding: 200000, laborHarvest: 150000,
      transport: 60000, packaging: 30000,
    },
    marketPriceTip: 'Uganda Breweries and Nile Breweries are major buyers at UGX 600–800/kg contract price.',
    agronomy: 'Drought-tolerant — ideal for Lira, Soroti, Gulu. Thin to 2 plants per station after emergence.',
  },
  rice: {
    name: 'Rice', emoji: '🌾',
    seedRateKgPerHa: 80,
    seedCostUGXPerKg: 3500,
    yieldKgPerHa: { pessimistic: 2000, realistic: 3500, optimistic: 5500 },
    irrigatedYieldMultiplier: 1.5,
    durationDays: 130, isPerennial: false,
    defaultCostsPerHa: {
      landPrep: 500000, dap: 260000, can: 200000,
      herbicide: 100000, pesticide: 120000,
      laborPlanting: 200000, laborWeeding: 280000, laborHarvest: 200000,
      transport: 100000, packaging: 60000,
    },
    marketPriceTip: 'Milled rice commands UGX 2,800–3,200/kg retail. A 50kg bag mills to ~35kg white rice.',
    agronomy: 'Use certified seed (WITA 9, Komboka). Level paddy field carefully. Maintain 5cm flood depth after transplanting.',
  },
  cassava: {
    name: 'Cassava', emoji: '🥔',
    seedRateKgPerHa: 0,
    seedCostUGXPerKg: 0,
    plantingMaterialNote: '~4,000 stems per hectare at 1m×1m spacing',
    plantingMaterialCostPerHa: 200000,
    yieldKgPerHa: { pessimistic: 8000, realistic: 15000, optimistic: 25000 },
    irrigatedYieldMultiplier: 1.1,
    durationDays: 270, isPerennial: false,
    defaultCostsPerHa: {
      landPrep: 380000, dap: 130000, can: 130000,
      herbicide: 80000, pesticide: 60000,
      laborPlanting: 200000, laborWeeding: 250000, laborHarvest: 400000,
      transport: 180000, packaging: 60000,
    },
    marketPriceTip: 'Fresh roots: UGX 400–700/kg. Dried chips: UGX 800–1,200/kg. Flour commands premium in supermarkets.',
    agronomy: 'Use NARO-certified virus-free cuttings (NASE 3, NASE 19). Plant at start of rains. Mulch to control weeds.',
  },
  sweet_potatoes: {
    name: 'Sweet Potato', emoji: '🍠',
    seedRateKgPerHa: 0,
    seedCostUGXPerKg: 0,
    plantingMaterialNote: 'Vine cuttings — ~30,000 per hectare',
    plantingMaterialCostPerHa: 150000,
    yieldKgPerHa: { pessimistic: 6000, realistic: 12000, optimistic: 20000 },
    irrigatedYieldMultiplier: 1.2,
    durationDays: 90, isPerennial: false,
    defaultCostsPerHa: {
      landPrep: 300000, dap: 130000, can: 0,
      herbicide: 50000, pesticide: 50000,
      laborPlanting: 180000, laborWeeding: 200000, laborHarvest: 280000,
      transport: 120000, packaging: 60000,
    },
    marketPriceTip: 'Orange-flesh (SPK004) earns UGX 700–1,000/kg vs. white at UGX 350–500/kg. BIDCO and WFP buy OFSP.',
    agronomy: 'Mound size affects yield significantly. 30cm high mounds at 75×30cm give best results.',
  },
  tomato: {
    name: 'Tomato', emoji: '🍅',
    seedRateKgPerHa: 0.35,
    seedCostUGXPerKg: 900000,
    yieldKgPerHa: { pessimistic: 10000, realistic: 20000, optimistic: 35000 },
    irrigatedYieldMultiplier: 1.6,
    durationDays: 90, isPerennial: false,
    defaultCostsPerHa: {
      landPrep: 380000, dap: 260000, can: 200000,
      herbicide: 80000, pesticide: 400000,
      laborPlanting: 350000, laborWeeding: 280000, laborHarvest: 400000,
      transport: 200000, packaging: 120000,
    },
    marketPriceTip: 'Prices swing 5×: low season UGX 300–500/kg, peak UGX 1,500–2,500/kg. Time harvest to coincide with festivals.',
    agronomy: 'Start nursery 4 weeks before transplanting. Stake at 45cm height. Weekly fungicide is non-negotiable in wet season.',
  },
  coffee: {
    name: 'Coffee', emoji: '☕',
    seedRateKgPerHa: 0,
    seedCostUGXPerKg: 0,
    plantingMaterialNote: '~1,100 seedlings/ha at 3m×3m spacing',
    plantingMaterialCostPerHa: 1650000,
    yieldKgPerHa: { pessimistic: 500, realistic: 900, optimistic: 1500 },
    irrigatedYieldMultiplier: 1.1,
    durationDays: 365, isPerennial: true,
    defaultCostsPerHa: {
      landPrep: 550000, dap: 260000, can: 260000,
      herbicide: 100000, pesticide: 220000,
      laborPlanting: 350000, laborWeeding: 450000, laborHarvest: 450000,
      transport: 100000, packaging: 60000,
    },
    marketPriceTip: 'Robusta cherries: UGX 1,200–1,800/kg. Arabica: UGX 2,500–4,000/kg. UCDA-registered farmers earn premiums.',
    agronomy: 'Year 1–2: establishment (no harvest). Year 3+: full production. Annual pruning doubles yields.',
  },
  sunflower: {
    name: 'Sunflower', emoji: '🌻',
    seedRateKgPerHa: 10,
    seedCostUGXPerKg: 8000,
    yieldKgPerHa: { pessimistic: 800, realistic: 1400, optimistic: 2200 },
    irrigatedYieldMultiplier: 1.3,
    durationDays: 100, isPerennial: false,
    defaultCostsPerHa: {
      landPrep: 280000, dap: 130000, can: 130000,
      herbicide: 60000, pesticide: 60000,
      laborPlanting: 60000, laborWeeding: 200000, laborHarvest: 150000,
      transport: 60000, packaging: 30000,
    },
    marketPriceTip: 'BIDCO, Mukwano and Victoria Seeds contract at UGX 1,400–1,800/kg. Register with an oil mill for guaranteed off-take.',
    agronomy: 'Plant at 75cm×30cm. Apply foliar boron at flowering to prevent empty heads.',
  },
  banana: {
    name: 'Banana (Matooke)', emoji: '🍌',
    seedRateKgPerHa: 0,
    seedCostUGXPerKg: 0,
    plantingMaterialNote: '~400 suckers/ha at 3m×2.5m spacing',
    plantingMaterialCostPerHa: 600000,
    yieldKgPerHa: { pessimistic: 10000, realistic: 20000, optimistic: 35000 },
    irrigatedYieldMultiplier: 1.25,
    durationDays: 365, isPerennial: true,
    defaultCostsPerHa: {
      landPrep: 550000, dap: 260000, can: 260000,
      herbicide: 100000, pesticide: 150000,
      laborPlanting: 400000, laborWeeding: 450000, laborHarvest: 350000,
      transport: 200000, packaging: 100000,
    },
    marketPriceTip: 'Matooke: UGX 600–1,200/kg in Kampala. Direct contracts with supermarkets or urban traders eliminate middle-man.',
    agronomy: 'Desucker monthly — keep 1 follower per stool. Mulch to conserve moisture. First bunch at 9–12 months.',
  },
};

export const COST_LABELS: Record<string, string> = {
  seeds: 'Seeds / Planting Material',
  landPrep: 'Land Preparation',
  dap: 'DAP Fertilizer (Basal)',
  can: 'CAN / Urea (Top Dress)',
  lime: 'Agricultural Lime',
  herbicide: 'Herbicides',
  fungicide: 'Fungicides',
  pesticide: 'Pesticides / Insecticides',
  laborPlanting: 'Labor — Planting',
  laborWeeding: 'Labor — Weeding',
  laborHarvest: 'Labor — Harvesting',
  laborProcessing: 'Labor — Post-Harvest',
  transport: 'Transport to Market',
  packaging: 'Bags & Packaging',
  irrigation: 'Irrigation',
  storage: 'Storage Fees',
  insurance: 'Crop Insurance',
  other: 'Other / Miscellaneous',
};

export const COST_CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: 'seeds',           label: 'Seeds & Planting',     icon: '🌱' },
  { key: 'landPrep',        label: 'Land Preparation',     icon: '🚜' },
  { key: 'dap',             label: 'DAP Fertilizer',       icon: '💊' },
  { key: 'can',             label: 'CAN / Urea',           icon: '💊' },
  { key: 'lime',            label: 'Agricultural Lime',    icon: '🪨' },
  { key: 'herbicide',       label: 'Herbicide',            icon: '🧴' },
  { key: 'fungicide',       label: 'Fungicide',            icon: '🧴' },
  { key: 'pesticide',       label: 'Pesticide',            icon: '🧴' },
  { key: 'laborPlanting',   label: 'Labor — Planting',     icon: '👷' },
  { key: 'laborWeeding',    label: 'Labor — Weeding',      icon: '👷' },
  { key: 'laborHarvest',    label: 'Labor — Harvest',      icon: '👷' },
  { key: 'laborProcessing', label: 'Labor — Processing',   icon: '👷' },
  { key: 'transport',       label: 'Transport',            icon: '🚛' },
  { key: 'packaging',       label: 'Bags & Packaging',     icon: '📦' },
  { key: 'irrigation',      label: 'Irrigation',           icon: '💧' },
  { key: 'storage',         label: 'Storage',              icon: '🏭' },
  { key: 'insurance',       label: 'Crop Insurance',       icon: '🛡️' },
  { key: 'other',           label: 'Other Costs',          icon: '➕' },
];

export interface FarmCalcInput {
  cropType: string;
  areaHa: number;
  irrigated: boolean;
  costs: Record<string, number>;
  marketPricePerKg: number;
  targetMarginPct: number;
}

export interface FarmCalcResult {
  yield: { pessimistic: number; realistic: number; optimistic: number };
  totalCosts: number;
  revenue: { pessimistic: number; realistic: number; optimistic: number };
  profit: { pessimistic: number; realistic: number; optimistic: number };
  marginPct: { pessimistic: number; realistic: number; optimistic: number };
  roiPct: number;
  breakEvenPricePerKg: number;
  suggestedPricePerKg: number;
  costPerKgRealistic: number;
  costBreakdown: { key: string; label: string; amount: number; pct: number; icon: string }[];
  verdict: 'highly_profitable' | 'profitable' | 'marginal' | 'loss';
  verdictMessage: string;
}

export function getDefaultCosts(cropType: string, areaHa: number): Record<string, number> {
  const profile = CROP_PROFILES[cropType];
  if (!profile) return {};
  const d = profile.defaultCostsPerHa;
  const ha = Math.max(0.1, areaHa);
  return {
    seeds: profile.seedRateKgPerHa > 0
      ? Math.round(profile.seedRateKgPerHa * profile.seedCostUGXPerKg * ha)
      : Math.round((profile.plantingMaterialCostPerHa ?? 0) * ha),
    landPrep: Math.round(d.landPrep * ha),
    dap:      Math.round(d.dap * ha),
    can:      Math.round(d.can * ha),
    lime:     0,
    herbicide: Math.round(d.herbicide * ha),
    fungicide: 0,
    pesticide: Math.round(d.pesticide * ha),
    laborPlanting: Math.round(d.laborPlanting * ha),
    laborWeeding:  Math.round(d.laborWeeding * ha),
    laborHarvest:  Math.round(d.laborHarvest * ha),
    laborProcessing: 0,
    transport:  Math.round(d.transport * ha),
    packaging:  Math.round(d.packaging * ha),
    irrigation: 0,
    storage: 0,
    insurance: 0,
    other: 0,
  };
}

export function calculateFarmFinancials(input: FarmCalcInput): FarmCalcResult {
  const profile = CROP_PROFILES[input.cropType];
  if (!profile) throw new Error(`Unknown crop: ${input.cropType}`);

  const yieldMult = input.irrigated ? profile.irrigatedYieldMultiplier : 1;
  const ha = Math.max(0.01, input.areaHa);

  const yieldKg = {
    pessimistic: Math.round(profile.yieldKgPerHa.pessimistic * yieldMult * ha),
    realistic:   Math.round(profile.yieldKgPerHa.realistic   * yieldMult * ha),
    optimistic:  Math.round(profile.yieldKgPerHa.optimistic  * yieldMult * ha),
  };

  const totalCosts = Object.values(input.costs).reduce((s, v) => s + (Number(v) || 0), 0);

  const mp = Math.max(0, input.marketPricePerKg);

  const revenue = {
    pessimistic: Math.round(yieldKg.pessimistic * mp),
    realistic:   Math.round(yieldKg.realistic   * mp),
    optimistic:  Math.round(yieldKg.optimistic  * mp),
  };

  const profit = {
    pessimistic: revenue.pessimistic - totalCosts,
    realistic:   revenue.realistic   - totalCosts,
    optimistic:  revenue.optimistic  - totalCosts,
  };

  const safePct = (p: number, r: number) => r > 0 ? Math.round((p / r) * 100) : 0;

  const marginPct = {
    pessimistic: safePct(profit.pessimistic, revenue.pessimistic),
    realistic:   safePct(profit.realistic,   revenue.realistic),
    optimistic:  safePct(profit.optimistic,  revenue.optimistic),
  };

  const roiPct = totalCosts > 0
    ? Math.round((profit.realistic / totalCosts) * 100)
    : 0;

  const costPerKgRealistic = yieldKg.realistic > 0
    ? Math.round(totalCosts / yieldKg.realistic)
    : 0;

  const breakEvenPricePerKg = yieldKg.realistic > 0
    ? Math.ceil(totalCosts / yieldKg.realistic)
    : 0;

  // Suggested price: must cover costs + target margin. Also nudge toward market price if market is higher.
  const minViablePrice = Math.ceil(costPerKgRealistic * (1 + (input.targetMarginPct || 40) / 100));
  const suggestedPricePerKg = Math.max(minViablePrice, Math.round(mp > 0 ? mp * 0.97 : minViablePrice));

  // Cost breakdown (non-zero costs only)
  const allCostEntries = COST_CATEGORIES
    .map(cat => ({
      key: cat.key,
      label: cat.label,
      amount: Number(input.costs[cat.key]) || 0,
      pct: 0,
      icon: cat.icon,
    }))
    .filter(c => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const costBreakdown = allCostEntries.map(c => ({
    ...c,
    pct: totalCosts > 0 ? Math.round((c.amount / totalCosts) * 100) : 0,
  }));

  // Verdict
  let verdict: FarmCalcResult['verdict'];
  let verdictMessage: string;

  if (profit.realistic >= totalCosts * 0.5) {
    verdict = 'highly_profitable';
    verdictMessage = `Excellent! You are projected to earn ${roiPct}% return on investment. Consider scaling up.`;
  } else if (profit.realistic > 0) {
    verdict = 'profitable';
    verdictMessage = `Good — this crop is profitable at realistic yields. Keep input costs controlled.`;
  } else if (profit.pessimistic >= -totalCosts * 0.1) {
    verdict = 'marginal';
    verdictMessage = `Marginal at current prices. Reduce costs, improve yield, or sell at UGX ${suggestedPricePerKg.toLocaleString()}/kg minimum.`;
  } else {
    verdict = 'loss';
    verdictMessage = `At current market price, this plan results in a loss. Review your costs or target a higher selling price of UGX ${suggestedPricePerKg.toLocaleString()}/kg.`;
  }

  return {
    yield: yieldKg, totalCosts, revenue, profit, marginPct,
    roiPct, breakEvenPricePerKg, suggestedPricePerKg, costPerKgRealistic,
    costBreakdown, verdict, verdictMessage,
  };
}

export const EXPENSE_CATEGORIES = [
  { value: 'seeds',        label: 'Seeds & Planting Material', icon: '🌱' },
  { value: 'fertilizer',  label: 'Fertilizers',               icon: '💊' },
  { value: 'pesticide',   label: 'Pesticides & Herbicides',   icon: '🧴' },
  { value: 'labor',       label: 'Labor',                     icon: '👷' },
  { value: 'land_prep',   label: 'Land Preparation',          icon: '🚜' },
  { value: 'transport',   label: 'Transport',                 icon: '🚛' },
  { value: 'equipment',   label: 'Equipment / Tools',         icon: '🔧' },
  { value: 'irrigation',  label: 'Irrigation',                icon: '💧' },
  { value: 'storage',     label: 'Storage',                   icon: '🏭' },
  { value: 'other',       label: 'Other',                     icon: '➕' },
];

export const SEASONS = ['A2026', 'B2025', 'A2025', 'B2024', 'A2024'];
