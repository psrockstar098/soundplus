/**
 * F21 — Vocal Tuning and Timing Assistance (standalone port).
 *
 * Detect pitch via autocorrelation and timing via onset energy
 * jumps, then compare onsets to the beat grid. Results are
 * measurements the AI (or a compatible editing tool) acts on —
 * this module never claims to have retuned anything itself.
 */

export function detectPitch(samples: ArrayLike<number>, sampleRate = 44100): number | null {
  const n = samples.length;
  if (n < 2048) return null;
  let sumSq = 0;
  for (let i = 0; i < n; i++) sumSq += samples[i] * samples[i];
  if (sumSq / n < 1e-6) return null; // silence
  const w = Math.min(n, 2048);
  const minLag = Math.floor(sampleRate / 1000); // 1000 Hz
  const maxLag = Math.floor(sampleRate / 50); // 50 Hz
  let bestLag = -1;
  let bestCorr = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i < w - lag; i++) corr += samples[i] * samples[i + lag];
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }
  if (bestLag < 0) return null;
  // Require a clear periodic peak: best correlation must beat the
  // zero-lag energy by a healthy margin (normalized autocorrelation).
  let zero = 0;
  for (let i = 0; i < w; i++) zero += samples[i] * samples[i];
  if (bestCorr / zero < 0.3) return null;
  return sampleRate / bestLag;
}

/** Onset times in seconds: windows whose energy jumps 3x over the
 *  median energy of all previous windows. The median baseline (not
 *  just the previous window) catches silence-to-sound transitions
 *  even when the change lands mid-window. */
export function detectOnsets(
  samples: ArrayLike<number>,
  sampleRate = 44100,
  windowSize = 512,
): number[] {
  const onsets: number[] = [];
  const prevEnergies: number[] = [];
  for (let start = 0; start < samples.length; start += windowSize) {
    let energy = 0;
    const end = Math.min(samples.length, start + windowSize);
    for (let i = start; i < end; i++) energy += samples[i] * samples[i];
    if (prevEnergies.length > 0 && energy > 1e-4) {
      const sorted = [...prevEnergies].sort((a, b) => a - b);
      const baseline = sorted[Math.floor(sorted.length / 2)];
      if (energy > 3 * baseline) {
        onsets.push(start / sampleRate);
      }
    }
    prevEnergies.push(energy);
  }
  return onsets;
}

/** Timing deviations in ms from the nearest quarter-note grid point. */
export function timingDeviations(onsets: number[], bpm: number): number[] {
  const beat = 60 / bpm;
  return onsets.map((t) => {
    const nearest = Math.round(t / beat) * beat;
    return (t - nearest) * 1000;
  });
}
