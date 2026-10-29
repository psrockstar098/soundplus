/**
 * F28 — Alternative Mix Generation (standalone port).
 *
 * Several mix versions with different tonal balance, dynamics, and
 * stereo width, for audition and comparison. Variants are parameter
 * sets — renders happen through the DAW in Phase 4, and versions
 * are tracked by F8.
 */

export type MixVariant = {
  name: string;
  tonal: "bright" | "warm" | "balanced";
  dynamics: "punchy" | "smooth";
  width: "wide" | "natural" | "narrow";
  eq: { highShelfDb: number; lowShelfDb: number };
  compressorRatio: number;
  widthAmount: number; // 0..1
};

const VARIANTS: MixVariant[] = [
  {
    name: "Bright & Punchy",
    tonal: "bright",
    dynamics: "punchy",
    width: "wide",
    eq: { highShelfDb: 2, lowShelfDb: 0 },
    compressorRatio: 4,
    widthAmount: 0.8,
  },
  {
    name: "Warm & Smooth",
    tonal: "warm",
    dynamics: "smooth",
    width: "natural",
    eq: { highShelfDb: -1, lowShelfDb: 2 },
    compressorRatio: 2,
    widthAmount: 0.5,
  },
  {
    name: "Balanced & Narrow",
    tonal: "balanced",
    dynamics: "punchy",
    width: "narrow",
    eq: { highShelfDb: 0, lowShelfDb: 0 },
    compressorRatio: 3,
    widthAmount: 0.3,
  },
  {
    name: "Wide & Smooth",
    tonal: "balanced",
    dynamics: "smooth",
    width: "wide",
    eq: { highShelfDb: 1, lowShelfDb: 1 },
    compressorRatio: 1.5,
    widthAmount: 1.0,
  },
];

/** First `count` canonical variants (max 4); names always unique. */
export function generateMixVariants(count: number): MixVariant[] {
  return VARIANTS.slice(0, Math.max(0, Math.min(count, VARIANTS.length)));
}
