/**
 * F3 — AI Audio Listening and Diagnosis (standalone port).
 *
 * Pure DSP on PCM samples — no model required, no DAW required.
 * Analysis: peak, RMS, crest factor, clipping, DC offset, and band
 * energy shares from a small DFT window. Diagnosis flags are labeled
 * HEURISTICS with fixed thresholds, not lab-grade measurements:
 * they guide the AI's next move (F4), they do not certify audio.
 */

export type BandShares = {
  sub: number;
  low: number;
  lowMid: number;
  mid: number;
  high: number;
};

export type AudioAnalysis = {
  peak: number;
  rms: number;
  crestDb: number;
  clippingSamples: number;
  dcOffset: number;
  bands: BandShares;
};

function bandOf(freq: number): keyof BandShares {
  if (freq < 120) return "sub";
  if (freq < 300) return "low";
  if (freq < 1000) return "lowMid";
  if (freq < 6000) return "mid";
  return "high";
}

export function analyzeSamples(samples: ArrayLike<number>, sampleRate = 44100): AudioAnalysis {
  const n = samples.length;
  if (n === 0) {
    return {
      peak: 0,
      rms: 0,
      crestDb: 0,
      clippingSamples: 0,
      dcOffset: 0,
      bands: { sub: 0, low: 0, lowMid: 0, mid: 0, high: 0 },
    };
  }
  let peak = 0;
  let sumSq = 0;
  let sum = 0;
  let clipping = 0;
  for (let i = 0; i < n; i++) {
    const v = samples[i];
    const a = Math.abs(v);
    if (a > peak) peak = a;
    sumSq += v * v;
    sum += v;
    if (a >= 0.999) clipping++;
  }
  const rms = Math.sqrt(sumSq / n);
  const crestDb = rms > 0 ? 20 * Math.log10(peak / rms) : 0;

  // DFT window (max 1024 samples) with a Hann taper to limit leakage,
  // then band energy shares.
  const w = Math.min(n, 1024);
  const totals: BandShares = { sub: 0, low: 0, lowMid: 0, mid: 0, high: 0 };
  let total = 0;
  for (let k = 1; k < w / 2; k++) {
    let re = 0;
    let im = 0;
    for (let t = 0; t < w; t++) {
      const hann = 0.5 * (1 - Math.cos((2 * Math.PI * t) / (w - 1)));
      const ang = (2 * Math.PI * k * t) / w;
      re += samples[t] * hann * Math.cos(ang);
      im -= samples[t] * hann * Math.sin(ang);
    }
    const mag = Math.sqrt(re * re + im * im);
    const band = bandOf((k * sampleRate) / w);
    totals[band] += mag;
    total += mag;
  }
  const bands: BandShares = {
    sub: total ? totals.sub / total : 0,
    low: total ? totals.low / total : 0,
    lowMid: total ? totals.lowMid / total : 0,
    mid: total ? totals.mid / total : 0,
    high: total ? totals.high / total : 0,
  };
  return { peak, rms, crestDb, clippingSamples: clipping, dcOffset: sum / n, bands };
}

export type Diagnosis = { issue: string; detail: string };

/** Heuristic flags — thresholds are starting points, not measurements. */
export function diagnose(a: AudioAnalysis): Diagnosis[] {
  const out: Diagnosis[] = [];
  if (a.rms < 1e-4) out.push({ issue: "silence", detail: "RMS is effectively zero" });
  if (a.clippingSamples > 0) {
    out.push({ issue: "clipping", detail: `${a.clippingSamples} samples at full scale` });
  }
  if (Math.abs(a.dcOffset) > 0.01) {
    out.push({ issue: "dc-offset", detail: `mean offset ${a.dcOffset.toFixed(4)}` });
  }
  if (a.bands.high > 0.25) {
    out.push({ issue: "harshness", detail: `high band share ${(a.bands.high * 100).toFixed(0)}%` });
  }
  if (a.bands.lowMid > 0.45) {
    out.push({ issue: "muddiness", detail: `low-mid share ${(a.bands.lowMid * 100).toFixed(0)}%` });
  }
  if (a.rms > 1e-4 && a.crestDb < 8) {
    out.push({ issue: "weak-transients", detail: `crest factor ${a.crestDb.toFixed(1)} dB` });
  }
  return out;
}
