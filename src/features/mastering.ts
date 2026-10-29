/**
 * F6 — Automatic Mastering and Export Verification (standalone port).
 *
 * Mastering chain builder + export checks on PCM samples.
 * HONEST LABELS: loudness here is an RMS-based dBFS estimate, NOT a
 * LUFS measurement (no K-weighting in this engine); true peak is a
 * parabolic inter-sample estimate around the peak sample, not an
 * oversampled true-peak meter. Both are good enough to catch real
 * problems (clipping, hot exports) and are labeled as estimates.
 */

import { analyzeSamples } from "./dsp.ts";

export type MasteringStep = {
  stage: string;
  tool: string;
  params: Record<string, number | string>;
};

export type ExportSettings = {
  format: string;
  sampleRate: number;
  bitDepth: number;
  ceilingDb: number;
};

export type ExportReport = {
  loudnessDb: number;
  samplePeakDb: number;
  truePeakDb: number;
  clippingSamples: number;
  issues: string[];
  passes: boolean;
  chain: MasteringStep[];
  deliverables: ExportSettings;
};

/** RMS loudness estimate in dBFS (NOT LUFS). */
export function loudnessDb(samples: ArrayLike<number>): number {
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) sumSq += samples[i] * samples[i];
  const rms = samples.length ? Math.sqrt(sumSq / samples.length) : 0;
  return rms > 0 ? 20 * Math.log10(rms) : -Infinity;
}

/** Parabolic inter-sample peak estimate around the loudest sample. */
export function truePeak(samples: ArrayLike<number>): number {
  let peak = 0;
  let idx = -1;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) {
      peak = a;
      idx = i;
    }
  }
  if (idx <= 0 || idx >= samples.length - 1) return peak;
  const y0 = Math.abs(samples[idx - 1]);
  const y1 = Math.abs(samples[idx]);
  const y2 = Math.abs(samples[idx + 1]);
  const denom = y0 - 2 * y1 + y2;
  if (denom === 0) return peak;
  const offset = 0.5 * (y0 - y2) / denom;
  if (Math.abs(offset) > 1) return peak;
  return y1 - 0.25 * (y0 - y2) * offset;
}

export function buildMasteringChain(peakDb: number): MasteringStep[] {
  const chain: MasteringStep[] = [
    { stage: "master-eq", tool: "eq", params: { note: "gentle", highShelfDb: 0.5 } },
    { stage: "glue-compressor", tool: "compressor", params: { ratio: 1.5, thresholdDb: -18 } },
  ];
  // Hotter mixes get a lower limiter ceiling so the export never clips.
  const ceiling = peakDb > -1 ? -1.0 : -0.3;
  chain.push({ stage: "limiter", tool: "limiter", params: { ceilingDb: ceiling } });
  return chain;
}

export function verifyExport(
  samples: ArrayLike<number>,
  settings: ExportSettings,
): ExportReport {
  const a = analyzeSamples(samples);
  const tp = truePeak(samples);
  const samplePeakDb = a.peak > 0 ? 20 * Math.log10(a.peak) : -Infinity;
  const truePeakDb = tp > 0 ? 20 * Math.log10(tp) : -Infinity;
  const issues: string[] = [];
  if (a.clippingSamples > 0) issues.push(`clipping: ${a.clippingSamples} full-scale samples`);
  if (truePeakDb > settings.ceilingDb) {
    issues.push(`true peak ${truePeakDb.toFixed(2)} dB exceeds ceiling ${settings.ceilingDb} dB`);
  }
  if (a.rms < 1e-4) issues.push("silence: nothing to export");
  return {
    loudnessDb: loudnessDb(samples),
    samplePeakDb,
    truePeakDb,
    clippingSamples: a.clippingSamples,
    issues,
    passes: issues.length === 0,
    chain: buildMasteringChain(samplePeakDb),
    deliverables: settings,
  };
}
