/**
 * Tests: F22 restoration.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { detectClicks, repairClicks, detectHum, noiseFloor } from "../../src/features/restoration.ts";

function sine(freq: number, amp: number, n = 44100, sr = 44100): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / sr);
  return out;
}

describe("F22 restoration", () => {
  test("click spike detected and repaired to neighbors", () => {
    const samples = sine(440, 0.3);
    samples[10000] = 1.0; // injected click
    const clicks = detectClicks(samples);
    expect(clicks).toContain(10000);
    const repaired = repairClicks(samples, clicks);
    expect(Math.abs(repaired[10000] - samples[9999])).toBeLessThan(0.1);
    expect(detectClicks(repaired)).not.toContain(10000);
  });

  test("clean sine has no clicks", () => {
    expect(detectClicks(sine(440, 0.3))).toEqual([]);
  });

  test("50 Hz hum detected, clean audio not flagged", () => {
    const hum = detectHum(sine(50, 0.5));
    expect(hum).not.toBeNull();
    expect(hum!.freq).toBe(50);
    expect(detectHum(sine(440, 0.5))).toBeNull();
  });

  test("noise floor of silence is zero, of quiet audio is small", () => {
    expect(noiseFloor(new Float32Array(8192))).toBe(0);
    const quiet = sine(440, 0.01);
    expect(noiseFloor(quiet)).toBeGreaterThan(0);
    expect(noiseFloor(quiet)).toBeLessThan(0.05);
  });
});
