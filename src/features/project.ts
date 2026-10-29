/**
 * F2 — Real-Time DAW Project Intelligence (standalone port).
 *
 * Project state is read ONLY through the bridge's supported MCP
 * tools — no hacks, no unsupported hooks. When a bridge offers a
 * `get_project` tool, its state is summarized: track names, roles,
 * mixer channels, routing, inserts, sends, muted tracks. When it
 * does not, intelligence reports unavailable.
 */

import { discoverTools, callTool } from "../mcp.ts";
import type { McpServerEntry } from "../settings.ts";

export type Track = {
  name: string;
  role?: string;
  muted: boolean;
  volume: number;
  inserts: string[];
  sends: string[];
};

export type ProjectState = {
  name: string;
  tracks: Track[];
  routing: string[];
};

export type ProjectSummary = {
  name: string;
  trackCount: number;
  roles: string[];
  mutedTracks: string[];
  routingIssues: string[];
  insertCounts: Record<string, number>;
};

export function summarizeProject(state: ProjectState): ProjectSummary {
  const roles = [...new Set(state.tracks.map((t) => t.role ?? "unknown"))];
  const mutedTracks = state.tracks.filter((t) => t.muted).map((t) => t.name);
  const routingIssues: string[] = [];
  for (const t of state.tracks) {
    if (t.sends.length === 0 && t.inserts.length === 0) {
      routingIssues.push(`track "${t.name}" has no inserts and no sends`);
    }
  }
  const insertCounts: Record<string, number> = {};
  for (const t of state.tracks) {
    for (const ins of t.inserts) insertCounts[ins] = (insertCounts[ins] ?? 0) + 1;
  }
  return {
    name: state.name,
    trackCount: state.tracks.length,
    roles,
    mutedTracks,
    routingIssues,
    insertCounts,
  };
}

export type ProjectRead =
  | { available: true; state: ProjectState; summary: ProjectSummary }
  | { available: false; reason: string };

/** Read project state via a bridge's `get_project` tool, if offered. */
export async function readProjectViaMcp(
  servers: McpServerEntry[],
  serverName: string,
): Promise<ProjectRead> {
  const { tools } = await discoverTools(servers);
  if (!tools.some((t) => t.server === serverName && t.name === "get_project")) {
    return {
      available: false,
      reason: `server "${serverName}" does not offer a get_project tool`,
    };
  }
  const raw = (await callTool(servers, serverName, "get_project", {})) as {
    name?: string;
    tracks?: Track[];
    routing?: string[];
  };
  const state: ProjectState = {
    name: raw.name ?? "",
    tracks: (raw.tracks ?? []).map((t) => ({
      name: t.name,
      role: t.role,
      muted: t.muted === true,
      volume: typeof t.volume === "number" ? t.volume : 1,
      inserts: t.inserts ?? [],
      sends: t.sends ?? [],
    })),
    routing: raw.routing ?? [],
  };
  return { available: true, state, summary: summarizeProject(state) };
}
