/**
 * MCP gateway — SoundPlus as an MCP CLIENT to the DAW-control servers.
 *
 * Transport: MCP-over-HTTP, plain JSON-RPC 2.0 POST (initialize,
 * tools/list, tools/call). Tools are namespaced `<server>.<tool>` in the
 * agent's tool list. A server that cannot be reached, or whose name
 * collides with an already-registered server, lands in skippedServers
 * and is NEVER fatal to the rest of the app.
 *
 * Phase 1 covers the gateway + registry. Real DAW servers (flstudio-mcp,
 * cubase-mcp, piano-roll) plug in here unchanged in Phase 4.
 */

import type { McpServerEntry } from "./settings.ts";

export type McpTool = {
  name: string;
  namespaced: string;
  description: string;
  server: string;
};

export type GatewayResult = {
  tools: McpTool[];
  skippedServers: string[];
};

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

export async function discoverTools(servers: McpServerEntry[]): Promise<GatewayResult> {
  const tools: McpTool[] = [];
  const skippedServers: string[] = [];
  const seenNames = new Set<string>();
  for (const server of servers) {
    if (seenNames.has(server.name)) {
      skippedServers.push(server.name);
      continue;
    }
    seenNames.add(server.name);
    try {
      await rpc(server.url, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "soundplus", version: "0.1.0" },
      });
      const listed = (await rpc(server.url, "tools/list")) as {
        tools?: Array<{ name: string; description?: string }>;
      };
      for (const tool of listed.tools ?? []) {
        tools.push({
          name: tool.name,
          namespaced: `${server.name}.${tool.name}`,
          description: tool.description ?? "",
          server: server.name,
        });
      }
    } catch {
      skippedServers.push(server.name);
    }
  }
  return { tools, skippedServers };
}

export async function callTool(
  servers: McpServerEntry[],
  serverName: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const server = servers.find((s) => s.name === serverName);
  if (!server) throw new Error(`unknown MCP server "${serverName}"`);
  return rpc(server.url, "tools/call", { name: toolName, arguments: args });
}
