import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getEffectiveTier } from '@/lib/subscriptions/getEffectiveTier';

const FREE_TIER_MONTHLY_SCAN_CAP = 5;

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

interface DiagnosisResult {
  diseaseName: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  affectedPart: string;
  symptoms: string[];
  treatment: string[];
  prevention: string[];
  urgency: string;
  cropType: string;
  matchedKnownDisease?: boolean;
  analysisUnavailable?: boolean;
}

// Primary diagnosis path: a real vision-capable model actually looking at
// the photo, grounded in our own reviewed disease/treatment entries (the
// "agricultural knowledge base" step) rather than the old approach of
// running a generic image-labeler and string-matching its labels against
// disease keywords, which was closer to a guess than a diagnosis.
async function diagnoseWithOpenAI(base64Content: string, cropType: string): Promise<DiagnosisResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !base64Content) return null;

  const knowledgeBase = DISEASES.map(d => ({
    name: d.name, crops: d.crops, severity: d.severity, affectedPart: d.affectedPart,
    symptoms: d.symptoms, treatment: d.treatment, prevention: d.prevention, urgency: d.urgency,
  }));

  const systemPrompt = `You are Cropify's AI Crop Doctor, helping smallholder farmers in Uganda identify possible crop diseases and pests from a photo.

You have a reviewed knowledge base of ${knowledgeBase.length} diseases common in Uganda:
${JSON.stringify(knowledgeBase)}

Rules:
1. If the photo clearly matches one of the diseases above, use that entry's treatment/prevention/urgency text verbatim (it has been agronomically reviewed) and set matchedKnownDisease=true.
2. If it doesn't match any of those but you recognize a different crop disease or pest from general knowledge, you may name it, but set matchedKnownDisease=false, keep treatment cautious and general, and always include "Confirm with your local agro-dealer or extension officer before applying any chemical or pesticide."
3. If the photo doesn't clearly show a plant, leaf, or crop problem, or you can't make a confident assessment, set inconclusive=true, confidence to 0-20, diseaseName to "Inconclusive", and say plainly in symptoms/treatment that the photo didn't allow a clear assessment — never guess a disease from an unclear photo.
4. If the plant looks healthy with no disease signs, set diseaseName to "No Disease Detected", confidence reflecting how sure you are it's healthy, and treatment/prevention as general good-practice monitoring advice.
5. Never state a diagnosis as certain — this is advisory, not a substitute for a professional diagnosis.
6. Respond ONLY with a JSON object, no other text, matching exactly:
{"diseaseName": string, "confidence": number (0-100), "severity": "low"|"medium"|"high", "affectedPart": string, "symptoms": string[], "treatment": string[], "prevention": string[], "urgency": string, "matchedKnownDisease": boolean, "inconclusive": boolean}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        max_tokens: 1000,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: cropType ? `Crop type: ${cropType}. Diagnose this photo.` : 'Diagnose this photo.' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Content}` } },
            ],
          },
        ],
      }),
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (typeof parsed.diseaseName !== 'string') return null;

    return {
      diseaseName: parsed.inconclusive ? 'Inconclusive' : parsed.diseaseName,
      confidence: Math.max(0, Math.min(100, Math.round(parsed.confidence ?? 0))),
      severity: ['low', 'medium', 'high'].includes(parsed.severity) ? parsed.severity : 'low',
      affectedPart: parsed.affectedPart ?? 'N/A',
      symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
      treatment: Array.isArray(parsed.treatment) ? parsed.treatment : [],
      prevention: Array.isArray(parsed.prevention) ? parsed.prevention : [],
      urgency: parsed.urgency ?? '',
      cropType,
      matchedKnownDisease: !!parsed.matchedKnownDisease,
    };
  } catch {
    return null; // Network error, timeout, or malformed JSON — caller falls back.
  }
}

