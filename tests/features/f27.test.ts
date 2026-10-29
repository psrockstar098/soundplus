/**
 * Tests: F26 genre profiles, F27 sound design, F28 mix variants.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { buildSoundDesign } from "../../src/features/soundDesign.ts";

describe("F27 sound design", () => {
  test("each type yields its stages in order", () => {
    expect(buildSoundDesign("riser").map((s) => s.stage)).toEqual([
      "noise-bed",
      "filter-sweep-up",
      "gain-ramp",
      "reverb-build",
    ]);
    expect(buildSoundDesign("impact").map((s) => s.stage)).toEqual([
      "transient",
      "low-thump",
      "reverb-tail",
    ]);
    expect(buildSoundDesign("texture").map((s) => s.stage)).toEqual([
      "pad",
      "chorus",
      "long-reverb",
    ]);
    expect(buildSoundDesign("transition").map((s) => s.stage)).toEqual([
      "filter-sweep",
      "riser",
      "impact",
      "breath",
    ]);
  });
});

