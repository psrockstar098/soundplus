/**
 * F10 — Cross-Platform Capability and Compatibility Manager.
 *
 * Detects what this machine can actually execute: OS, runtime,
 * reachable bridges and their tools, plugin formats seen, and the
 * features that are NOT available here. Unsupported features are
 * listed plainly — never silently assumed.
 */

import { discoverTools } from "../mcp.ts";
import type { McpServerEntry } from "../settings.ts";

export type CapabilityReport = {
  os: string;
  arch: string;
  runtime: string;
  bridges: Array<{ server: string; reachable: boolean; tools: string[] }>;
  pluginFormats: string[];
  supported: string[];
  unsupported: string[];
};

export async function capabilityReport(
  servers: McpServerEntry[],
  pluginFormats: string[] = [],
): Promise<CapabilityReport> {
  const { tools, skippedServers } = await discoverTools(servers);
  const bridges = servers.map((s) => ({
    server: s.name,
    reachable: !skippedServers.includes(s.name),
    tools: tools.filter((t) => t.server === s.name).map((t) => t.namespaced),
  }));
  const supported: string[] = [];
  const unsupported: string[] = [];
  const hasTool = (name: string) => tools.some((t) => t.name === name);
  if (hasTool("get_project")) supported.push("project-intelligence");
  else unsupported.push("project-intelligence");
  if (hasTool("list_plugins")) supported.push("plugin-discovery");
  else unsupported.push("plugin-discovery");
  // The standalone app has no plugin container: local VST/AU folder
  // scanning is structurally unavailable, by design, not by failure.
  unsupported.push("local-plugin-folder-scan");
  return {
    os: process.platform,
    arch: process.arch,
    runtime: typeof Bun !== "undefined" ? `bun ${Bun.version}` : `node ${process.version}`,
    bridges,
    pluginFormats: [...new Set(pluginFormats)],
    supported,
    unsupported,
  };
}
