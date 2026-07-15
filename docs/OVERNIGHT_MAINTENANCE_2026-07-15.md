---
title: Overnight maintenance pass — 2026-07-15
scope: KULIMA (AgriNova) + fish (kasc-website)
---

# Overnight maintenance pass — 2026-07-15

Ran while the user was asleep, per explicit instruction: "review repositories, find dead
code, update dependencies, find vulnerabilities, triage tasks across several repos and
create documentation." Two git repositories exist under `Desktop/`: **KULIMA**
(AgriNova) and **fish** (kasc-website, Kajjansi Aquaculture Services Centre). Everything
below was verified with a clean `tsc --noEmit` and a full production build before being
committed — nothing was pushed on faith.

## 1. Dependency vulnerabilities

Both repos carry the exact same two moderate-severity findings, from the same root
cause:

| Package | Issue | Real fix available? |
|---|---|---|
| `postcss` (bundled inside `next`) | XSS via unescaped `</style>` in stringified CSS output | No — `npm audit`'s only suggested fix is downgrading `next` to `9.3.3` (7 major versions back), because that's the newest release predating the vulnerable postcss chain, not an actual upgrade path. No patched Next.js 16.x exists yet as of this pass (16.2.6/16.2.9 are current stable; nothing shipped between there and the 16.3.0 preview builds). |
| `next` | Depends on the vulnerable postcss range above | Same as above |

**Left as-is in both repos.** This is a build-time CVE (PostCSS stringifying
attacker-controlled CSS at build/compile time) — neither app feeds untrusted input into
PostCSS at runtime, so the real-world exposure is effectively zero. Downgrading either
app 7 major versions of Next.js days before launch would be far more dangerous than the
CVE itself. **Re-check this the next time `next` ships a 16.x patch release** — if
Vercel bumps its bundled postcss, a plain `npm update` will pick it up automatically.

**Fixed safely in both repos:**
- KULIMA: `npm audit fix` resolved `@babel/core` (low) and `js-yaml` (moderate), no
  breaking changes.
- KULIMA + fish: `npm update` (no args) picked up every patch/minor version already
  permitted by `package.json`'s existing `^` ranges — confirmed nothing crossed a major
  version before running (every affected package pins to its current major or, for 0.x
  packages, its current minor, so `npm update` was safe by construction). Verified with
  a clean typecheck + full build in both repos afterward.

## 2. Dead code

