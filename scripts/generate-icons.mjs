import sharp from 'sharp';
import { readFileSync } from 'fs';

const svg = readFileSync('public/icons/icon.svg');

const targets = [
  ['public/icons/icon-16.png', 16],
  ['public/icons/icon-32.png', 32],
  ['public/icons/icon-48.png', 48],
  ['public/icons/icon-96.png', 96],
  ['public/icons/icon-180.png', 180],
  ['public/icons/icon-192.png', 192],
  ['public/icons/icon-256.png', 256],
  ['public/icons/icon-512.png', 512],
  ['public/icons/icon-1024.png', 1024],
  ['public/favicon/favicon-16.png', 16],
  ['public/favicon/favicon-32.png', 32],
];

for (const [outPath, size] of targets) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log(`wrote ${outPath} (${size}x${size})`);
}
