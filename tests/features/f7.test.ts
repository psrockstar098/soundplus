/**
 * Tests: F7 reference-track matching. Synthetic audio only.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import {
  featuresOf,
  compareToReference,
  testCorrectiveChange,
  stereoWidth,
} from "../../src/features/reference.ts";

function sine(freq: number, amp: number, n = 4096, sr = 44100): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / sr);
  return out;
}

describe("F7 reference matching", () => {
  test("identical mixes need no correction", () => {
    const f = featuresOf(sine(440, 0.5));
    expect(compareToReference(f, f)).toEqual([]);
  });

  test("louder mix gets a gain-down recommendation that tests better", () => {
    const mix = sine(440, 0.8);
    const ref = featuresOf(sine(440, 0.4));
    const recs = compareToReference(featuresOf(mix), ref);
    const loud = recs.find((r) => r.area === "loudness");
    expect(loud).toBeDefined();
    expect(loud!.gainDb).toBeLessThan(0);
    const t = testCorrectiveChange(mix, ref, loud!.gainDb);
    expect(t.improved).toBe(true);
    expect(t.after).toBeLessThan(t.before);
  });

  test("stereo width: identical channels 0, opposite channels 1", () => {
    const l = sine(440, 0.5);
    expect(stereoWidth(l, l)).toBeCloseTo(0, 2);
    const r = new Float32Array(l.length);
    for (let i = 0; i < l.length; i++) r[i] = -l[i];
    expect(stereoWidth(l, r)).toBeCloseTo(1, 2);
  });
});
