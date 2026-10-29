/**
 * F14 — Automation Generation (standalone port).
 *
 * Automation CURVES as point data: volume rides, filter sweeps,
 * reverb throws, delay transitions. Curves are pure data — the DAW
 * writes them through its bridge in Phase 4. Filter sweeps use
 * logarithmic interpolation (correct for pitch); rides use linear
 * interpolation between control points.
 */

export type AutoPoint = { time: number; value: number };

/** Linear ramp from `from` to `to` across `steps` points. */
export function ramp(from: number, to: number, steps: number): AutoPoint[] {
  if (steps < 2) return [{ time: 0, value: from }];
  const out: AutoPoint[] = [];
  for (let i = 0; i < steps; i++) {
    out.push({ time: i / (steps - 1), value: from + ((to - from) * i) / (steps - 1) });
  }
  return out;
}

/** Volume ride: linear interpolation through control points. */
export function volumeRide(control: AutoPoint[], steps: number): AutoPoint[] {
  if (control.length === 0) return [];
  const sorted = [...control].sort((a, b) => a.time - b.time);
  if (sorted.length === 1) return Array.from({ length: steps }, (_, i) => ({ time: i / Math.max(1, steps - 1), value: sorted[0].value }));
  const out: AutoPoint[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    let seg = sorted.length - 2;
    for (let j = 0; j < sorted.length - 1; j++) {
      if (t <= sorted[j + 1].time) {
        seg = j;
        break;
      }
    }
    const a = sorted[seg];
    const b = sorted[seg + 1];
    const f = b.time === a.time ? 0 : (t - a.time) / (b.time - a.time);
    out.push({ time: t, value: a.value + (b.value - a.value) * f });
  }
  return out;
}

/** Filter sweep: log interpolation from fromHz to toHz. */
export function filterSweep(fromHz: number, toHz: number, steps: number): AutoPoint[] {
  if (steps < 2) return [{ time: 0, value: fromHz }];
  const out: AutoPoint[] = [];
  const ratio = toHz / fromHz;
  for (let i = 0; i < steps; i++) {
    const f = i / (steps - 1);
    out.push({ time: f, value: fromHz * Math.pow(ratio, f) });
  }
  return out;
}

/** Reverb throw: silence, a burst of `amount` during [start, end], silence. */
export function reverbThrow(start: number, end: number, amount: number): AutoPoint[] {
  return [
    { time: 0, value: 0 },
    { time: Math.max(0, start - 0.001), value: 0 },
    { time: start, value: amount },
    { time: end, value: amount },
    { time: Math.min(1, end + 0.001), value: 0 },
    { time: 1, value: 0 },
  ];
}
