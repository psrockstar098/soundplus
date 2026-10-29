/**
 * Tests: F23 phase/stereo, F24 masking, F25 dynamics.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { analyzeDynamics } from "../../src/features/dynamics.ts";

function sine(freq: number, amp: number, n = 4096, sr = 44100): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / sr);
  return out;
}

describe("F25 dynamics", () => {
  test("steady sine has no dynamics issues", () => {
    expect(analyzeDynamics(sine(440, 0.5)).issues).toEqual([]);
  });

  test("broadband squashed mix reads as over-compressed", () => {
    // Sum of tones across bands, hard-clamped: low crest + spread bands.
    const n = 16384;
    const sr = 44100;
    const sq = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const v =
        0.4 * Math.sin((2 * Math.PI * 100 * i) / sr) +
        0.4 * Math.sin((2 * Math.PI * 440 * i) / sr) +
        0.4 * Math.sin((2 * Math.PI * 2000 * i) / sr) +
        0.3 * Math.sin((2 * Math.PI * 8000 * i) / sr);
      sq[i] = Math.max(-0.4, Math.min(0.4, v));
    }
    const r = analyzeDynamics(sq);
    expect(r.issues.some((x) => x.includes("compression"))).toBe(true);
  });

  test("alternating loud/quiet segments flag level inconsistency", () => {
    const samples = new Float32Array(40960);
    for (let i = 0; i < samples.length; i++) {
      const amp = Math.floor(i / 4096) % 2 === 0 ? 0.8 : 0.05;
      samples[i] = amp * Math.sin((2 * Math.PI * 440 * i) / 44100);
    }
    const r = analyzeDynamics(samples);
    expect(r.issues.some((x) => x.includes("inconsistent"))).toBe(true);
  });
});
