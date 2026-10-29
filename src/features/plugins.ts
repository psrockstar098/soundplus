/**
 * F1 — Automatic Plugin Discovery and Search (standalone port).
 *
 * The standalone app never scans plugin folders itself (no plugin
 * container here): discovery runs through the DAW bridge's MCP tools.
 * When a bridge offers a `list_plugins` tool, its results are
 * categorized by purpose and searchable. When it does not, discovery
 * reports unavailable — never faked from a hardcoded list.
 *
 * Categorization is keyword-based on the plugin name and is labeled
 * as such; the bridge's own metadata wins when present.
 */

import { discoverTools, callTool } from "../mcp.ts";
import type { McpServerEntry } from "../settings.ts";

export type PluginPurpose =
  | "eq"
  | "compressor"
  | "limiter"
  | "reverb"
  | "de-esser"
  | "instrument"
  | "other";

export type PluginEntry = {
  name: string;
  vendor: string;
  format: string;
  purposes: PluginPurpose[];
};

const PURPOSE_KEYWORDS: Array<[PluginPurpose, string[]]> = [
  ["eq", ["eq", "equalizer", "equaliser"]],
  ["compressor", ["compressor", "comp"]],
  ["limiter", ["limiter", "limit"]],
  ["reverb", ["reverb", "verb"]],
  ["de-esser", ["de-esser", "deesser", "dess"]],
  ["instrument", ["synth", "instrument", "keys", "piano", "drum machine"]],
];

/** Keyword categorization of a plugin name (heuristic, not a claim). */
export function categorizePlugin(name: string): PluginPurpose[] {
  const lower = name.toLowerCase();
  const found: PluginPurpose[] = [];
  for (const [purpose, words] of PURPOSE_KEYWORDS) {
    if (words.some((w) => lower.includes(w))) found.push(purpose);
  }
  return found.length ? found : ["other"];
}

export function searchPlugins(
  catalog: PluginEntry[],
  opts: { purpose?: PluginPurpose; query?: string },
): PluginEntry[] {
  return catalog.filter((p) => {
    if (opts.purpose && !p.purposes.includes(opts.purpose)) return false;
    if (opts.query && !p.name.toLowerCase().includes(opts.query.toLowerCase())) {
      return false;
    }
    return true;
  });
}

export type PluginDiscovery =
  | { available: true; plugins: PluginEntry[] }
  | { available: false; reason: string };

/** Discover via a bridge's `list_plugins` tool, if it offers one. */
export async function discoverPluginsViaMcp(
  servers: McpServerEntry[],
  serverName: string,
): Promise<PluginDiscovery> {
  const { tools } = await discoverTools(servers);
  if (!tools.some((t) => t.server === serverName && t.name === "list_plugins")) {
    return {
      available: false,
      reason: `server "${serverName}" does not offer a list_plugins tool`,
    };
  }
  const raw = (await callTool(servers, serverName, "list_plugins", {})) as {
    plugins?: Array<{ name: string; vendor?: string; format?: string; purposes?: string[] }>;
  };
  const plugins: PluginEntry[] = (raw.plugins ?? []).map((p) => ({
    name: p.name,
    vendor: p.vendor ?? "",
    format: p.format ?? "",
    purposes:
      p.purposes && p.purposes.length
        ? (p.purposes.filter((x) =>
            ["eq", "compressor", "limiter", "reverb", "de-esser", "instrument", "other"].includes(x),
          ) as PluginPurpose[])
        : categorizePlugin(p.name),
  }));
  return { available: true, plugins };
}
