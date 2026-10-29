/**
 * F23 — Phase and Stereo Analysis (standalone port).
 *
 * Correlation, L/R imbalance, and mono-compatibility from real
 * stereo samples. Anti-phase material (correlation near -1) makes
 * the mono sum collapse — flagged as a cancellation issue, not a
 * guess.
 */

export type StereoAnalysis = {
  correlation: number;
  imbalanceDb: number;
  monoDropDb: number;
  issues: string[];
};

function rms(samples: ArrayLike<number>): number {
  if (samples.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) sumSq += samples[i] * samples[i];
  return Math.sqrt(sumSq / samples.length);
}

export function analyzeStereo(left: ArrayLike<number>, right: ArrayLike<number>): StereoAnalysis {
  const n = Math.min(left.length, right.length);
  const issues: string[] = [];
  if (n === 0) {
    return { correlation: 0, imbalanceDb: 0, monoDropDb: 0, issues: ["no stereo samples"] };
  }
  let sumL = 0;
  let sumR = 0;
  let sumLR = 0;
  let sumL2 = 0;
  let sumR2 = 0;
  for (let i = 0; i < n; i++) {
    sumL += left[i];
    sumR += right[i];
    sumLR += left[i] * right[i];
    sumL2 += left[i] * left[i];
    sumR2 += right[i] * right[i];
  }
  const meanL = sumL / n;
  const meanR = sumR / n;
  let cov = 0;
  let varL = 0;
  let varR = 0;
  for (let i = 0; i < n; i++) {
    const dl = left[i] - meanL;
    const dr = right[i] - meanR;
    cov += dl * dr;
    varL += dl * dl;
    varR += dr * dr;
  }
  const denom = Math.sqrt(varL * varR);
  const correlation = denom > 0 ? cov / denom : 0;
  const rmsL = rms(left);
  const rmsR = rms(right);
  const imbalanceDb =
    rmsL > 0 && rmsR > 0 ? 20 * Math.log10(rmsL / rmsR) : 0;
  // Mono sum vs average stereo level: a big drop means cancellation.
  let monoSq = 0;
  for (let i = 0; i < n; i++) {
    const m = (left[i] + right[i]) / 2;
    monoSq += m * m;
  }
  const monoRms = Math.sqrt(monoSq / n);
  const stereoRms = Math.sqrt((rmsL * rmsL + rmsR * rmsR) / 2);
  const monoDropDb =
    monoRms > 0 && stereoRms > 0 ? 20 * Math.log10(stereoRms / monoRms) : 0;
  if (correlation < -0.5) {
    issues.push(`phase cancellation risk: correlation ${correlation.toFixed(2)}`);
  }
  if (Math.abs(imbalanceDb) > 3) {
    issues.push(`stereo imbalance: ${imbalanceDb.toFixed(1)} dB L/R`);
  }
  if (monoDropDb > 6) {
    issues.push(`mono-compatibility: mono sum drops ${monoDropDb.toFixed(1)} dB`);
  }
  return { correlation, imbalanceDb, monoDropDb, issues };
}
