/**
 * Tests: F9 multi-agent permissions.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { runAgents } from "../../src/features/agents.ts";

describe("F9 multi-agent permissions", () => {
  test("allowed tool executes, denied tool never runs", async () => {
    let calls = 0;
    const results = await runAgents(
      [{ name: "mixer", allowedTools: ["flstudio.set_volume"] }],
      [
        {
          agent: "mixer",
          tool: "flstudio.set_volume",
          args: {},
          execute: async () => {
            calls++;
            return { ok: true };
          },
        },
        {
          agent: "mixer",
          tool: "flstudio.delete_project",
          args: {},
          execute: async () => {
            calls++;
            return { ok: true };
          },
        },
        {
          agent: "ghost",
          tool: "flstudio.set_volume",
          args: {},
          execute: async () => {
            calls++;
            return { ok: true };
          },
        },
      ],
    );
    expect(results.map((r) => r.status)).toEqual(["ok", "denied", "denied"]);
    expect(calls).toBe(1);
  });

  test("a failing tool reports failed, not denied", async () => {
    const results = await runAgents(
      [{ name: "mixer", allowedTools: ["flstudio.set_volume"] }],
      [
        {
          agent: "mixer",
          tool: "flstudio.set_volume",
          args: {},
          execute: async () => {
            throw new Error("bridge down");
          },
        },
      ],
    );
    expect(results[0].status).toBe("failed");
    expect(results[0].reason).toContain("bridge down");
  });
});
