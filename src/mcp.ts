/**
 * MCP gateway — SoundPlus as an MCP CLIENT to the DAW-control servers.
 *
 * Two transports:
 * - HTTP: MCP-over-HTTP, plain JSON-RPC 2.0 POST (initialize,
 *   tools/list, tools/call).
 * - stdio: the bridge is a spawned local program speaking
 *   newline-delimited JSON-RPC (how FastMCP servers run by default —
 *   rosasynthesiz flstudio-mcp, hedidjs cubase-mcp, calvinw
 *   fl-studio-mcp are all stdio). One process per server, kept alive
 *   across calls; closeServers() stops them.
 *
 * Tools are namespaced `<server>.<tool>` in the agent's tool list. A
 * server that cannot be reached, or whose name collides with an
 * already-registered server, lands in skippedServers and is NEVER
 * fatal to the rest of the app.
 *
 * ADDING ANOTHER DAW (Cubase, Ableton, Reaper, ...): register one
 * server entry — nothing else in the gateway changes. Its tools are
 * namespaced automatically, it shares the same discovery/call path,
 * and if it is unreachable it is skipped like any other server.
 * One rule the gateway enforces: wire tool names must match the MCP
 * pattern [a-zA-Z0-9_-]+. A tool whose name breaks it is skipped
 * (listed in skippedTools) instead of being registered under a name
 * the server would not recognize. The namespaced `<server>.<tool>`
 * form never goes on the MCP wire; on the provider wire it goes
 * sanitized (see sanitizeProviderToolName in ai.ts), with calls
 * mapped back to the namespaced name before execution.
 *
 * Phase 1 covers the gateway + registry. Real DAW servers plug in
 * here in Phase 4.
 */

import type { McpServerEntry } from "./settings.ts";
import { StdioMcpClient } from "./mcpStdio.ts";

export type McpTool = {
  name: string;
  namespaced: string;
  description: string;
  server: string;
  /** JSON Schema for the tool's arguments, as listed by the server. */
  inputSchema?: Record<string, unknown>;
};

export type GatewayResult = {
  tools: McpTool[];
  skippedServers: string[];
  /** Wire tools skipped because their names break the MCP pattern. */
  skippedTools: string[];
};

/** MCP tool names on the wire: [a-zA-Z0-9_-]+, 1-128 chars. */
const TOOL_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

async function rpc(url: string, method: string, params?: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: params ?? {} }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`MCP HTTP ${res.status}`);
  const data = (await res.json()) as { result?: unknown; error?: { message?: string } };
  if (data.error) throw new Error(`MCP error: ${data.error.message ?? "unknown"}`);
  return data.result;
}

const stdioClients = new Map<string, StdioMcpClient>();

function stdioClient(server: McpServerEntry): StdioMcpClient {
  if (!server.command) throw new Error(`stdio MCP server "${server.name}" has no command`);
  let client = stdioClients.get(server.name);
  if (!client) {
    client = new StdioMcpClient(server.command, server.args ?? [], server.cwd);
    stdioClients.set(server.name, client);
  }
  return client;
}

/** Stop every spawned stdio bridge process (CLI exit, tests). */
export function closeServers(): void {
  for (const client of stdioClients.values()) client.close();
  stdioClients.clear();
}

async function rpcFor(server: McpServerEntry, method: string, params?: unknown): Promise<unknown> {
  if (server.transport === "stdio") {
    return stdioClient(server).request(method, params);
  }
  return rpc(server.url, method, params);
}

export async function discoverTools(servers: McpServerEntry[]): Promise<GatewayResult> {
  const tools: McpTool[] = [];
  const skippedServers: string[] = [];
  const skippedTools: string[] = [];
  const seenNames = new Set<string>();
  for (const server of servers) {
    if (seenNames.has(server.name)) {
      skippedServers.push(server.name);
      continue;
    }
    seenNames.add(server.name);
    try {
      await rpcFor(server, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "soundplus", version: "0.1.0" },
      });
      const listed = (await rpcFor(server, "tools/list")) as {
        tools?: Array<{
          name: string;
          description?: string;
          inputSchema?: Record<string, unknown>;
        }>;
      };
      for (const tool of listed.tools ?? []) {
        // A wire name outside the MCP pattern can never be called
        // back reliably, so skip it with a note instead of
        // registering a name the server would not recognize.
        if (typeof tool.name !== "string" || !TOOL_NAME_PATTERN.test(tool.name)) {
          skippedTools.push(`${server.name}.${String(tool.name)}`);
          continue;
        }
        tools.push({
          name: tool.name,
          namespaced: `${server.name}.${tool.name}`,
          description: tool.description ?? "",
          server: server.name,
          inputSchema: tool.inputSchema,
        });
      }
    } catch {
      skippedServers.push(server.name);
    }
  }
  return { tools, skippedServers, skippedTools };
}

export async function callTool(
  servers: McpServerEntry[],
  serverName: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const server = servers.find((s) => s.name === serverName);
  if (!server) throw new Error(`unknown MCP server "${serverName}"`);
  return rpcFor(server, "tools/call", { name: toolName, arguments: args });
}