Used a manual heuristic (no-import-reference scan across `.ts`/`.tsx` files) since
`knip` crashed on a native-module bug in this environment (`oxc-parser` array buffer
allocation failure on Windows). The heuristic has known false-positive classes —
**test files** (discovered by Jest's glob, not imports), **barrel `index.ts` files**
(imported via directory-style specifiers the heuristic doesn't resolve), and
**framework entry points** (`middleware`/`proxy.ts`, `next.config.ts`, `next-env.d.ts`)
— all excluded from the tables below. Everything else was spot-checked with a second,
independent grep before being listed as a real candidate.

### fish (kasc-website)
Clean — no real dead code found. Only the 3 expected framework entry-point files
flagged (`next.config.ts`, `next-env.d.ts`, `proxy.ts`), all false positives.

### KULIMA — confirmed-orphaned components (verified via independent grep, genuinely
zero references anywhere else in the codebase)

| File | Notes |
|---|---|
| `src/app/buyer/listings/[id]/MakeOfferForm.tsx` | Not referenced by the sibling `page.tsx` or anywhere else — likely superseded when that page was rebuilt. |
| `src/app/farmer/dashboard/ShowAlertButton.tsx` | Orphaned. |
| `src/app/farmer/marketplace/ListingsClient.tsx` | Orphaned. |
| `src/app/farmer/marketplace/[id]/OfferActions.tsx` | Orphaned. |
| `src/app/farmer/settings/DeleteAccountButton.tsx` | Orphaned — worth double-checking there's a *working* delete-account entry point elsewhere before removing this, given `/api/auth/delete-account` exists. |
| `src/app/farmer/settings/SignOutButton.tsx` | Orphaned — same caveat, confirm sign-out works via another path before deleting. |
| `src/components/ComingSoon.tsx` | Orphaned. |
| `src/components/CropPhoto.tsx` | Orphaned — note `src/lib/crop-photos.ts` (a *different*, actively-used file) is not this. |
| `src/components/farm/AlertItem.tsx`, `ListingCard.tsx`, `PriceTicker.tsx`, `WeatherCard.tsx`, `useNotifications.ts` | Whole `components/farm/` cluster appears superseded by the newer per-role dashboards — same vintage as the `/dashboard/farms` legacy pages removed from prefetch earlier this session. |
| `src/components/farmer/DoctorUpload.tsx` | Orphaned — likely predates `PathologistClient.tsx`. |
| `src/components/shared/EmptyState.tsx`, `LanguageSwitcher.tsx`, `Navbar.tsx`, `OfflineBanner.tsx`, `PageHeader.tsx` | Orphaned generic-shell components from an earlier layout iteration. |
| `src/components/ui/FloatingActionButton.tsx`, `LazyLoad.tsx`, `OptimizedImage.tsx`, `OptimizedSkeleton.tsx`, `Skeleton.tsx`, `StarRating.tsx`, `VirtualList.tsx` | Orphaned UI primitives — never wired into the current component set. |
| `src/features/auth/hooks/useNotificationsRealtime.ts` | Orphaned — check whether realtime notifications are handled another way (e.g. polling) before removing. |
| `src/features/disease-detection/components/ImageUpload.tsx` | Orphaned. |
| `src/hooks/useResponsive.ts` | Orphaned. |
| `src/lib/cache-headers.ts` | Orphaned. |
| `src/lib/offline/outbox.ts`, `use-offline-status.ts` | Orphaned — part of an offline-sync feature that may be partially built; check `src/app/api/offline-sync` before removing, they may be meant to pair with it but never got wired up. |
| `src/server/db/connection.ts` | Orphaned — a raw DB connection helper; the app exclusively uses the Supabase client elsewhere, so this looks like a leftover from before that decision. |
| `src/utils/logger.ts` | Orphaned — the app uses `console.error`/`console.log` directly everywhere instead. |

**Not deleted.** Removal is a one-way door and several of these (delete-account,
sign-out, offline sync) sound like they *should* be live features — deleting the file
without confirming the feature works another way could silently remove functionality
rather than just tidy up. Recommend the team spend 15–20 minutes confirming each row's
"orphaned" verdict against actual product intent, then batch-delete in one commit.

## 3. Task triage — open items found or left over this session

Ranked by severity, not chronological order:

1. **[Already fixed this session]** `orders` table was missing `crop_type`/`unit_price`/
   `total_amount` — every order placement was failing. Root-caused and fixed
   2026-07-15.
2. **[Already fixed this session]** `listings`/`offers` RLS regression — buyers got a
   404 on every listing that wasn't their own; farmers/buyers couldn't see their own
   offers. Fixed 2026-07-14.
3. **[Open]** Production email deliverability — Supabase's built-in mailer is rate-
   limited and not meant for production. Email confirmation is now *required* at
   signup (fixed this session), which makes this more urgent than before: real users
   will get blocked from confirming their account within days of launch unless a real
   SMTP provider (Resend recommended) is wired in. **Waiting on the user for an API
   key** — this is the single most launch-blocking open item right now.
4. **[Open]** KULIMA dead-code cluster above — cosmetic/maintainability, not launch-
   blocking, but worth a cleanup pass.
5. **[Open]** `postcss`/`next` moderate CVE in both repos — no real fix exists yet;
   revisit on the next Next.js 16.x patch release (see §1).
6. **[Open]** fish repo (`kasc-website`) has no real README — still the unmodified
   `create-next-app` boilerplate. Replaced with real project docs this pass (see below).

## 4. Documentation

- **KULIMA**: `docs/PRODUCT_DOCUMENTATION.md` and `docs/PROVENANCE.md` already exist
  from a concurrent session and are current — left untouched to avoid duplicating them.
  This file is new and additive (maintenance-pass record, not product docs).
- **fish**: `README.md` was still the generic `create-next-app` template, never
  customized. Replaced with a real project README (stack, structure, scripts, env
  vars) — see that repo's commit for the diff.
