/**
 * Tests: F3 DSP diagnosis, F4 autonomous mix loop, F5 vocal/drum plans.
 * Synthetic audio only — no real DAWs, no real models.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { buildVocalChain, buildDrumPlan } from "../../src/features/vocalDrum.ts";

describe("F5 vocal and drum plans", () => {
  test("vocal chain order is de-ess, EQ, compression", () => {
    const chain = buildVocalChain();
    expect(chain.map((s) => s.stage)).toEqual(["de-ess", "clarity-eq", "compression"]);
  });

  test("drum plan only includes stages for present roles", () => {
    const full = buildDrumPlan({ kick: true, snare: true, bass: true });
    expect(full.map((s) => s.stage)).toEqual([
      "kick-bass-balance",
      "snare-punch",
      "drum-bus",
      "reverb-management",
    ]);
    const snareOnly = buildDrumPlan({ kick: false, snare: true, bass: false });
    expect(snareOnly.map((s) => s.stage)).toEqual([
      "snare-punch",
      "drum-bus",
      "reverb-management",
    ]);
    expect(buildDrumPlan({ kick: false, snare: false, bass: false })).toEqual([]);
  });
});
