/**
 * Tests: F16 parameter understanding.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { inferConcept, describeParam, mapInstruction, type ParamDef } from "../../src/features/params.ts";

const EQ_PARAMS: ParamDef[] = [
  { name: "Gain", unit: "dB", min: -12, max: 12, defaultValue: 0 },
  { name: "Frequency", unit: "Hz", min: 20, max: 20000, defaultValue: 1000 },
  { name: "Q", unit: "", min: 0.5, max: 10, defaultValue: 1 },
  { name: "Threshold", unit: "dB", min: -60, max: 0, defaultValue: -18 },
];

describe("F16 parameter understanding", () => {
  test("concepts inferred from names", () => {
    expect(inferConcept(EQ_PARAMS[0])).toBe("gain");
    expect(inferConcept(EQ_PARAMS[1])).toBe("frequency");
    expect(inferConcept(EQ_PARAMS[2])).toBe("q");
    expect(inferConcept(EQ_PARAMS[3])).toBe("threshold");
    expect(inferConcept({ name: "Mystery Knob", unit: "", min: 0, max: 1, defaultValue: 0 })).toBe("unknown");
  });

  test("description states concept, range, and default", () => {
    const d = describeParam(EQ_PARAMS[3]);
    expect(d).toContain("threshold");
    expect(d).toContain("-60 to 0 dB");
    expect(d).toContain("-18 dB");
  });

  test("instruction maps to verified params with direction", () => {
    const m = mapInstruction("boost the highs", EQ_PARAMS);
    expect(m.map((x) => x.param.name)).toContain("Frequency");
    expect(m.find((x) => x.param.name === "Frequency")?.direction).toBe("up");
  });

  test("instruction with no matching concept maps to nothing", () => {
    expect(mapInstruction("make it sparkle", EQ_PARAMS)).toEqual([]);
  });
});
