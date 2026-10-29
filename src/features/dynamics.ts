/**
 * F25 — Dynamic Range Intelligence (standalone port).
 *
 * Evaluate transient preservation (crest factor), excessive
 * compression, level consistency across segments, and pumping
 * risk (high window-RMS variation together with low crest).
 * Thresholds are heuristics that trigger review, not verdicts.
 */

import { analyzeSamples } from "./dsp.ts";

export type DynamicsReport = {
  crestDb: number;
  windowRmsRangeDb: number;
  windowRmsCv: number;
  issues: string[];
};

function windowRmsList(samples: ArrayLike<number>, windows = 10): number[] {
  const size = Math.floor(samples.length / windows);
  if (size === 0) return [];
  const out: number[] = [];
  for (let w = 0; w < windows; w++) {
    let sumSq = 0;
    for (let i = w * size; i < (w + 1) * size; i++) sumSq += samples[i] * samples[i];
    out.push(Math.sqrt(sumSq / size));
  }
  return out;
}

export function analyzeDynamics(samples: ArrayLike<number>): DynamicsReport {
  const a = analyzeSamples(samples);
  const wins = windowRmsList(samples).filter((v) => v > 1e-6);
  let rangeDb = 0;
  let cv = 0;
  if (wins.length > 1) {
    const max = Math.max(...wins);
    const min = Math.min(...wins);
    rangeDb = 20 * Math.log10(max / min);
    const mean = wins.reduce((x, y) => x + y, 0) / wins.length;
    const variance = wins.reduce((x, y) => x + (y - mean) * (y - mean), 0) / wins.length;
    cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
  }
  const issues: string[] = [];
  // Crest alone cannot judge a single tone (a pure sine has 3 dB
  // crest by nature, not from compression), so the over-compression
  // flag requires broadband content — i.e. a mix, not one note.
  const maxShare = Math.max(...Object.values(a.bands));
  const broadband = 1 - maxShare > 0.4;
  if (a.rms > 1e-4 && a.crestDb < 6 && broadband) {
    issues.push(`excessive compression: crest factor ${a.crestDb.toFixed(1)} dB`);
  }
  if (rangeDb > 12) {
    issues.push(`inconsistent levels: window RMS range ${rangeDb.toFixed(1)} dB`);
  }
  if (cv > 0.4 && a.crestDb < 8) {
    issues.push(`pumping risk: RMS variation ${(cv * 100).toFixed(0)}% with low crest`);
  }
  return { crestDb: a.crestDb, windowRmsRangeDb: rangeDb, windowRmsCv: cv, issues };
}
