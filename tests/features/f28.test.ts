/**
 * Tests: F26 genre profiles, F27 sound design, F28 mix variants.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { generateMixVariants } from "../../src/features/variants.ts";

describe("F28 mix variants", () => {
  test("variants differ and names are unique", () => {
    const v = generateMixVariants(3);
    expect(v.length).toBe(3);
    expect(new Set(v.map((x) => x.name)).size).toBe(3);
    expect(v[0].eq).not.toEqual(v[1].eq);
  });

  test("count clamps to available variants", () => {
    expect(generateMixVariants(99).length).toBe(4);
    expect(generateMixVariants(0)).toEqual([]);
  });
});