// Secondary path if OpenAI is unavailable/unconfigured/failed: the original
// generic-label-detection + keyword-overlap approach. Weaker than a real
// vision diagnosis, but still better than nothing.
async function diagnoseWithVisionFallback(base64Content: string, cropType: string): Promise<DiagnosisResult | null> {
  const googleApiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!googleApiKey || !base64Content) return null;

  let visionLabels: string[] = [];
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
    return null;
  }
  if (visionLabels.length === 0) return null;

  let best: (typeof DISEASES)[0] | null = null;
  let bestScore = 0;
  for (const disease of DISEASES) {
    const cropBonus = disease.crops.includes(cropType.toLowerCase()) ? 0.2 : 0;
    const matchCount = disease.keywords.filter((kw) =>
      visionLabels.some((lbl) => lbl.includes(kw) || kw.includes(lbl))
    ).length;
    const score = (matchCount / disease.keywords.length) + cropBonus;
    if (score > bestScore) { bestScore = score; best = disease; }
  }
  const confidence = Math.min(95, Math.round(bestScore * 100));

  if (best && confidence >= 10) {
    return {
      diseaseName: best.name, confidence, severity: best.severity, affectedPart: best.affectedPart,
      symptoms: best.symptoms, treatment: best.treatment, prevention: best.prevention, urgency: best.urgency,
      cropType, matchedKnownDisease: true,
    };
  }
  return {
    diseaseName: 'No Disease Detected', confidence: 0, severity: 'low', affectedPart: 'N/A',
    symptoms: ['No symptoms of known disease detected'],
    treatment: ['Crop appears healthy. Continue regular monitoring.', 'Ensure adequate watering and nutrient supply.'],
    prevention: ['Scout weekly for early detection', 'Maintain clean fields — remove weeds and debris'],
    urgency: 'No immediate action required.', cropType,
  };
}

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

  // Free tier is advertised (marketing copy on /premium) as "5 AI Crop
  // Doctor scans/month" — this was never enforced server-side, and every
  // scan spends a real (paid) Google Vision API call regardless of who's
  // calling. Checked before the Vision call, not after, so a farmer over
  // their cap doesn't cost anything to reject.
  const supabaseAuth = await createClient();
  const { data: { user: callingUser } } = await supabaseAuth.auth.getUser();
  if (!callingUser) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { data: callerProfile } = await (supabaseAuth.from as any)('profiles')
    .select('role, subscription_tier, role_subscription_tiers').eq('user_id', callingUser.id).single();
  if (getEffectiveTier(callerProfile ?? {}, 'farmer') === 'free') {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    // Service-role, not the session client: diagnoses' RLS SELECT policy
    // filters on profiles.id, but the insert below stores the raw auth
    // uid — a pre-existing mismatch (out of scope to fix here) that would
    // silently undercount every farmer's own scans via the session client.
    const admin = createServiceRoleClient();
    const { count } = await (admin.from as any)('diagnoses')
      .select('id', { count: 'exact', head: true })
      .eq('farmer_id', callingUser.id)
      .gte('created_at', monthStart.toISOString());
    if ((count ?? 0) >= FREE_TIER_MONTHLY_SCAN_CAP) {
      return NextResponse.json({
        success: false,
        error: `You've used all ${FREE_TIER_MONTHLY_SCAN_CAP} free AI Crop Doctor scans this month. Upgrade to Farmer Pro for unlimited scans.`,
      }, { status: 403 });
    }
  }

  // Strip data URL prefix if present: "data:image/jpeg;base64,..."
  const base64Content = typeof imageBase64 === 'string'
    ? imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
    : '';

  let result = base64Content ? await diagnoseWithOpenAI(base64Content, cropType) : null;

  // Fall back to the old Vision-label + keyword-overlap approach only if
  // OpenAI is unavailable/unconfigured/failed — kept as a second attempt
  // rather than removed outright, since it still beats returning nothing.
  if (!result) {
    result = await diagnoseWithVisionFallback(base64Content, cropType);
  }

  // Neither path could produce a result: be honest about it instead of
  // guessing — a wrong "confident" diagnosis on a real pesticide decision
  // is worse than admitting the scan didn't work.
  if (!result) {
    result = {
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
  }

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
        confidence: result.confidence,
      });
    }
  } catch {
    // diagnoses table may not exist yet — non-fatal
  }

  return NextResponse.json({ success: true, data: result });
}
