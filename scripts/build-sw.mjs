// Builds public/sw.js from src/app/sw.ts after `next build` finishes.
//
// Why this exists: @serwist/next's classic mode hooks into next.config.js
// as a *webpack* plugin, but this project (Next.js 16, Vercel) builds with
// Turbopack for both dev and production — Turbopack doesn't run webpack's
// plugin pipeline at all, so the plugin silently never produced public/sw.js.
// The site had no service worker in production; offline mode never worked.
//
// This script uses serwist's Turbopack-safe "configurator" API instead:
// it scans the finished .next build output directly (glob patterns, no
// webpack hook needed) and bundles src/app/sw.ts with esbuild. Run it as
// `next build && node scripts/build-sw.mjs` (see package.json / vercel.json).
import { serwist } from '@serwist/next/config';
import { injectManifest } from '@serwist/build';

const config = await serwist({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
});

const { count, size, warnings } = await injectManifest(config);
warnings.forEach((w) => console.warn('[build-sw]', w));
console.log(`[build-sw] precached ${count} files, ${(size / 1024).toFixed(0)} KiB -> public/sw.js`);
