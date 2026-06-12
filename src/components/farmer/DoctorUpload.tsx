'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { showToast } from '@/components/ui/Toast';

export function DoctorUploadClient() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const handleFile = (f: File | null) => {
    setFile(f);
    setResult(null);
    if (f) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!file && !preview) return;
    setLoading(true);
    try {
      const res = await fetch('/api/doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: preview }),
      });
      const data = await res.json();
      setResult(data.data ?? data);
      showToast('Analysis complete!', 'success');
    } catch {
      showToast('Could not analyze image. Try again.', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <Card
        className="border-dashed border-2 border-surface2 hover:border-sprout/40 transition-colors text-center cursor-pointer"
        onClick={() => document.getElementById('file-input')?.click()}
      >
        {preview ? (
          <img src={preview} alt="Crop preview" className="max-h-48 mx-auto rounded-xl" />
        ) : (
          <div className="py-8">
            <span className="text-4xl block mb-2">🌿</span>
            <p className="text-sm text-cream/50">Tap to upload a crop photo</p>
            <p className="text-[11px] text-cream/25 mt-1">JPG, PNG, WEBP — max 10MB</p>
          </div>
        )}
        <input
          id="file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </Card>

      {file && (
        <p className="text-xs text-cream/35 truncate">Selected: {file.name}</p>
      )}

      <Button onClick={handleSubmit} className="w-full" isLoading={loading} disabled={!file}>
        Analyze Photo
      </Button>

      {/* Result */}
      {result && (
        <Card variant="surface" className="border-clay/20">
          <p className="text-sm font-bold text-clay mb-2">{result.diseaseName ?? 'Unknown Issue'}</p>
          <p className="text-xs text-cream/55 mb-3">
            Confidence: <strong className="text-cream">{Math.round(result.confidence ?? 0)}%</strong>
            {' '}· Severity: <Badge variant={result.severity === 'high' ? 'red' : 'gold'}>{result.severity ?? 'medium'}</Badge>
          </p>
          {result.treatment?.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-cream/60">Treatment:</p>
              {result.treatment.map((t: string, i: number) => (
                <p key={i} className="text-xs text-cream/45 pl-3">• {t}</p>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
