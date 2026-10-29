import { summarizeProject, readProjectViaMcp } from "../../src/features/project.ts";
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

describe("F2 project intelligence", () => {
  test("summary counts roles, muted tracks, bare tracks", async () => {
    const r = await readProjectViaMcp(servers, "flstudio");
    if (!r.available) throw new Error("expected project read to be available");
    expect(r.summary.trackCount).toBe(3);
    expect(r.summary.roles.sort()).toEqual(["kick", "synth", "vocal"]);
    expect(r.summary.mutedTracks).toEqual(["Pad"]);
    expect(r.summary.routingIssues).toEqual(['track "Kick" has no inserts and no sends']);
    expect(r.summary.insertCounts).toEqual({ EQ: 1, Chorus: 1 });
  });

  test("summarize handles an empty project", () => {
    const s = summarizeProject({ name: "Empty", tracks: [], routing: [] });
    expect(s.trackCount).toBe(0);
    expect(s.routingIssues).toEqual([]);
  });

  test("bridge without get_project reports unavailable", async () => {
    const r = await readProjectViaMcp(servers, "cubase");
    expect(r.available).toBe(false);
  });
});
