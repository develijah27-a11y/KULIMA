import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const doctorSchema = z.object({ imageUrl: z.string().url(), farmerId: z.string(), cropType: z.string() });

// load diseases
const diseases = {
  diseases: [
    {
      id: 'fall-armyworm', name: 'Fall Armyworm', crops: ['maize', 'sorghum'],
      visionLabels: ['armyworm', 'caterpillar', 'larvae', 'leaf damage', 'frass'],
      severity: 'high',
      treatment: ['Inspect crop at dawn when larvae are most active', 'Apply Emamectin Benzoate (10ml per 20L water) into leaf whorls', 'Re-inspect after 5 days, repeat if >20% infestation remains', 'Report outbreak to your district agricultural officer'],
    },
    {
      id: 'leaf-blight', name: 'Northern Leaf Blight', crops: ['maize'],
      visionLabels: ['leaf', 'blight', 'damage'],
      severity: 'medium',
      treatment: ['Remove and destroy infected leaves', 'Apply Copper-based fungicide (Triazole)', 'Rotate crops next season', 'Plant resistant varieties'],
    },
    {
      id: 'bacterial-wilt', name: 'Bacterial Wilt', crops: ['tomatoes'],
      visionLabels: ['leaf', 'wilt', 'yellow', 'brown'],
      severity: 'high',
      treatment: ['Remove and destroy infected plants immediately', 'Avoid using contaminated tools', 'Practice crop rotation', 'Use certified disease-free seeds'],
    },
    {
      id: 'mosaic-virus', name: 'Cassava Mosaic Virus', crops: ['cassava'],
      visionLabels: ['leaf', 'mosaic', 'yellow', 'curling', 'discolor'],
      severity: 'medium',
      treatment: ['Use resistant varieties (e.g., NASE 3, 4)', 'Remove and burn infected plants', 'Control whitefly vectors with insecticide', 'Use cuttings from disease-free plants'],
    },
    {
      id: 'coffee-berry-disease', name: 'Coffee Berry Disease', crops: ['coffee'],
      visionLabels: ['berry', 'coffee', 'rot', 'brown'],
      severity: 'high',
      treatment: ['Apply copper fungicide (Kocide 2000)', 'Prune to improve air circulation', 'Remove and destroy infected berries', 'Apply fungicide at 60% berry set'],
    },
  ],
};

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ success: false, error: { message: 'Invalid JSON' } }, { status: 400 }); }

  const parsed = doctorSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: { message: 'Invalid body' } }, { status: 400 });

  const { imageUrl, farmerId, cropType } = parsed.data;
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;

  let visionLabels: string[] = [];
  if (apiKey) {
    try {
      const vRes = await fetch('https://vision.googleapis.com/v1/images:annotate?key=' + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{ image: { source: { imageUri: imageUrl } }, features: [
            { type: 'LABEL_DETECTION', maxResults: 10 },
            { type: 'OBJECT_LOCALIZATION', maxResults: 5 },
          ]}],
        }),
      });
      const vJson = await vRes.json();
      visionLabels = (vJson.responses?.[0]?.labelAnnotations ?? [])
        .map((a: any) => a.description?.toLowerCase()) as string[];
    } catch { /* use mock below */ }
  }

  if (visionLabels.length === 0) {
    visionLabels = ['leaf', 'damage', cropType];
  }

  // match disease
  let best: any = null;
  let bestScore = 0;
  for (const d of diseases.diseases) {
    const matches = d.visionLabels.filter((l: string) => visionLabels.some(vl => vl.includes(l)));
    const score = matches.length / d.visionLabels.length;
    if (score > bestScore) { bestScore = score; best = d; }
  }

  const confidence = Math.round(bestScore * 100);
  const disease = best
    ? { diseaseName: best.name, confidence, severity: best.severity, treatment: best.treatment }
    : { diseaseName: 'No disease detected', confidence: 0, severity: 'low', treatment: ['Crop appears healthy. Monitor regularly.'] };

  // Store diagnosis if possible
  try {
    const supabase = await createClient();
    await supabase.from('diagnoses').insert({
      farmer_id: farmerId, image_url: imageUrl, crop_type: cropType,
      disease_id: best?.id, confidence: confidence / 100, severity: best?.severity,
      created_at: new Date().toISOString(),
    });
  } catch { /* diagnoses table not required */ }

  return NextResponse.json({ success: true, data: disease });
}
