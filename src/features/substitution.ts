/**
 * F17 — Automatic Plugin Substitution (standalone port).
 *
 * When a preferred plugin is unavailable, find installed
 * alternatives with the same purpose from the discovered catalog
 * (F1). When the preferred plugin IS installed, it is returned as
 * available — substitution never overrides a working choice. When
 * nothing matches, the result says so plainly.
 */

import type { PluginEntry, PluginPurpose } from "./plugins.ts";

export type Substitution =
  | { status: "available"; plugin: PluginEntry }
  | { status: "substituted"; alternatives: PluginEntry[] }
  | { status: "unavailable"; reason: string };

function nameSimilarity(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const wb = new Set(b.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared;
}

export function substitute(
  catalog: PluginEntry[],
  preferredName: string,
  purpose?: PluginPurpose,
): Substitution {
  const found = catalog.find((p) => p.name.toLowerCase() === preferredName.toLowerCase());
  if (found) return { status: "available", plugin: found };
  if (!purpose) {
    return {
      status: "unavailable",
      reason: `plugin "${preferredName}" not installed and no purpose given to search by`,
    };
  }
  const alternatives = catalog
    .filter((p) => p.purposes.includes(purpose))
    .sort((a, b) => nameSimilarity(b.name, preferredName) - nameSimilarity(a.name, preferredName));
  if (alternatives.length === 0) {
    return { status: "unavailable", reason: `no installed plugin with purpose "${purpose}"` };
  }
  return { status: "substituted", alternatives };
}
