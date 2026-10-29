/**
 * Tests: F11 track recognition.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { classifyTrack, classifyProject } from "../../src/features/recognition.ts";

describe("F11 track recognition", () => {
  test("names win with high confidence", () => {
    expect(classifyTrack("Lead Vocal")).toEqual({
      track: "Lead Vocal",
      role: "vocal",
      confidence: 0.9,
      basis: "name",
    });
    expect(classifyTrack("Kick In").role).toBe("kick");
    expect(classifyTrack("808 Bass").role).toBe("bass");
    expect(classifyTrack("BGV Harmony").role).toBe("backing-vocal");
    expect(classifyTrack("Snare Top").role).toBe("snare");
    expect(classifyTrack("Gtr Rhythm").role).toBe("guitar");
    expect(classifyTrack("Pad Synth").role).toBe("synth");
  });

  test("audio fallback is low-confidence and honest", () => {
    const sub = { bands: { sub: 0.7, low: 0.1, lowMid: 0.1, mid: 0.05, high: 0.05 } };
    const r = classifyTrack("Track 03", sub);
    expect(r.role).toBe("kick");
    expect(r.confidence).toBeLessThan(0.6);
    expect(r.basis).toBe("audio");
  });

  test("unknown track stays other", () => {
    const r = classifyTrack("Track 07");
    expect(r.role).toBe("other");
    expect(r.basis).toBe("none");
  });

  test("project classification maps every track", () => {
    const out = classifyProject([{ name: "Vocal" }, { name: "Kick" }, { name: "Mystery" }]);
    expect(out.map((o) => o.role)).toEqual(["vocal", "kick", "other"]);
  });
});
