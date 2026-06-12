'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { uploadDiseaseImage, compressImage } from '@/lib/storage';

interface ImageUploadProps {
  farmId: string;
  onUploadComplete: (imageUrl: string) => void;
  onError: (error: string) => void;
}

export function ImageUpload({ farmId, onUploadComplete, onError }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      // Compress image first
      const compressedFile = await compressImage(file);

      // Upload to Supabase Storage
      const imageUrl = await uploadDiseaseImage(compressedFile, farmId);

      onUploadComplete(imageUrl);
      setPreview(null);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      onError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setPreview(null);
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Upload button */}
      {!preview && (
        <label
          htmlFor="disease-image"
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
          style={{
            borderColor: 'var(--d-border)',
            background: 'var(--d-card)',
          }}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-10 h-10 mb-3 text-gray-400" />
            <p className="mb-2 text-sm font-semibold">Click to upload disease scan image</p>
            <p className="text-xs text-gray-500">PNG, JPG, or WebP (MAX. 10MB)</p>
          </div>
          <input
            ref={inputRef}
            id="disease-image"
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
          />
        </label>
      )}

      {/* Preview and upload */}
      {preview && (
        <div className="space-y-4">
          <div className="relative">
            <img
              src={preview}
              alt="Disease scan preview"
              className="w-full h-64 object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              disabled={uploading}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: uploading ? 'var(--d-muted)' : 'var(--color-primary)',
            }}
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload Image
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
