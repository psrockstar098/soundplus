/**
 * Tests: F17 plugin substitution, F18 preset intelligence.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { substitute } from "../../src/features/substitution.ts";
import type { PluginEntry } from "../../src/features/plugins.ts";

const CATALOG: PluginEntry[] = [
  { name: "Fruity Parametric EQ 2", vendor: "Image-Line", format: "native", purposes: ["eq"] },
  { name: "Pro-Q 3", vendor: "FabFilter", format: "VST3", purposes: ["eq"] },
  { name: "Fruity Limiter", vendor: "Image-Line", format: "native", purposes: ["limiter", "compressor"] },
];

describe("F17 plugin substitution", () => {
  test("installed preferred plugin is returned as available", () => {
    const r = substitute(CATALOG, "Pro-Q 3", "eq");
    expect(r.status).toBe("available");
  });

  test("missing plugin yields same-purpose alternatives", () => {
    const r = substitute(CATALOG, "Some Other EQ", "eq");
    expect(r.status).toBe("substituted");
    if (r.status === "substituted") {
      expect(r.alternatives.length).toBe(2);
      expect(r.alternatives.every((p) => p.purposes.includes("eq"))).toBe(true);
    }
  });

  test("no match says so plainly", () => {
    const r = substitute(CATALOG, "Some Reverb", "reverb");
    expect(r.status).toBe("unavailable");
    const noPurpose = substitute(CATALOG, "Missing Plugin");
    expect(noPurpose.status).toBe("unavailable");
  });
});

