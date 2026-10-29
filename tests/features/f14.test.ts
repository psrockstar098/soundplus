/**
 * Tests: F14 automation generation.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { ramp, volumeRide, filterSweep, reverbThrow } from "../../src/features/automation.ts";

describe("F14 automation generation", () => {
  test("ramp hits endpoints and rises monotonically", () => {
    const r = ramp(-12, 0, 5);
    expect(r[0].value).toBe(-12);
    expect(r[4].value).toBe(0);
    for (let i = 1; i < r.length; i++) expect(r[i].value).toBeGreaterThan(r[i - 1].value);
  });

  test("ride interpolates through control points", () => {
    const ride = volumeRide(
      [
        { time: 0, value: -6 },
        { time: 0.5, value: 0 },
        { time: 1, value: -6 },
      ],
      5,
    );
    expect(ride[0].value).toBe(-6);
    expect(ride[2].value).toBe(0);
    expect(ride[4].value).toBe(-6);
  });

  test("filter sweep is log-spaced (constant ratio)", () => {
    const s = filterSweep(100, 10000, 5);
    expect(s[0].value).toBe(100);
    expect(s[4].value).toBe(10000);
    const r1 = s[1].value / s[0].value;
    const r2 = s[2].value / s[1].value;
    expect(r1).toBeCloseTo(r2, 5);
  });

  test("reverb throw is silent outside the window", () => {
    const t = reverbThrow(0.4, 0.6, 0.8);
    expect(t[0].value).toBe(0);
    expect(t[2].value).toBe(0.8);
    expect(t[3].value).toBe(0.8);
    expect(t[5].value).toBe(0);
  });
});
