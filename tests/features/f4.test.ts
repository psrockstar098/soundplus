/**
 * Tests: F3 DSP diagnosis, F4 autonomous mix loop, F5 vocal/drum plans.
 * Synthetic audio only — no real DAWs, no real models.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { autonomousMix } from "../../src/features/mixing.ts";

describe("F4 autonomous mixing loop", () => {
  test("stops at target once steps improve", async () => {
    let score = 0;
    const r = await autonomousMix({
      target: 0.9,
      maxRounds: 5,
      steps: [
        {
          name: "balance",
          execute: async () => {
            score = Math.min(1, score + 0.5);
          },
          evaluate: () => score,
        },
      ],
    });
    expect(r.stopped).toBe("target");
    expect(r.rounds.length).toBe(2);
    expect(r.finalScore).toBe(1);
  });

  test("exhausts rounds when nothing improves", async () => {
    const r = await autonomousMix({
      target: 0.9,
      maxRounds: 3,
      steps: [{ name: "flat", execute: async () => {}, evaluate: () => 0.2 }],
    });
    expect(r.stopped).toBe("max-rounds");
    expect(r.rounds.length).toBe(3);
  });

  test("a failing step is recorded, never crashes the loop", async () => {
    const r = await autonomousMix({
      target: 0.9,
      maxRounds: 1,
      steps: [
        {
          name: "boom",
          execute: async () => {
            throw new Error("bridge down");
          },
          evaluate: () => 1,
        },
      ],
    });
    expect(r.failures.length).toBe(1);
    expect(r.failures[0]).toContain("bridge down");
    expect(r.finalScore).toBe(0);
  });
});

