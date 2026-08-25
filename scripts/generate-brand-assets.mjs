import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const iconsDir = path.join(publicDir, 'icons');
const faviconDir = path.join(publicDir, 'favicon');
const splashDir = path.join(publicDir, 'splash');

for (const dir of [iconsDir, faviconDir, splashDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function run() {
  const masterRaw = sharp(path.join(root, 'extracted_cropify_logo.png'));
  const { data, info } = await masterRaw.raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  // 1. Flood fill exterior background to make transparent
  const isOuterBg = new Uint8Array(w * h);
  function isNearWhite(x, y) {
    const idx = (y * w + x) * 3;
    return data[idx] > 235 && data[idx + 1] > 235 && data[idx + 2] > 235;
  }

  const queueX = new Int32Array(w * h);
  const queueY = new Int32Array(w * h);
  let qHead = 0, qTail = 0;

  for (let x = 0; x < w; x++) {
    if (isNearWhite(x, 0)) { isOuterBg[0 * w + x] = 2; queueX[qTail] = x; queueY[qTail] = 0; qTail++; }
    if (isNearWhite(x, h - 1)) { isOuterBg[(h - 1) * w + x] = 2; queueX[qTail] = x; queueY[qTail] = h - 1; qTail++; }
  }
  for (let y = 0; y < h; y++) {
    if (isNearWhite(0, y) && isOuterBg[y * w + 0] === 0) { isOuterBg[y * w + 0] = 2; queueX[qTail] = 0; queueY[qTail] = y; qTail++; }
    if (isNearWhite(w - 1, y) && isOuterBg[y * w + (w - 1)] === 0) { isOuterBg[y * w + (w - 1)] = 2; queueX[qTail] = w - 1; queueY[qTail] = y; qTail++; }
  }

  // Seed inside letter 'p'
  if (isNearWhite(550, 980) && isOuterBg[980 * w + 550] === 0) {
    isOuterBg[980 * w + 550] = 2; queueX[qTail] = 550; queueY[qTail] = 980; qTail++;
  }
  // Seed inside letter 'o'
  if (isNearWhite(425, 990) && isOuterBg[990 * w + 425] === 0) {
    isOuterBg[990 * w + 425] = 2; queueX[qTail] = 425; queueY[qTail] = 990; qTail++;
  }

  while (qHead < qTail) {
    const cx = queueX[qHead];
    const cy = queueY[qHead];
    qHead++;
    isOuterBg[cy * w + cx] = 1;

    const neighbors = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const nIdx = ny * w + nx;
        if (isOuterBg[nIdx] === 0 && isNearWhite(nx, ny)) {
          isOuterBg[nIdx] = 2;
          queueX[qTail] = nx;
          queueY[qTail] = ny;
          qTail++;
        }
      }
    }
  }

  const fullRgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx3 = (y * w + x) * 3;
      const idx4 = (y * w + x) * 4;
      const r = data[idx3], g = data[idx3 + 1], b = data[idx3 + 2];

      if (isOuterBg[y * w + x] === 1) {
        fullRgba[idx4] = 0; fullRgba[idx4 + 1] = 0; fullRgba[idx4 + 2] = 0; fullRgba[idx4 + 3] = 0;
      } else {
        let isEdge = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < h && nx >= 0 && nx < w && isOuterBg[ny * w + nx] === 1) {
              isEdge = true;
              break;
            }
          }
          if (isEdge) break;
        }

        if (isEdge && (r > 200 && g > 200 && b > 200)) {
          const brightness = (r + g + b) / (3 * 255);
          const alpha = Math.max(0, Math.min(255, Math.round((1 - (brightness - 0.78) / (1 - 0.78)) * 255)));
          if (alpha <= 0) {
            fullRgba[idx4] = 0; fullRgba[idx4 + 1] = 0; fullRgba[idx4 + 2] = 0; fullRgba[idx4 + 3] = 0;
          } else {
            const aNorm = alpha / 255;
            fullRgba[idx4] = Math.max(0, Math.min(255, Math.round((r - 255 * (1 - aNorm)) / aNorm)));
            fullRgba[idx4 + 1] = Math.max(0, Math.min(255, Math.round((g - 255 * (1 - aNorm)) / aNorm)));
            fullRgba[idx4 + 2] = Math.max(0, Math.min(255, Math.round((b - 255 * (1 - aNorm)) / aNorm)));
            fullRgba[idx4 + 3] = alpha;
          }
        } else {
          fullRgba[idx4] = r;
          fullRgba[idx4 + 1] = g;
          fullRgba[idx4 + 2] = b;
          fullRgba[idx4 + 3] = 255;
        }
      }
    }
  }

  // 2. Extract Emblem Alone (isolate circular emblem and clear wordmark leaf tip at y>=850 && x>760)
  const emblemData = Buffer.from(fullRgba);
  for (let y = 850; y < h; y++) {
    for (let x = 760; x < w; x++) {
      const idx = (y * w + x) * 4;
      emblemData[idx] = 0;
      emblemData[idx + 1] = 0;
      emblemData[idx + 2] = 0;
      emblemData[idx + 3] = 0;
    }
  }

  let eMinX = w, eMaxX = 0, eMinY = h, eMaxY = 0;
  for (let y = 0; y <= 870; y++) {
    for (let x = 0; x < w; x++) {
      if (emblemData[(y * w + x) * 4 + 3] > 10) {
        if (x < eMinX) eMinX = x;
        if (x > eMaxX) eMaxX = x;
        if (y < eMinY) eMinY = y;
        if (y > eMaxY) eMaxY = y;
      }
    }
  }

  const emblemWidth = eMaxX - eMinX + 1;
  const emblemHeight = eMaxY - eMinY + 1;
  console.log('Clean Emblem Bounds:', { eMinX, eMaxX, eMinY, eMaxY, emblemWidth, emblemHeight });

  const emblemBuf = await sharp(emblemData, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: eMinX, top: eMinY, width: emblemWidth, height: emblemHeight })
    .png()
    .toBuffer();

  // Save master transparent emblem 1024x1024
  const masterEmblem1024 = await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{
      input: await sharp(emblemBuf).resize(920, 920, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
      gravity: 'center'
    }])
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(iconsDir, 'icon-1024.png'), masterEmblem1024);
  console.log('Generated icon-1024.png');

  // Generate all icon sizes
  const sizes = [512, 256, 192, 180, 96, 48, 32, 16];
  for (const s of sizes) {
    await sharp(masterEmblem1024)
      .resize(s, s)
      .png()
      .toFile(path.join(iconsDir, `icon-${s}.png`));
    console.log(`Generated icon-${s}.png`);
  }

  // Favicons
  await sharp(masterEmblem1024).resize(32, 32).png().toFile(path.join(faviconDir, 'favicon-32.png'));
  await sharp(masterEmblem1024).resize(16, 16).png().toFile(path.join(faviconDir, 'favicon-16.png'));
  await sharp(masterEmblem1024).resize(32, 32).png().toFile(path.join(publicDir, 'favicon.ico'));
  console.log('Generated favicon-32.png, favicon-16.png, favicon.ico');

  // Maskable icons (for Android adaptive icons: safe zone centered with 70% scale on white background)
  for (const s of [192, 512]) {
    const markSize = Math.round(s * 0.70);
    const innerBuf = await sharp(emblemBuf).resize(markSize, markSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    await sharp({
      create: { width: s, height: s, channels: 4, background: '#FFFFFF' }
    })
      .composite([{ input: innerBuf, gravity: 'center' }])
      .png()
      .toFile(path.join(iconsDir, `icon-maskable-${s}.png`));
    console.log(`Generated icon-maskable-${s}.png`);
  }

  // Notification badge
  await sharp(masterEmblem1024)
    .resize(96, 96)
    .png()
    .toFile(path.join(iconsDir, 'notification-badge-96.png'));

  // Splash Screen (1024x1024 with brand green background #166B3A)
  const splashMark = await sharp(emblemBuf).resize(480, 480, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: '#166B3A' }
  })
    .composite([{ input: splashMark, gravity: 'center' }])
    .png()
    .toFile(path.join(splashDir, 'splash-1024.png'));
  console.log('Generated splash-1024.png');

  // 3. Full Logo (emblem + "cropify" + "INFORM • CONNECT • GROW")
  let fMinX = w, fMaxX = 0, fMinY = h, fMaxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (fullRgba[(y * w + x) * 4 + 3] > 10) {
        if (x < fMinX) fMinX = x;
        if (x > fMaxX) fMaxX = x;
        if (y < fMinY) fMinY = y;
        if (y > fMaxY) fMaxY = y;
      }
    }
  }
  const logoWidth = fMaxX - fMinX + 1;
  const logoHeight = fMaxY - fMinY + 1;

  await sharp(fullRgba, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: fMinX, top: fMinY, width: logoWidth, height: logoHeight })
    .extend({ top: 32, bottom: 32, left: 32, right: 32, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'logo.png'));
  console.log('Generated public/logo.png');

  // Also write SVG version in public/icons/icon.svg
  const base64Emblem = masterEmblem1024.toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="100%" height="100%">
  <title>Cropify App Icon</title>
  <image href="data:image/png;base64,${base64Emblem}" width="1024" height="1024" />
