/**
 * Phase 4 — Bridge verification.
 *
 * Run this against a REAL DAW bridge (flstudio-mcp, cubase-mcp) to
 * prove SoundPlus talks to a live DAW. It discovers the bridge's
 * tools, then probes the two tools Phase 3 features depend on:
 * `list_plugins` (F1) and `get_project` (F2).
 *
 * Reports only what the bridge actually returned. Counts are
 * extracted only from shapes the code recognizes (an array, or an
 * object with a `plugins`/`tracks` array); anything else is
 * reported as an unexpected shape, never guessed.
 */

import { discoverTools, callTool } from "./mcp.ts";
import type { McpServerEntry } from "./settings.ts";

export type BridgeReport = {
  server: string;
  url: string;
  reachable: boolean;
  tools: string[];
  hasListPlugins: boolean;
  hasGetProject: boolean;
  pluginCount: number | null;
  trackCount: number | null;
  notes: string[];
};

function countArray(value: unknown, key: string): number | null {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") {
    const arr = (value as Record<string, unknown>)[key];
    if (Array.isArray(arr)) return arr.length;
  }
  return null;
}

function summarizeResult(value: unknown): string {
  if (value === null || value === undefined) return "empty";
  if (Array.isArray(value)) return `array[${value.length}]`;
  if (typeof value === "object") return `object{${Object.keys(value as object).join(",")}}`;
  return typeof value;
}

export async function verifyBridge(server: McpServerEntry): Promise<BridgeReport> {
  const report: BridgeReport = {
    server: server.name,
    url: server.url,
    reachable: false,
    tools: [],
    hasListPlugins: false,
    hasGetProject: false,
    pluginCount: null,
    trackCount: null,
    notes: [],
  };
  const discovered = await discoverTools([server]);
  if (discovered.skippedServers.includes(server.name)) {
    report.notes.push("bridge unreachable or failed initialize/tools/list");
    return report;
  }
  report.reachable = true;
  report.tools = discovered.tools.map((t) => t.name);
  report.hasListPlugins = report.tools.includes("list_plugins");
  report.hasGetProject = report.tools.includes("get_project");

  if (report.hasListPlugins) {
    try {
      const res = await callTool([server], server.name, "list_plugins", {});
      report.pluginCount = countArray(res, "plugins");
      report.notes.push(`list_plugins returned ${summarizeResult(res)}`);
      if (report.pluginCount === null) {
        report.notes.push("list_plugins shape not recognized; count not claimed");
      }
    } catch (e) {
      report.notes.push(`list_plugins call failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    report.notes.push("list_plugins not offered; F1 plugin discovery unavailable on this bridge");
  }

  if (report.hasGetProject) {
    try {
      const res = await callTool([server], server.name, "get_project", {});
      report.trackCount = countArray(res, "tracks");
      report.notes.push(`get_project returned ${summarizeResult(res)}`);
      if (report.trackCount === null) {
        report.notes.push("get_project shape not recognized; count not claimed");
      }
    } catch (e) {
      report.notes.push(`get_project call failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    report.notes.push("get_project not offered; F2 project intelligence unavailable on this bridge");
  }
  return report;
}

export async function verifyAll(servers: McpServerEntry[]): Promise<BridgeReport[]> {
  const out: BridgeReport[] = [];
  for (const server of servers) out.push(await verifyBridge(server));
  return out;
}
