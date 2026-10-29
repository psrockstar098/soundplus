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
import { chatComplete, type ChatMessage } from "./ai.ts";
import { enabledInputs, gateInput } from "./capabilities.ts";
import { callTool, discoverTools } from "./mcp.ts";
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
  const body = (await readJson(ctx.req)) as { messages?: unknown } | null;
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
  const { baseUrl, apiKey, model } = s.provider;
  if (!baseUrl || !model) return err("no provider configured: save settings first", 400);
  try {
    const reply = await chatComplete(baseUrl, apiKey, model, typed);
    return API.json({ reply, model, inputs: enabledInputs(s) });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e), 502);
  }
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
