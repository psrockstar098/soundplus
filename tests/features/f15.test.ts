/**
 * Tests: F15 project health scanner.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { scanHealth } from "../../src/features/health.ts";
import type { ProjectState } from "../../src/features/project.ts";

describe("F15 project health scanner", () => {
  test("clean project reports zero issues", () => {
    const state: ProjectState = {
      name: "Clean",
      tracks: [
        { name: "Vocal", role: "vocal", muted: false, volume: 0.8, inserts: ["EQ"], sends: ["Reverb"] },
      ],
      routing: [],
    };
    expect(scanHealth(state, { buses: ["Reverb"] })).toEqual([]);
  });

  test("muted, hot, bare, duplicate, missing media, bad send all flagged", () => {
    const state: ProjectState = {
      name: "Messy",
      tracks: [
        { name: "Pad", role: "synth", muted: true, volume: 0.5, inserts: ["EQ"], sends: [] },
        { name: "Vox", role: "vocal", muted: false, volume: 1.2, inserts: ["EQ"], sends: ["NoSuchBus"] },
        { name: "Kick", role: "kick", muted: false, volume: 0.9, inserts: ["EQ"], sends: [] },
        { name: "Bass", role: "bass", muted: false, volume: 0.9, inserts: [], sends: [] },
      ],
      routing: [],
    };
    const issues = scanHealth(state, {
      buses: ["Reverb"],
      media: [{ track: "Vox", exists: false }],
    });
    const areas = issues.map((i) => i.area);
    expect(areas).toContain("muted");
    expect(areas).toContain("gain");
    expect(areas).toContain("routing");
    expect(areas).toContain("duplicate-processing");
    expect(areas).toContain("media");
    expect(issues.find((i) => i.area === "gain")?.severity).toBe("error");
  });
});
