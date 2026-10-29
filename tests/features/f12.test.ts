/**
 * Tests: F12 session organization, F13 routing assistant.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { organizeSession, groupTracks, ROLE_COLORS } from "../../src/features/organization.ts";

describe("F12 session organization", () => {
  test("roles get colors, groups, and prefixed names", () => {
    const out = organizeSession([
      { name: "Lead", role: "vocal" },
      { name: "Kick In", role: "kick" },
      { name: "Pad", role: "synth" },
    ]);
    expect(out[0]).toEqual({
      original: "Lead",
      renamed: "vocal - Lead",
      role: "vocal",
      color: ROLE_COLORS.vocal,
      group: "Vocals",
    });
    expect(out[1].group).toBe("Drums");
    expect(groupTracks(out)).toEqual({
      Vocals: ["vocal - Lead"],
      Drums: ["kick - Kick In"],
      Instruments: ["synth - Pad"],
    });
  });

  test("renaming is idempotent", () => {
    const out = organizeSession([{ name: "vocal - Lead", role: "vocal" }]);
    expect(out[0].renamed).toBe("vocal - Lead");
  });
});

