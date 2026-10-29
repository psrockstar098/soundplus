/**
 * Tests: F21 tuning and timing.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { detectPitch, detectOnsets, timingDeviations } from "../../src/features/tuning.ts";

function sine(freq: number, amp: number, n = 8192, sr = 44100): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / sr);
  return out;
}

describe("F21 tuning and timing", () => {
  test("pitch detection finds a 440 Hz sine", () => {
    const f = detectPitch(sine(440, 0.5));
    expect(f).not.toBeNull();
    expect(f!).toBeGreaterThan(400);
    expect(f!).toBeLessThan(480);
  });

  test("silence has no pitch", () => {
    expect(detectPitch(new Float32Array(8192))).toBeNull();
  });

  test("onset detection finds energy jumps", () => {
    const samples = new Float32Array(44100);
    for (let i = 22050; i < 44100; i++) samples[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / 44100);
    const onsets = detectOnsets(samples);
    expect(onsets.length).toBeGreaterThan(0);
    expect(onsets[0]).toBeCloseTo(0.5, 1);
  });

  test("timing deviations measured against the grid", () => {
    const devs = timingDeviations([0.5, 1.02], 120); // beat = 0.5 s
    expect(devs[0]).toBeCloseTo(0, 0);
    expect(devs[1]).toBeCloseTo(20, 0);
  });
});
