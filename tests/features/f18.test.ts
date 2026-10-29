/**
 * Tests: F17 plugin substitution, F18 preset intelligence.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { recommendPresets, type Preset } from "../../src/features/presets.ts";

const CATALOG: PluginEntry[] = [
  { name: "Fruity Parametric EQ 2", vendor: "Image-Line", format: "native", purposes: ["eq"] },
  { name: "Pro-Q 3", vendor: "FabFilter", format: "VST3", purposes: ["eq"] },
  { name: "Fruity Limiter", vendor: "Image-Line", format: "native", purposes: ["limiter", "compressor"] },
];

const PRESETS: Preset[] = [
  { name: "Afro Vocal Air", plugin: "Pro-Q 3", genres: ["afrobeats"], sources: ["vocal"], sounds: ["airy", "bright"] },
  { name: "Hip Hop Vocal", plugin: "Pro-Q 3", genres: ["hip-hop"], sources: ["vocal"], sounds: ["warm"] },
  { name: "EDM Bass Growl", plugin: "Serum", genres: ["edm"], sources: ["bass"], sounds: ["aggressive"] },
];

describe("F18 preset intelligence", () => {
  test("exact genre+source match ranks first", () => {
    const out = recommendPresets(PRESETS, { genre: "afrobeats", source: "vocal" });
    expect(out[0].preset.name).toBe("Afro Vocal Air");
    expect(out[0].score).toBe(4);
  });

  test("no overlap recommends nothing", () => {
    expect(recommendPresets(PRESETS, { genre: "gospel", source: "choir" })).toEqual([]);
  });

  test("sound tag adds a point", () => {
    const out = recommendPresets(PRESETS, { sound: "warm" });
    expect(out.map((o) => o.preset.name)).toEqual(["Hip Hop Vocal"]);
  });
});
