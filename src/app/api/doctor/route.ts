import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DISEASES = [
  {
    id: 'fall-armyworm',
    name: 'Fall Armyworm',
    crops: ['maize', 'sorghum'],
    keywords: ['armyworm', 'caterpillar', 'larva', 'larvae', 'frass', 'whorl', 'leaf damage', 'insect'],
    severity: 'high' as const,
    affectedPart: 'Leaves & Whorls',
    symptoms: ['Ragged holes in leaves', 'Frass (droppings) in whorls', 'Caterpillars visible at dawn', 'Stunted growth in severe cases'],
    treatment: [
      'Inspect crop at dawn or dusk when larvae are most active',
      'Apply Emamectin Benzoate (10ml per 20L water) directly into leaf whorls',
      'Re-inspect after 5 days — retreat if more than 20% of plants still infested',
      'Report widespread outbreak to your district agricultural officer',
    ],
    prevention: ['Scout weekly from emergence', 'Use pheromone traps for early detection', 'Intercrop with legumes to reduce spread', 'Conserve natural enemies (parasitic wasps)'],
    urgency: 'Act within 48 hours to prevent yield loss exceeding 50%.',
  },
  {
    id: 'northern-leaf-blight',
    name: 'Northern Leaf Blight',
    crops: ['maize'],
    keywords: ['blight', 'lesion', 'cigar', 'tan', 'grey', 'gray', 'streak', 'lesions', 'leaf spot'],
    severity: 'medium' as const,
    affectedPart: 'Leaves',
    symptoms: ['Long cigar-shaped grey/tan lesions', 'Lesions run parallel to leaf veins', 'Premature leaf death from bottom up', 'Reduced photosynthesis and yield'],
    treatment: [
      'Remove and burn severely infected lower leaves',
      'Apply Triazole fungicide (e.g., Propiconazole) at first sign of infection',
      'Repeat fungicide application after 14 days if disease persists',
      'Ensure adequate plant spacing for air circulation',
    ],
    prevention: ['Plant resistant varieties (LONGE 5, SEEDCO SC403)', 'Rotate maize with beans or groundnuts', 'Avoid overhead irrigation', 'Remove crop residue after harvest'],
    urgency: 'Treat within 1 week. Most critical at tasseling stage.',
  },
  {
    id: 'bacterial-wilt',
    name: 'Bacterial Wilt',
    crops: ['tomato', 'pepper', 'eggplant'],
    keywords: ['wilt', 'wilting', 'bacterial', 'brown', 'vascular', 'sudden collapse'],
    severity: 'high' as const,
    affectedPart: 'Stem & Vascular System',
    symptoms: ['Rapid wilting of entire plant', 'Brown discoloration inside stem when cut', 'Milky bacterial ooze from cut stem in water', 'No recovery even after watering'],
    treatment: [
      'Remove and destroy infected plants immediately — do NOT compost',
      'Drench soil with Copper Oxychloride (50g per 10L water) around removed plant',
      'Disinfect all tools with 10% bleach solution after use',
      'Avoid working in wet conditions to prevent spread',
    ],
    prevention: ['Use certified disease-free seedlings', 'Graft tomatoes onto resistant rootstock', 'Practice 3-year crop rotation', 'Improve soil drainage to reduce root stress'],
    urgency: 'No cure once infected. Remove plants immediately to protect healthy ones.',
  },
  {
    id: 'cassava-mosaic',
    name: 'Cassava Mosaic Virus',
    crops: ['cassava'],
    keywords: ['mosaic', 'yellow', 'mottled', 'chlorosis', 'distorted', 'curl', 'whitefly', 'virus'],
    severity: 'medium' as const,
    affectedPart: 'Leaves',
    symptoms: ['Yellow-green mosaic pattern on leaves', 'Leaf distortion and curling', 'Stunted plant growth', 'Reduced root yield (up to 80% loss in severe cases)'],
    treatment: [
      'Rogue out (remove) severely infected plants and burn them',
      'Replace with CMD-resistant varieties: NASE 3, NASE 4, or NAROCASS 1',
      'Control whitefly vectors with Imidacloprid spray (5ml/15L water)',
      'Replant using clean stem cuttings from healthy plants only',
    ],
    prevention: ['Only plant certified virus-free cuttings', 'Avoid replanting from infected fields', 'Control whitefly with yellow sticky traps', 'Plant resistant varieties from NARO'],
    urgency: 'Act within 2 weeks. Virus spreads rapidly via whiteflies.',
  },
  {
    id: 'coffee-berry-disease',
    name: 'Coffee Berry Disease (CBD)',
    crops: ['coffee'],
    keywords: ['berry', 'rot', 'mummified', 'black', 'brown berry', 'anthracnose', 'fungus'],
    severity: 'high' as const,
    affectedPart: 'Coffee Berries',
    symptoms: ['Dark brown to black lesions on green berries', 'Mummified berries remaining on tree', 'Premature berry drop', 'Internal bean discoloration (brown)'],
    treatment: [
      'Apply Copper fungicide (Kocide 2000 — 40g/20L water) immediately',
      'Spray at 60% berry set, repeat every 3 weeks during wet season',
      'Prune lower branches to improve air circulation',
      'Strip-pick all infected berries and destroy (do not dry on farm)',
    ],
    prevention: ['Prune annually to open canopy', 'Apply copper fungicide preventively at berry set', 'Plant CBD-tolerant varieties (Ruiru 11, Batian)', 'Harvest promptly — never leave ripe berries on tree'],
    urgency: 'Can cause 80–90% crop loss. Begin fungicide immediately.',
  },
  {
    id: 'bean-anthracnose',
    name: 'Bean Anthracnose',
    crops: ['beans'],
    keywords: ['anthracnose', 'pod', 'dark', 'sunken', 'lesion', 'pod spot', 'canker'],
    severity: 'medium' as const,
    affectedPart: 'Pods & Leaves',
    symptoms: ['Dark sunken lesions on pods', 'Brick-red to black spots on leaves', 'Angular water-soaked spots turning brown', 'Reduced seed quality and marketability'],
    treatment: [
      'Apply Mancozeb fungicide (30g/10L water) every 10–14 days',
      'Remove and destroy heavily infected plant material',
      'Avoid working in field when plants are wet',
      'Improve field drainage to reduce humidity',
    ],
    prevention: ['Use certified disease-free seed', 'Rotate with non-legume crops for 2+ years', 'Avoid overhead irrigation', 'Space plants adequately for airflow'],
    urgency: 'Treat within 1 week to protect pod quality for market.',
  },
];

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { imageBase64, cropType = '' } = body ?? {};
  if (!imageBase64) {
    return NextResponse.json({ success: false, error: 'imageBase64 required' }, { status: 400 });
  }

  // Strip data URL prefix if present: "data:image/jpeg;base64,..."
  const base64Content = typeof imageBase64 === 'string'
    ? imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
    : '';

  let visionLabels: string[] = [];
  let visionAttempted = false;

  const googleApiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (googleApiKey && base64Content) {
    visionAttempted = true;
    try {
      const vRes = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Content },
            features: [
              { type: 'LABEL_DETECTION', maxResults: 15 },
              { type: 'OBJECT_LOCALIZATION', maxResults: 5 },
            ],
          }],
        }),
      });
      const vJson = await vRes.json();
      visionLabels = (vJson.responses?.[0]?.labelAnnotations ?? [])
        .map((a: any) => (a.description ?? '').toLowerCase()) as string[];
    } catch {
      // visionAttempted stays true — request was made but failed, handled below
    }
  }

  // No GOOGLE_CLOUD_API_KEY configured, or the API call itself failed/returned
  // nothing: be honest about it instead of seeding generic labels like
  // ['leaf','plant','damage', cropType] — that fallback let the keyword
  // matcher "diagnose" a disease from the selected crop alone, with no photo
  // analysis behind it at all, and present it as a confident AI result.
  if (!visionAttempted || visionLabels.length === 0) {
    const result = {
      diseaseName: 'AI Analysis Unavailable',
      confidence: 0,
      severity: 'low' as const,
      affectedPart: 'N/A',
      symptoms: ['Photo analysis could not run for this scan.'],
      treatment: [
        'This doesn’t mean your crop is healthy — it means the scan couldn’t analyze the photo.',
        'Book a consultation with a plant pathologist for a real diagnosis.',
      ],
      prevention: [],
      urgency: 'Consult a pathologist directly for an accurate diagnosis.',
      cropType,
      analysisUnavailable: true,
    };
    return NextResponse.json({ success: true, data: result });
  }

  // Score each disease against detected labels
  let best: (typeof DISEASES)[0] | null = null;
  let bestScore = 0;

  for (const disease of DISEASES) {
    // Boost score if crop matches
    const cropBonus = disease.crops.includes(cropType.toLowerCase()) ? 0.2 : 0;
    const matchCount = disease.keywords.filter((kw) =>
      visionLabels.some((lbl) => lbl.includes(kw) || kw.includes(lbl))
    ).length;
    const score = (matchCount / disease.keywords.length) + cropBonus;
    if (score > bestScore) {
      bestScore = score;
      best = disease;
    }
  }

  const confidence = Math.min(95, Math.round(bestScore * 100));

  const result = best && confidence >= 10
    ? {
        diseaseName: best.name,
        confidence,
        severity: best.severity,
        affectedPart: best.affectedPart,
        symptoms: best.symptoms,
        treatment: best.treatment,
        prevention: best.prevention,
        urgency: best.urgency,
        cropType,
      }
    : {
        diseaseName: 'No Disease Detected',
        confidence: 0,
        severity: 'low' as const,
        affectedPart: 'N/A',
        symptoms: ['No symptoms of known disease detected'],
        treatment: ['Crop appears healthy. Continue regular monitoring.', 'Ensure adequate watering and nutrient supply.'],
        prevention: ['Scout weekly for early detection', 'Maintain clean fields — remove weeds and debris'],
        urgency: 'No immediate action required.',
        cropType,
      };

  // Persist to diagnoses table (non-critical)
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await (supabase.from as any)('diagnoses').insert({
        farmer_id: user.id,
        disease_name: result.diseaseName,
        severity: result.severity,
        treatment: result.treatment,
        crop_type: cropType || null,
        confidence,
      });
    }
  } catch {
    // diagnoses table may not exist yet — non-fatal
  }

  return NextResponse.json({ success: true, data: result });
}
