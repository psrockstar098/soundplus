/**
 * Tests: MCP-over-stdio transport against a mock stdio server.
 * Run: bun test
 */

import { describe, test, expect, afterAll } from "bun:test";
import { discoverTools, callTool, closeServers } from "../src/mcp.ts";
import { verifyBridge } from "../src/verify.ts";
import type { McpServerEntry } from "../src/settings.ts";

const fixture = new URL("./fixtures/mock-stdio-server.ts", import.meta.url).pathname;

const stdioServer: McpServerEntry = {
  name: "flstudio",
  url: "",
  transport: "stdio",
  command: process.execPath,
  args: [fixture],
};

afterAll(() => closeServers());

describe("MCP stdio transport", () => {
  test("tools discovered over stdio are namespaced", async () => {
    const r = await discoverTools([stdioServer]);
    expect(r.skippedServers).toEqual([]);
    expect(r.tools.map((t) => t.namespaced).sort()).toEqual([
      "flstudio.get_project",
      "flstudio.list_plugins",
    ]);
  });

  test("tools/call reaches the stdio server", async () => {
    const result = (await callTool([stdioServer], "flstudio", "list_plugins", {})) as {
      plugins: Array<{ name: string }>;
    };
    expect(result.plugins.map((p) => p.name)).toEqual(["EQ", "Comp"]);
  });

  test("missing command lands in skippedServers, never throws", async () => {
    const r = await discoverTools([
      { name: "ghost", url: "", transport: "stdio", command: "definitely-not-a-real-binary-xyz", args: [] },
    ]);
    expect(r.skippedServers).toEqual(["ghost"]);
    expect(r.tools).toEqual([]);
  });

  test("verifyBridge works over stdio", async () => {
    const r = await verifyBridge(stdioServer);
    expect(r.reachable).toBe(true);
    expect(r.pluginCount).toBe(2);
    expect(r.trackCount).toBe(1);
  });
});
