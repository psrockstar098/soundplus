/**
 * F24 — Musical Masking Detection (standalone port).
 *
 * Two tracks whose dominant frequency band is the same — and both
 * strong in it — compete for the same space. Each such pair yields
 * a masking report with a concrete recommendation (EQ carve,
 * arrangement, or dynamics). Pairs in different bands are never
 * flagged.
 */

import type { BandShares } from "./dsp.ts";

export type TrackBands = { name: string; bands: BandShares };

export type MaskingPair = {
  tracks: [string, string];
  band: keyof BandShares;
  detail: string;
  recommendation: string;
};

const BAND_LABELS: Record<keyof BandShares, string> = {
  sub: "sub",
  low: "low",
  lowMid: "low-mid",
  mid: "mid",
  high: "high",
};

function dominant(bands: BandShares): { band: keyof BandShares; share: number } {
  let band: keyof BandShares = "sub";
  let share = -1;
  for (const k of Object.keys(bands) as Array<keyof BandShares>) {
    if (bands[k] > share) {
      share = bands[k];
      band = k;
    }
  }
  return { band, share };
}

export function detectMasking(tracks: TrackBands[]): MaskingPair[] {
  const out: MaskingPair[] = [];
  for (let i = 0; i < tracks.length; i++) {
    for (let j = i + 1; j < tracks.length; j++) {
      const a = dominant(tracks[i].bands);
      const b = dominant(tracks[j].bands);
      if (a.band === b.band && a.share > 0.3 && b.share > 0.3) {
        out.push({
          tracks: [tracks[i].name, tracks[j].name],
          band: a.band,
          detail: `both dominant in ${BAND_LABELS[a.band]} (${(a.share * 100).toFixed(0)}% / ${(b.share * 100).toFixed(0)}%)`,
          recommendation: `Cut ${BAND_LABELS[a.band]} on one track, separate their arrangement, or sidechain one to the other.`,
        });
      }
    }
  }
  return out;
}
