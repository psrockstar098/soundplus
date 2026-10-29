/**
 * F30 — Audio Quality Regression Testing (standalone port).
 *
 * Compare a new render against a previous version: duration,
 * channels, level, clipping, and waveform similarity. Any
 * meaningful regression is an issue with a concrete cause —
 * identical renders report zero issues.
 */

export type RenderInput = {
  samples: ArrayLike<number>;
  channels: number;
};

export type RegressionIssue = { area: string; detail: string };

function rms(samples: ArrayLike<number>): number {
  if (samples.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) sumSq += samples[i] * samples[i];
  return Math.sqrt(sumSq / samples.length);
}

function clippingCount(samples: ArrayLike<number>): number {
  let n = 0;
  for (let i = 0; i < samples.length; i++) if (Math.abs(samples[i]) >= 0.999) n++;
  return n;
}

function correlation(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
  }
  const meanA = sumA / n;
  const meanB = sumB / n;
  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }
  const denom = Math.sqrt(varA * varB);
  return denom > 0 ? cov / denom : 0;
}

export function compareRenders(prev: RenderInput, next: RenderInput): RegressionIssue[] {
  const issues: RegressionIssue[] = [];
  if (prev.channels !== next.channels) {
    issues.push({
      area: "channels",
      detail: `channel count changed ${prev.channels} -> ${next.channels}`,
    });
  }
  const lenDelta = Math.abs(prev.samples.length - next.samples.length);
  const lenBase = Math.max(prev.samples.length, next.samples.length, 1);
  if (lenDelta / lenBase > 0.01) {
    issues.push({
      area: "duration",
      detail: `length changed ${prev.samples.length} -> ${next.samples.length} samples`,
    });
  }
  const prevClip = clippingCount(prev.samples);
  const nextClip = clippingCount(next.samples);
  if (nextClip > prevClip) {
    issues.push({
      area: "clipping",
      detail: `new render adds ${nextClip - prevClip} clipped samples`,
    });
  }
  const prevRms = rms(prev.samples);
  const nextRms = rms(next.samples);
  if (prevRms > 1e-6 && nextRms > 1e-6) {
    const deltaDb = Math.abs(20 * Math.log10(nextRms / prevRms));
    if (deltaDb > 3) {
      issues.push({ area: "level", detail: `level changed ${deltaDb.toFixed(1)} dB` });
    }
  }
  if (prev.samples.length > 0 && next.samples.length > 0) {
    const corr = correlation(prev.samples, next.samples);
    if (corr < 0.9) {
      issues.push({
        area: "content",
        detail: `waveform similarity dropped to ${corr.toFixed(2)}`,
      });
    }
  }
  return issues;
}
