/**
 * Tests: Phase 4 bridge verification against a mock bridge.
 * Run: bun test
 */

import { describe, test, expect, afterAll } from "bun:test";
import { verifyBridge, verifyAll } from "../src/verify.ts";

// Mock bridge offering list_plugins + get_project with array shapes.
const mock = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(req) {
    const body = (await req.json()) as { method?: string; params?: { name?: string } };
    if (body.method === "initialize") {
      return Response.json({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "2024-11-05" } });
    }
    if (body.method === "tools/list") {
      return Response.json({
        jsonrpc: "2.0",
        id: 1,
        result: {
          tools: [
            { name: "list_plugins", description: "list installed plugins" },
            { name: "get_project", description: "read the project" },
          ],
        },
      });
    }
    if (body.method === "tools/call") {
      if (body.params?.name === "list_plugins") {
        return Response.json({
          jsonrpc: "2.0",
          id: 1,
          result: { plugins: [{ name: "EQ" }, { name: "Comp" }, { name: "Limiter" }] },
        });
      }
      if (body.params?.name === "get_project") {
        return Response.json({
          jsonrpc: "2.0",
          id: 1,
          result: { tracks: [{ name: "Vocal" }, { name: "Kick" }] },
        });
      }
    }
    return Response.json({ jsonrpc: "2.0", id: 1, error: { message: "unknown method" } });
  },
});
afterAll(() => mock.stop());

const mockUrl = `http://127.0.0.1:${mock.port}`;

describe("Phase 4 bridge verification", () => {
  test("live mock bridge reports tools and counts", async () => {
    const r = await verifyBridge({ name: "flstudio", url: mockUrl, transport: "http" });
    expect(r.reachable).toBe(true);
    expect(r.tools).toEqual(["list_plugins", "get_project"]);
    expect(r.hasListPlugins).toBe(true);
    expect(r.hasGetProject).toBe(true);
    expect(r.pluginCount).toBe(3);
    expect(r.trackCount).toBe(2);
  });

  test("unreachable bridge reports reachable=false, never throws", async () => {
    const r = await verifyBridge({ name: "dead", url: "http://127.0.0.1:1", transport: "http" });
    expect(r.reachable).toBe(false);
    expect(r.pluginCount).toBeNull();
    expect(r.notes.length).toBeGreaterThan(0);
  });

  test("verifyAll reports each server", async () => {
    const out = await verifyAll([
      { name: "flstudio", url: mockUrl, transport: "http" },
      { name: "dead", url: "http://127.0.0.1:1", transport: "http" },
    ]);
    expect(out.map((r) => [r.server, r.reachable])).toEqual([
      ["flstudio", true],
      ["dead", false],
    ]);
  });
});
