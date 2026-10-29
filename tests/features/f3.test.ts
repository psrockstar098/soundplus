/**
 * Tests: F3 DSP diagnosis, F4 autonomous mix loop, F5 vocal/drum plans.
 * Synthetic audio only — no real DAWs, no real models.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { analyzeSamples, diagnose } from "../../src/features/dsp.ts";

function sine(freq: number, amp: number, n = 4096, sr = 44100): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / sr);
  return out;
}

describe("F3 audio diagnosis", () => {
  test("sine wave: known peak and RMS", () => {
    const a = analyzeSamples(sine(440, 0.5));
    expect(a.peak).toBeCloseTo(0.5, 1);
    expect(a.rms).toBeCloseTo(0.5 / Math.SQRT2, 1);
    expect(a.clippingSamples).toBe(0);
  });

  test("clipping detected at full scale", () => {
    const samples = new Float32Array(1000).fill(1.0);
    const a = analyzeSamples(samples);
    expect(a.clippingSamples).toBe(1000);
    expect(diagnose(a).some((d) => d.issue === "clipping")).toBe(true);
  });

  test("silence flagged, high-frequency content flagged harsh", () => {
    expect(diagnose(analyzeSamples(new Float32Array(1000))).some((d) => d.issue === "silence")).toBe(true);
    const hi = analyzeSamples(sine(10000, 0.5));
    expect(hi.bands.high).toBeGreaterThan(0.5);
    expect(diagnose(hi).some((d) => d.issue === "harshness")).toBe(true);
  });

  test("low sine lands in the sub band", () => {
    const lo = analyzeSamples(sine(80, 0.5));
    expect(lo.bands.sub).toBeGreaterThan(0.5);
  });
});

