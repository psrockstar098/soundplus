/**
 * Tests: F12 session organization, F13 routing assistant.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { planRouting } from "../../src/features/routing.ts";

describe("F13 routing assistant", () => {
  test("full session gets buses, send, sidechain, parallel", () => {
    const p = planRouting(["vocal", "kick", "snare", "bass", "synth"]);
    expect(p.steps.map((s) => s.name)).toEqual([
      "Drum Bus",
      "Vocal Bus",
      "Reverb Send",
      "Kick -> Bass sidechain",
      "Vocal Parallel",
    ]);
    expect(p.blocked).toEqual([]);
  });

  test("sidechain is blocked, not planned, without a kick", () => {
    const p = planRouting(["bass"]);
    expect(p.steps.map((s) => s.name)).toEqual([]);
    expect(p.blocked).toEqual([
      { step: "Kick -> Bass sidechain", reason: "no kick track present" },
    ]);
  });

  test("empty session plans nothing", () => {
    const p = planRouting([]);
    expect(p.steps).toEqual([]);
    expect(p.blocked).toEqual([]);
  });
});
