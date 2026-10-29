/**
 * SoundPlus Phase 1 server — Yatta JS app.
 *
 * Routes (all JSON except / which serves the chatbox page):
 *   GET  /                  chatbox page
 *   GET  /health            { status, uptime_s }
 *   GET  /api/settings      settings with the key MASKED (last 4 max)
 *   POST /api/settings      save provider/models/mcpServers; a masked
 *                            apiKey value ("****1234") is ignored and the
 *                            stored key is kept, so a round-tripped
 *                            masked value can never overwrite the key.
 *   GET  /api/models        model registry (no keys live here)
 *   POST /api/models        add/replace a model entry by name
 *   GET  /api/mcp-servers   MCP registry
 *   POST /api/mcp-servers   add an MCP server entry
 *   GET  /api/mcp-tools     live discovery: namespaced tools + skippedServers
 *   POST /api/mcp/call      { server, tool, args } -> MCP tools/call
 *   POST /api/chat          { messages: [{ role, content, kind }] }.
 *                            Audio/image messages are REJECTED when the
 *                            selected model lacks that capability.
 *
 * No key is ever logged. Placeholder keys only in tests.
 */

import { createAPI, API } from "yatta.js/api";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { chatComplete, type ChatMessage } from "./ai.ts";
import { enabledInputs, gateInput } from "./capabilities.ts";
import { callTool, discoverTools } from "./mcp.ts";
import { discoverPluginsViaMcp, searchPlugins, type PluginPurpose } from "./features/plugins.ts";
import {
  openDb,
  createProject,
  listProjects,
  getProject,
  recordAction,
  listActions,
  listProfile,
  editProfileFact,
  deleteProfileFact,
  distillProfile,
} from "./db.ts";
import {
  loadSettings,
  publicSettings,
  saveSettings,
  maskKey,
  type ModelEntry,
  type McpServerEntry,
  type Settings,
} from "./settings.ts";

const HOST = process.env.HOST ?? "127.0.0.1";
const PORT = Number(process.env.PORT ?? 3000);
const startedAt = Date.now();

const api = createAPI();
const err = (message: string, status: number) => API.json({ error: message }, { status });

// Lazy DB handle (opened on first memory route; path follows $SOUNDPLUS_HOME).
let dbHandle: ReturnType<typeof openDb> | null = null;
const getDb = () => (dbHandle ??= openDb());

async function readJson(req: Request): Promise<unknown> {
  try {
    return JSON.parse(await req.text());
  } catch {
    return null;
  }
}

api.get("/health", () =>
  API.json({ status: "ok", uptime_s: Math.floor((Date.now() - startedAt) / 1000) }),
);

api.get("/", async () => {
  const file = Bun.file(join(import.meta.dir, "..", "public", "chatbox.html"));
  const html = await file.text();
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
});

api.get("/api/settings", () => API.json(publicSettings(loadSettings())));

api.post("/api/settings", async (ctx) => {
  const body = (await readJson(ctx.req)) as Partial<Settings> | null;
  if (!body || typeof body !== "object") return err("malformed JSON body", 400);
  const current = loadSettings();
  const next: Settings = {
    provider: { ...current.provider, ...(body.provider ?? {}) },
    models: Array.isArray(body.models) ? (body.models as ModelEntry[]) : current.models,
    mcpServers: Array.isArray(body.mcpServers)
      ? (body.mcpServers as McpServerEntry[])
      : current.mcpServers,
  };
  // A masked value coming back from a client must never become the key.
  if (body.provider?.apiKey && body.provider.apiKey.startsWith("****")) {
    next.provider.apiKey = current.provider.apiKey;
  }
  saveSettings(next);
  return API.json(publicSettings(next));
});

api.get("/api/models", () => API.json({ models: loadSettings().models }));

api.post("/api/models", async (ctx) => {
  const body = (await readJson(ctx.req)) as Partial<ModelEntry> | null;
  if (!body || typeof body.name !== "string" || !body.name) {
    return err("model name is required", 400);
  }
  const s = loadSettings();
  const entry: ModelEntry = {
    name: body.name,
    baseUrl: typeof body.baseUrl === "string" ? body.baseUrl : "",
    capabilities: {
      text: body.capabilities?.text !== false,
      audio: body.capabilities?.audio === true,
      image: body.capabilities?.image === true,
    },
  };
  s.models = [...s.models.filter((m) => m.name !== entry.name), entry];
  saveSettings(s);
  return API.json({ models: s.models });
});

api.get("/api/mcp-servers", () => {
  const s = loadSettings();
  return API.json({ servers: s.mcpServers });
});

api.post("/api/mcp-servers", async (ctx) => {
  const body = (await readJson(ctx.req)) as Partial<McpServerEntry> | null;
  if (!body || typeof body.name !== "string" || !body.name || typeof body.url !== "string") {
    return err("mcp server name and url are required", 400);
  }
  const s = loadSettings();
  const entry: McpServerEntry = { name: body.name, url: body.url, transport: "http" };
  s.mcpServers = [...s.mcpServers.filter((m) => m.name !== entry.name), entry];
  saveSettings(s);
  return API.json({ servers: s.mcpServers });
});

api.get("/api/mcp-tools", async () => {
  const s = loadSettings();
  const result = await discoverTools(s.mcpServers);
  return API.json(result);
});

