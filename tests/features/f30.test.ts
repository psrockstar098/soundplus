/**
 * Tests: F29 batch processing, F30 regression testing.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { compareRenders } from "../../src/features/regression.ts";

function sine(freq: number, amp: number, n = 4096, sr = 44100): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / sr);
  return out;
}

const SETTINGS = { format: "wav", sampleRate: 44100, bitDepth: 24, ceilingDb: -0.3 };

describe("F30 regression testing", () => {
  test("identical renders report zero issues", () => {
    const s = sine(440, 0.5);
    expect(compareRenders({ samples: s, channels: 2 }, { samples: s, channels: 2 })).toEqual([]);
  });

  test("new clipping, channel change, and duration change flagged", () => {
    const prev = sine(440, 0.5);
    const clipped = Float32Array.from(prev);
    clipped[100] = 1.0;
    clipped[101] = 1.0;
    const issues = compareRenders(
      { samples: prev, channels: 2 },
      { samples: clipped.slice(0, 2048), channels: 1 },
    );
    const areas = issues.map((i) => i.area);
    expect(areas).toContain("clipping");
    expect(areas).toContain("channels");
    expect(areas).toContain("duration");
  });

  test("big level change flagged", () => {
    const issues = compareRenders(
      { samples: sine(440, 0.5), channels: 2 },
      { samples: sine(440, 0.1), channels: 2 },
    );
    expect(issues.map((i) => i.area)).toContain("level");
  });
});
