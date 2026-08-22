/* Design tokens shared between page.tsx (the above-the-fold landing shell —
   Nav/Hero/PriceTicker/ProofBar/PhoneMockup) and LandingBelowFold.tsx (the
   sections below the fold, code-split out via next/dynamic so their JS
   isn't part of the bundle needed for first paint). Single source of truth
   so the two files can't drift apart on color/type values. */

export const PAPER   = '#FAF9F4';
export const PAPER_2 = '#F2F0E6';
export const INK     = '#0F1F15';
export const INK_MID = '#2D4035';
export const INK_MUTE= '#5A6B5C';
export const LINE    = '#E4E1D3';
export const CARD    = '#FFFFFF';

export const GREEN      = '#157A3D';
export const GREEN_DEEP = '#0B4526';
export const GREEN_SOFT = '#E7F3EB';
export const FOREST     = '#0D2B18';
export const FOREST_2   = '#123420';
export const MINT       = '#5FE0A0';
export const GOLD       = '#E7A73D';
export const GOLD_SOFT  = '#FBF0DC';
export const SKY        = '#2F8FCE';
export const SKY_SOFT   = '#E6F3FB';
export const PLUM       = '#8B5FBF';
export const PLUM_SOFT  = '#F1EAFA';

export const FONT      = 'var(--font-plex-sans), var(--font-inter), system-ui, sans-serif';
export const HEAD_FONT = 'var(--font-oswald), var(--font-poppins), system-ui, sans-serif';
export const MONO_FONT = 'var(--font-plex-mono), var(--font-dm-mono), ui-monospace, monospace';