</svg>
`;
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent, 'utf8');
  console.log('Generated public/icons/icon.svg');

  // 4. Generate high-res OpenGraph Image (1200x630)
  const ogLogo = await sharp(path.join(publicDir, 'logo.png'))
    .resize(460, 460, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const ogCard = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ogBg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0A3F23"/>
      <stop offset="50%" stop-color="#145A32"/>
      <stop offset="100%" stop-color="#0B2E1B"/>
    </linearGradient>
    <radialGradient id="ogGlow" cx="600" cy="315" r="450" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#34A853" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#34A853" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#ogBg)"/>
  <circle cx="600" cy="315" r="450" fill="url(#ogGlow)"/>
  <g stroke="rgba(255,255,255,0.04)" stroke-width="1">
    <line x1="0" y1="157" x2="1200" y2="157"/>
    <line x1="0" y1="315" x2="1200" y2="315"/>
    <line x1="0" y1="472" x2="1200" y2="472"/>
    <line x1="300" y1="0" x2="300" y2="630"/>
    <line x1="600" y1="0" x2="600" y2="630"/>
    <line x1="900" y1="0" x2="900" y2="630"/>
  </g>
  <rect x="375" y="85" width="450" height="460" rx="32" fill="#FFFFFF" filter="drop-shadow(0 20px 40px rgba(0,0,0,0.35))"/>
</svg>`;

  const ogCardBuf = Buffer.from(ogCard);
  await sharp(ogCardBuf)
    .composite([
      { input: ogLogo, left: 375, top: 85 }
    ])
    .png()
    .toFile(path.join(publicDir, 'og-image.png'));
  console.log('Generated public/og-image.png');
}

run().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
