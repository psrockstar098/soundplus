/**
 * Tests: F10 capability manager.
 * Run: bun test
 */

import { describe, test, expect, afterAll } from "bun:test";
import { capabilityReport } from "../../src/features/capabilities.ts";

describe("F10 capability manager", () => {
  const mock = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(req) {
      const body = (await req.json()) as { method?: string };
      if (body.method === "initialize") {
        return Response.json({ jsonrpc: "2.0", id: 1, result: {} });
      }
      if (body.method === "tools/list") {
        return Response.json({
          jsonrpc: "2.0",
          id: 1,
          result: { tools: [{ name: "get_project" }] },
        });
      }
      return Response.json({ jsonrpc: "2.0", id: 1, error: { message: "no" } });
    },
  });
  afterAll(() => mock.stop());

  test("report lists OS, bridges, supported and unsupported plainly", async () => {
    const r = await capabilityReport(
      [{ name: "flstudio", url: `http://127.0.0.1:${mock.port}`, transport: "http" }],
      ["VST3", "native", "VST3"],
    );
    expect(r.os.length).toBeGreaterThan(0);
    expect(r.bridges[0].reachable).toBe(true);
    expect(r.bridges[0].tools).toContain("flstudio.get_project");
    expect(r.supported).toContain("project-intelligence");
    expect(r.unsupported).toContain("plugin-discovery");
    expect(r.unsupported).toContain("local-plugin-folder-scan");
    expect(r.pluginFormats).toEqual(["VST3", "native"]);
  });

  test("no bridges means everything bridge-dependent is unsupported", async () => {
    const r = await capabilityReport([]);
    expect(r.bridges).toEqual([]);
    expect(r.unsupported).toContain("project-intelligence");
    expect(r.unsupported).toContain("plugin-discovery");
  });
});
