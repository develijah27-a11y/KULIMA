// Regenerates public/og-image.png (social-preview / search-result card) from
// the current brand mark in public/icons/icon.svg, so it can never drift out
// of sync with the real in-app logo the way the old hand-made one did.
// Run after editing public/icons/icon.svg.
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Pull just the mark's inner paths (ring/sun/fields/leaf) out of icon.svg,
// skipping its own white rounded-square background rect — the OG card
// supplies its own background instead.
const iconSvg = readFileSync(path.join(root, 'public/icons/icon.svg'), 'utf8');
const inner = iconSvg
  .replace(/<\?xml[\s\S]*?\?>/, '')
  .replace(/<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '')
  .replace(/<rect[^>]*fill="#FFFFFF"\/>\s*/, '');

const W = 1200, H = 630;
const markSize = 260;
const markX = (W - markSize) / 2;
const markY = 56;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#F8FAFC"/>
  <g transform="translate(${markX},${markY}) scale(${markSize / 256})" fill="none">
    ${inner}
  </g>
  <text x="${W / 2}" y="424" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="72" fill="#0A5C36">Cropify</text>
  <text x="${W / 2}" y="464" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="22" letter-spacing="2" fill="#34A853">GROW SMART. FARM BETTER.</text>
  <text x="${W / 2}" y="512" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="400" font-size="22" fill="#64748B">Smart farm management for Ugandan smallholder farmers</text>
</svg>
`;

writeFileSync(path.join(root, 'public/og-image.svg'), svg);
await sharp(Buffer.from(svg), { density: 384 })
  .resize(W, H)
  .png()
  .toFile(path.join(root, 'public/og-image.png'));
console.log('wrote public/og-image.png');
