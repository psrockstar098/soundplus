/**
 * Tests: F19 knowledge base, F20 chain optimization.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { optimizeChains } from "../../src/features/chains.ts";

describe("F20 chain optimization", () => {
  test("all permutations ranked, scorer's favorite first", () => {
    const ranked = optimizeChains(["EQ", "Comp", "Limiter"], (chain) =>
      chain.join(",") === "EQ,Comp,Limiter" ? 10 : 1,
    );
    expect(ranked.length).toBe(6);
    expect(ranked[0].chain).toEqual(["EQ", "Comp", "Limiter"]);
    expect(ranked[0].score).toBe(10);
  });

  test("large chains use heuristic orders, not factorial blowup", () => {
    const ranked = optimizeChains(["A", "B", "C", "D", "E"], () => 1);
    expect(ranked.length).toBe(3);
  });

  test("empty chain list ranks empty", () => {
    expect(optimizeChains([], () => 1)).toEqual([]);
  });
});
