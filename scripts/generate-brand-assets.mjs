// Regenerates PNG icon/favicon/splash assets from the master SVG mark.
// Run after editing public/icons/icon.svg or public/logos/agrinova-icon.svg.
import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');

const iconSvg = readFileSync(path.join(publicDir, 'icons', 'icon.svg'));

const ICON_SIZES = [1024, 512, 256, 192, 180, 96, 48, 32, 16];
const FAVICON_SIZES = [32, 16];

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

async function run() {
  const iconsOut = path.join(publicDir, 'icons');
  const faviconOut = path.join(publicDir, 'favicon');
  const splashOut = path.join(publicDir, 'splash');
  ensureDir(iconsOut);
  ensureDir(faviconOut);
  ensureDir(splashOut);

  for (const size of ICON_SIZES) {
    await sharp(iconSvg, { density: 384 })
      .resize(size, size)
      .png()
      .toFile(path.join(iconsOut, `icon-${size}.png`));
    console.log(`icons/icon-${size}.png`);
  }

  for (const size of FAVICON_SIZES) {
    await sharp(iconSvg, { density: 384 })
      .resize(size, size)
      .png()
      .toFile(path.join(faviconOut, `favicon-${size}.png`));
    console.log(`favicon/favicon-${size}.png`);
  }

  // Maskable variants for Android adaptive icons: the base icon's leaf tip
  // reaches almost to the canvas edge, which Android's circular/squircle
  // mask would clip on install. Maskable icons need content kept inside a
  // safe zone of ~66% of the canvas — pad the mark down to that before
  // compositing onto a full-bleed white square background.
  const MASKABLE_SIZES = [192, 512];
  for (const size of MASKABLE_SIZES) {
    const markSize = Math.round(size * 0.66);
    const markBuf = await sharp(iconSvg, { density: 384 }).resize(markSize, markSize).png().toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: '#FFFFFF' } })
      .composite([{ input: markBuf, gravity: 'center' }])
      .png()
      .toFile(path.join(iconsOut, `icon-maskable-${size}.png`));
    console.log(`icons/icon-maskable-${size}.png`);
  }

  // Splash: icon centered on the brand page background, generous padding
  // (standard practice for PWA install/splash surfaces).
  const splashSize = 1024;
  const iconInset = Math.round(splashSize * 0.42); // icon occupies ~42% of canvas
  const iconBuf = await sharp(iconSvg, { density: 384 }).resize(iconInset, iconInset).png().toBuffer();
  await sharp({
    create: {
      width: splashSize,
      height: splashSize,
      channels: 4,
      background: '#F8FAFC',
    },
  })
    .composite([{ input: iconBuf, gravity: 'center' }])
    .png()
    .toFile(path.join(splashOut, 'splash-1024.png'));
  console.log('splash/splash-1024.png');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
