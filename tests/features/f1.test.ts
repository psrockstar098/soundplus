import { categorizePlugin, searchPlugins, discoverPluginsViaMcp } from "../../src/features/plugins.ts";
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
    if (body.method === "tools/call" && body.params?.name === "list_plugins") {
      return Response.json({
        jsonrpc: "2.0",
        id: 1,
        result: {
          plugins: [
            { name: "Fruity Parametric EQ 2", vendor: "Image-Line", format: "native" },
            { name: "Fruity Limiter", vendor: "Image-Line", format: "native" },
            { name: "Valhalla Supermassive", vendor: "Valhalla", format: "VST3" },
          ],
        },
      });
    }
    if (body.method === "tools/call" && body.params?.name === "get_project") {
      return Response.json({
        jsonrpc: "2.0",
        id: 1,
        result: {
          name: "Demo Song",
          tracks: [
            { name: "Vocal", role: "vocal", muted: false, volume: 0.8, inserts: ["EQ"], sends: ["Reverb"] },
            { name: "Kick", role: "kick", muted: false, volume: 0.9, inserts: [], sends: [] },
            { name: "Pad", role: "synth", muted: true, volume: 0.5, inserts: ["Chorus"], sends: [] },
          ],
          routing: ["Vocal -> Master", "Kick -> Drum Bus -> Master"],
        },
      });
    }
    return Response.json({ jsonrpc: "2.0", id: 1, error: { message: "unknown method" } });
  },
});
afterAll(() => mock.stop());
const servers = [{ name: "flstudio", url: `http://127.0.0.1:${mock.port}`, transport: "http" as const }];

describe("F1 plugin discovery", () => {
  test("categorize by keyword, other as fallback", () => {
    expect(categorizePlugin("Fruity Parametric EQ 2")).toContain("eq");
    expect(categorizePlugin("Fruity Limiter")).toContain("limiter");
    expect(categorizePlugin("Valhalla Supermassive")).toContain("other");
  });

  test("search filters by purpose and query", async () => {
    const d = await discoverPluginsViaMcp(servers, "flstudio");
    if (!d.available) throw new Error("expected discovery to be available");
    expect(d.plugins.length).toBe(3);
    expect(searchPlugins(d.plugins, { purpose: "eq" }).map((p) => p.name)).toEqual([
      "Fruity Parametric EQ 2",
    ]);
    expect(searchPlugins(d.plugins, { query: "valhalla" }).length).toBe(1);
  });

  test("bridge without list_plugins reports unavailable, never faked", async () => {
    const d = await discoverPluginsViaMcp(servers, "cubase");
    expect(d.available).toBe(false);
  });
});

