/**
 * Tests: F6 mastering and export verification. Synthetic audio only.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { loudnessDb, truePeak, verifyExport, buildMasteringChain } from "../../src/features/mastering.ts";

function sine(freq: number, amp: number, n = 4096, sr = 44100): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / sr);
  return out;
}

describe("F6 mastering and export", () => {
  test("sine loudness and true peak match theory", () => {
    const s = sine(440, 0.5);
    expect(loudnessDb(s)).toBeCloseTo(-9.03, 1);
    expect(truePeak(s)).toBeCloseTo(0.5, 1);
  });

  test("clean export passes, clipped export fails", () => {
    const clean = verifyExport(sine(440, 0.5), {
      format: "wav",
      sampleRate: 44100,
      bitDepth: 24,
      ceilingDb: -0.3,
    });
    expect(clean.passes).toBe(true);
    expect(clean.chain.map((c) => c.stage)).toContain("limiter");
    const clipped = verifyExport(new Float32Array(1000).fill(1.0), {
      format: "wav",
      sampleRate: 44100,
      bitDepth: 24,
      ceilingDb: -0.3,
    });
    expect(clipped.passes).toBe(false);
    expect(clipped.issues.some((i) => i.includes("clipping"))).toBe(true);
  });

  test("hot mix gets a lower limiter ceiling", () => {
    const hot = buildMasteringChain(-0.1);
    expect(hot.find((c) => c.stage === "limiter")?.params.ceilingDb).toBe(-1.0);
    const cool = buildMasteringChain(-6);
    expect(cool.find((c) => c.stage === "limiter")?.params.ceilingDb).toBe(-0.3);
  });
});