// F1 plugin discovery, F2 project intelligence (bridge tools only).
api.get("/api/plugins", async (ctx) => {
  const params = new URL(ctx.req.url).searchParams;
  const server = params.get("server") ?? "";
  const purpose = params.get("purpose") ?? undefined;
  const q = params.get("q") ?? undefined;
  if (!server) return err("server query param is required", 400);
  const s = loadSettings();
  const d = await discoverPluginsViaMcp(s.mcpServers, server);
  if (!d.available) return API.json(d);
  return API.json({
    available: true,
    plugins: searchPlugins(d.plugins, {
      purpose: purpose as PluginPurpose | undefined,
      query: q,
    }),
  });
});

api.post("/api/mcp/call", async (ctx) => {
  const body = (await readJson(ctx.req)) as {
    server?: unknown;
    tool?: unknown;
    args?: unknown;
  } | null;
  if (!body || typeof body.server !== "string" || typeof body.tool !== "string") {
    return err("server and tool are required", 400);
  }
  const s = loadSettings();
  try {
    const result = await callTool(
      s.mcpServers,
      body.server,
      body.tool,
      (body.args ?? {}) as Record<string, unknown>,
    );
    return API.json({ result });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e), 502);
  }
});

api.post("/api/chat", async (ctx) => {
  const body = (await readJson(ctx.req)) as { messages?: unknown; project?: unknown } | null;
  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return err("messages are required", 400);
  }
  const s = loadSettings();
  const typed = messages as ChatMessage[];
  for (const m of typed) {
    if (m.role !== "user") continue;
    const kind = m.kind ?? "text";
    const blocked = gateInput(s, kind);
    if (blocked) return err(blocked, 400);
  }
  // Optional project recording: history is per-project, strictly isolated.
  let projectId: string | null = null;
  if (typeof body?.project === "string" && body.project) {
    projectId = body.project;
    if (!getProject(getDb(), projectId)) return err("unknown project", 400);
  }
  const { baseUrl, apiKey, model } = s.provider;
  if (!baseUrl || !model) return err("no provider configured: save settings first", 400);
  try {
    const reply = await chatComplete(baseUrl, apiKey, model, typed);
    if (projectId) {
      try {
        const db = getDb();
        for (const m of typed.filter((x) => x.role === "user")) {
          recordAction(db, projectId, "chat", m.content.slice(0, 200), {
            role: "user",
            kind: m.kind ?? "text",
          });
        }
        recordAction(db, projectId, "chat", reply.slice(0, 200), { role: "assistant" });
      } catch (e) {
        console.error("history record failed (reply still returned):", e);
      }
    }
    return API.json({ reply, model, inputs: enabledInputs(s) });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e), 502);
  }
});

// ---------------------------------------------------------------------------
// Phase 2 memories + registries. Profile edit/delete use POST sub-routes
// (edit/delete verbs are unproven on Yatta's router; get/post are proven).
// ---------------------------------------------------------------------------

api.get("/api/projects", () => API.json({ projects: listProjects(getDb()) }));

api.post("/api/projects", async (ctx) => {
  const body = (await readJson(ctx.req)) as { name?: unknown } | null;
  if (!body || typeof body.name !== "string" || !body.name) {
    return err("project name is required", 400);
  }
  return API.json({ project: createProject(getDb(), randomUUID(), body.name) }, { status: 201 });
});

api.get("/api/projects/:id/actions", (ctx) => {
  if (!getProject(getDb(), ctx.params.id)) return err("unknown project", 404);
  return API.json({ actions: listActions(getDb(), ctx.params.id) });
});

api.post("/api/projects/:id/actions", async (ctx) => {
  if (!getProject(getDb(), ctx.params.id)) return err("unknown project", 404);
  const body = (await readJson(ctx.req)) as {
    kind?: unknown;
    summary?: unknown;
    detail?: unknown;
  } | null;
  if (!body || typeof body.kind !== "string" || typeof body.summary !== "string") {
    return err("kind and summary are required", 400);
  }
  return API.json(
    {
      action: recordAction(getDb(), ctx.params.id, body.kind, body.summary, body.detail ?? null),
    },
    { status: 201 },
  );
});

api.get("/api/profile", () => API.json({ profile: listProfile(getDb()) }));

api.post("/api/profile/distill", () => {
  const added = distillProfile(getDb());
  return API.json({ added, profile: listProfile(getDb()) });
});

api.post("/api/profile/:id/edit", async (ctx) => {
  const body = (await readJson(ctx.req)) as { fact?: unknown } | null;
  if (!body || typeof body.fact !== "string" || !body.fact) {
    return err("fact is required", 400);
  }
  const updated = editProfileFact(getDb(), Number(ctx.params.id), body.fact);
  if (!updated) return err("unknown profile fact", 404);
  return API.json({ fact: updated });
});

api.post("/api/profile/:id/delete", (ctx) => {
  const ok = deleteProfileFact(getDb(), Number(ctx.params.id));
  if (!ok) return err("unknown profile fact", 404);
  return API.json({ deleted: true });
});

const server = Bun.serve({
  hostname: HOST,
  port: PORT,
  async fetch(req) {
    try {
      return await api.handle(req);
    } catch (e) {
      console.error("unhandled handler error:", e);
      return err("internal server error", 500);
    }
  },
});

console.error(`soundplus listening on http://${server.hostname}:${server.port}`);
console.error(`settings: masked key on read is ${maskKey(loadSettings().provider.apiKey)}`);
