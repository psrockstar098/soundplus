/**
 * Tests: F23 phase/stereo, F24 masking, F25 dynamics.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { detectMasking } from "../../src/features/masking.ts";

function sine(freq: number, amp: number, n = 4096, sr = 44100): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / sr);
  return out;
}

describe("F24 masking", () => {
  test("two low-mid-dominant tracks mask each other", () => {
    const bands = { sub: 0.1, low: 0.1, lowMid: 0.6, mid: 0.1, high: 0.1 };
    const out = detectMasking([
      { name: "Guitar", bands },
      { name: "Keys", bands },
    ]);
    expect(out.length).toBe(1);
    expect(out[0].band).toBe("lowMid");
    expect(out[0].recommendation.length).toBeGreaterThan(0);
  });

  test("tracks in different bands do not mask", () => {
    const out = detectMasking([
      { name: "Kick", bands: { sub: 0.8, low: 0.1, lowMid: 0.05, mid: 0.03, high: 0.02 } },
      { name: "Hat", bands: { sub: 0.02, low: 0.03, lowMid: 0.05, mid: 0.1, high: 0.8 } },
    ]);
    expect(out).toEqual([]);
  });
});

