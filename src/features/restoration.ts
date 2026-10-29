/**
 * F22 — Audio Restoration (standalone port).
 *
 * Identify clicks, mains hum, noise floor, and plosive bursts.
 * Click repair is real processing (linear interpolation across the
 * spike); hum/noise/plosive reports are detections that a cleanup
 * tool acts on — the module never claims audio it did not repair.
 */

function goertzel(samples: ArrayLike<number>, freq: number, sampleRate: number): number {
  const k = Math.floor(0.5 + (samples.length * freq) / sampleRate);
  const w = (2 * Math.PI * k) / samples.length;
  const cw = Math.cos(w);
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < samples.length; i++) {
    s0 = samples[i] + 2 * cw * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return Math.sqrt(s1 * s1 + s2 * s2 - 2 * cw * s1 * s2);
}

/** Indices of click spikes: a jump out and back beyond threshold. */
export function detectClicks(samples: ArrayLike<number>, threshold = 0.5): number[] {
  const out: number[] = [];
  for (let i = 1; i < samples.length - 1; i++) {
    if (
      Math.abs(samples[i] - samples[i - 1]) > threshold &&
      Math.abs(samples[i + 1] - samples[i]) > threshold
    ) {
      out.push(i);
    }
  }
  return out;
}

/** Replace click samples with linear interpolation between neighbors. */
export function repairClicks(samples: ArrayLike<number>, clicks: number[]): Float32Array {
  const out = Float32Array.from(samples);
  for (const i of clicks) {
    if (i > 0 && i < out.length - 1) out[i] = (out[i - 1] + out[i + 1]) / 2;
  }
  return out;
}

/** Mains hum: 50 or 60 Hz Goertzel magnitude dominating total energy. */
export function detectHum(
  samples: ArrayLike<number>,
  sampleRate = 44100,
): { freq: number; ratio: number } | null {
  let total = 0;
  for (let i = 0; i < samples.length; i++) total += samples[i] * samples[i];
  if (total === 0) return null;
  for (const freq of [50, 60]) {
    const mag = goertzel(samples, freq, sampleRate);
    // Goertzel magnitude scales with N/2 for a pure tone; compare
    // against sqrt(total energy) as a rough dominance ratio.
    const ratio = mag / Math.sqrt(total);
    if (ratio > 8) return { freq, ratio };
  }
  return null;
}

/** RMS of the quietest 10% of windows — the noise floor estimate. */
export function noiseFloor(samples: ArrayLike<number>, windowSize = 1024): number {
  const rmsList: number[] = [];
  for (let start = 0; start + windowSize <= samples.length; start += windowSize) {
    let sumSq = 0;
    for (let i = start; i < start + windowSize; i++) sumSq += samples[i] * samples[i];
    rmsList.push(Math.sqrt(sumSq / windowSize));
  }
  if (rmsList.length === 0) return 0;
  rmsList.sort((a, b) => a - b);
  const quiet = rmsList.slice(0, Math.max(1, Math.floor(rmsList.length * 0.1)));
  return quiet.reduce((a, b) => a + b, 0) / quiet.length;
}
