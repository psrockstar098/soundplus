/**
 * Tests: F29 batch processing, F30 regression testing.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { runBatch } from "../../src/features/batch.ts";
import { verifyExport } from "../../src/features/mastering.ts";

function sine(freq: number, amp: number, n = 4096, sr = 44100): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / sr);
  return out;
}

const SETTINGS = { format: "wav", sampleRate: 44100, bitDepth: 24, ceilingDb: -0.3 };

describe("F29 batch processing", () => {
  test("mixed batch: pass and fail recorded per item", () => {
    const out = runBatch([
      { name: "clean", samples: sine(440, 0.5), settings: SETTINGS },
      { name: "clipped", samples: new Float32Array(1000).fill(1.0), settings: SETTINGS },
    ]);
    expect(out.map((o) => [o.name, o.passed])).toEqual([
      ["clean", true],
      ["clipped", false],
    ]);
  });

  test("one throwing item does not stop the batch", () => {
    const boomSamples = new Float32Array([7, 0, 0, 0]);
    const out = runBatch(
      [
        { name: "boom", samples: boomSamples, settings: SETTINGS },
        { name: "ok", samples: sine(440, 0.5), settings: SETTINGS },
      ],
      (samples, settings) => {
        if (samples[0] === 7) throw new Error("workflow broke");
        return verifyExport(samples, settings);
      },
    );
    expect(out[0].passed).toBe(false);
    expect(out[0].error).toContain("workflow broke");
    expect(out[1].passed).toBe(true);
  });
});

