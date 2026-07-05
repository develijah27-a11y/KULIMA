// Builds public/sw.js from src/app/sw.ts after `next build` finishes.
//
// Why this exists: @serwist/next's classic mode hooks into next.config.js
// as a *webpack* plugin, but this project (Next.js 16, Vercel) builds with
// Turbopack for both dev and production — Turbopack doesn't run webpack's
// plugin pipeline at all, so the plugin silently never produced public/sw.js.
// The site had no service worker in production; offline mode never worked.
//
// This script uses serwist's Turbopack-safe "configurator" API instead —
// it scans the finished .next build output directly via glob patterns (no
// webpack hook needed) to build the precache manifest config. That config
// does NOT bundle sw.ts itself though (injectManifest only does text
// substitution on an already-built file) — so this script does that part
// in two explicit steps:
//   1. esbuild bundles src/app/sw.ts (+ its `serwist` import) into a single
//      classic (non-module) script, since the service worker is registered
//      without `{ type: 'module' }` — see ServiceWorkerRegistrar.tsx.
//   2. injectManifest reads that bundled file and writes public/sw.js with
//      the precache manifest substituted in for `self.__SW_MANIFEST`.
import { serwist } from '@serwist/next/config';
import { injectManifest } from '@serwist/build';
import * as esbuild from 'esbuild';
import { rmSync } from 'fs';

const BUNDLE_TMP = '.tmp-sw-bundle.js';

const config = await serwist({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
});

const { esbuildOptions, swSrc, ...manifestConfig } = config;

await esbuild.build({
  ...esbuildOptions,
  entryPoints: [swSrc],
  outfile: BUNDLE_TMP,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  minify: true,
});

try {
  const { count, size, warnings } = await injectManifest({
    ...manifestConfig,
    swSrc: BUNDLE_TMP,
  });
  warnings.forEach((w) => console.warn('[build-sw]', w));
  console.log(`[build-sw] precached ${count} files, ${(size / 1024).toFixed(0)} KiB -> public/sw.js`);
} finally {
  rmSync(BUNDLE_TMP, { force: true });
  rmSync(`${BUNDLE_TMP}.map`, { force: true });
}
