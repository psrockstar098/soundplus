/**
 * F7 — Reference-Track Matching (standalone port).
 *
 * Compare the user's mix against a reference track on tonal balance
 * (band shares), dynamics (crest factor), stereo width (mid/side),
 * and loudness (RMS dB). Recommendations are directional deltas, and
 * "test corrective changes" is a real simulation: apply a gain change
 * to the samples, re-analyze, and report the new delta.
 */

import { analyzeSamples, type BandShares } from "./dsp.ts";
import { loudnessDb } from "./mastering.ts";

export type MixFeatures = {
  bands: BandShares;
  crestDb: number;
  loudnessDb: number;
  stereoWidth: number; // 0 = mono, higher = wider
};

export function stereoWidth(left: ArrayLike<number>, right: ArrayLike<number>): number {
  const n = Math.min(left.length, right.length);
  if (n === 0) return 0;
  let midSq = 0;
  let sideSq = 0;
  for (let i = 0; i < n; i++) {
    const mid = (left[i] + right[i]) / 2;
    const side = (left[i] - right[i]) / 2;
    midSq += mid * mid;
    sideSq += side * side;
  }
  const midRms = Math.sqrt(midSq / n);
  const sideRms = Math.sqrt(sideSq / n);
  // Perfectly anti-phase material has no mid at all: width is maximal.
  if (midRms < 1e-6) return sideRms > 1e-6 ? 1 : 0;
  return Math.min(1, sideRms / midRms);
}

export function featuresOf(
  samples: ArrayLike<number>,
  stereo?: { left: ArrayLike<number>; right: ArrayLike<number> },
): MixFeatures {
  const a = analyzeSamples(samples);
  return {
    bands: a.bands,
    crestDb: a.crestDb,
    loudnessDb: loudnessDb(samples),
    stereoWidth: stereo ? stereoWidth(stereo.left, stereo.right) : 0,
  };
}

export type Recommendation = { area: string; detail: string; gainDb: number };

/** Directional recommendations from mix-vs-reference deltas. */
export function compareToReference(mix: MixFeatures, ref: MixFeatures): Recommendation[] {
  const out: Recommendation[] = [];
  const bandTips: Array<[keyof BandShares, string]> = [
    ["sub", "sub"],
    ["low", "low"],
    ["lowMid", "low-mid"],
    ["mid", "mid"],
    ["high", "high"],
  ];
  for (const [key, label] of bandTips) {
    const delta = mix.bands[key] - ref.bands[key];
    if (Math.abs(delta) > 0.08) {
      out.push({
        area: `tonal-${label}`,
        detail: `mix ${label} share is ${(delta * 100).toFixed(0)} points ${delta > 0 ? "above" : "below"} the reference`,
        gainDb: delta > 0 ? -1.5 : 1.5,
      });
    }
  }
  const loudDelta = mix.loudnessDb - ref.loudnessDb;
  if (Math.abs(loudDelta) > 1) {
    out.push({
      area: "loudness",
      detail: `mix is ${Math.abs(loudDelta).toFixed(1)} dB ${loudDelta > 0 ? "louder" : "quieter"} than the reference`,
      gainDb: -loudDelta,
    });
  }
  const widthDelta = mix.stereoWidth - ref.stereoWidth;
  if (Math.abs(widthDelta) > 0.15) {
    out.push({
      area: "stereo-width",
      detail: `mix stereo width ${widthDelta.toFixed(2)} ${widthDelta > 0 ? "wider" : "narrower"} than the reference`,
      gainDb: 0,
    });
  }
  return out;
}

export function applyGain(samples: ArrayLike<number>, gainDb: number): Float32Array {
  const g = Math.pow(10, gainDb / 20);
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = samples[i] * g;
  return out;
}

/** Test a corrective gain change: re-analyze and report the new delta. */
export function testCorrectiveChange(
  samples: ArrayLike<number>,
  ref: MixFeatures,
  gainDb: number,
): { before: number; after: number; improved: boolean } {
  const before = Math.abs(featuresOf(samples).loudnessDb - ref.loudnessDb);
  const after = Math.abs(featuresOf(applyGain(samples, gainDb)).loudnessDb - ref.loudnessDb);
  return { before, after, improved: after < before };
}
