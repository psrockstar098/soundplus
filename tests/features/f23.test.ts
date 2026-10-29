/**
 * Tests: F23 phase/stereo, F24 masking, F25 dynamics.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { analyzeStereo } from "../../src/features/stereo.ts";

function sine(freq: number, amp: number, n = 4096, sr = 44100): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / sr);
  return out;
}

describe("F23 phase and stereo", () => {
  test("identical channels: correlation 1, no issues", () => {
    const l = sine(440, 0.5);
    const a = analyzeStereo(l, l);
    expect(a.correlation).toBeCloseTo(1, 2);
    expect(a.issues).toEqual([]);
  });

  test("opposite channels: correlation -1, cancellation flagged", () => {
    const l = sine(440, 0.5);
    const r = new Float32Array(l.length);
    for (let i = 0; i < l.length; i++) r[i] = -l[i];
    const a = analyzeStereo(l, r);
    expect(a.correlation).toBeCloseTo(-1, 2);
    expect(a.issues.some((x) => x.includes("cancellation"))).toBe(true);
  });

  test("imbalance flagged past 3 dB", () => {
    const a = analyzeStereo(sine(440, 0.8), sine(440, 0.4));
    expect(a.issues.some((x) => x.includes("imbalance"))).toBe(true);
  });
});

