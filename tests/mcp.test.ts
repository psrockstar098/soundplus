/**
 * Tests: MCP gateway against a mock MCP-over-HTTP server.
 * Covers namespacing, unreachable -> skippedServers, duplicate name -> skipped.
 * Run: bun test
 */

import { describe, test, expect, afterAll } from "bun:test";
import { discoverTools, callTool } from "../src/mcp.ts";

// Mock MCP server: JSON-RPC over HTTP, like flstudio-mcp's bridge shape.
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
            { name: "get_project", description: "read the DAW project" },
            { name: "set_volume", description: "set a track volume" },
          ],
        },
      });
    }
    if (body.method === "tools/call") {
      return Response.json({
        jsonrpc: "2.0",
        id: 1,
        result: { called: body.params?.name ?? null, ok: true },
      });
    }
    return Response.json({ jsonrpc: "2.0", id: 1, error: { message: "unknown method" } });
  },
});
afterAll(() => mock.stop());

const mockUrl = `http://127.0.0.1:${mock.port}`;

describe("MCP gateway", () => {
  test("tools are namespaced <server>.<tool>", async () => {
    const r = await discoverTools([{ name: "flstudio", url: mockUrl, transport: "http" }]);
    expect(r.skippedServers).toEqual([]);
    expect(r.tools.map((t) => t.namespaced).sort()).toEqual([
      "flstudio.get_project",
      "flstudio.set_volume",
    ]);
  });

  test("unreachable server lands in skippedServers, never throws", async () => {
    const r = await discoverTools([
      { name: "flstudio", url: mockUrl, transport: "http" },
      { name: "dead", url: "http://127.0.0.1:1", transport: "http" },
    ]);
    expect(r.skippedServers).toEqual(["dead"]);
    expect(r.tools.length).toBe(2);
  });

  test("duplicate server name is skipped", async () => {
    const r = await discoverTools([
      { name: "flstudio", url: mockUrl, transport: "http" },
      { name: "flstudio", url: mockUrl, transport: "http" },
    ]);
    expect(r.skippedServers).toEqual(["flstudio"]);
    expect(r.tools.length).toBe(2);
  });

  test("tools/call reaches the server", async () => {
    const result = (await callTool(
      [{ name: "flstudio", url: mockUrl, transport: "http" }],
      "flstudio",
      "set_volume",
      { track: 1, value: 0.5 },
    )) as { called: string; ok: boolean };
    expect(result.called).toBe("set_volume");
    expect(result.ok).toBe(true);
  });
});
