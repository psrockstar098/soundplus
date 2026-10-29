/**
 * F15 — Project Health Scanner (standalone port).
 *
 * Scans a project state for real problems: muted tracks, excessive
 * gain, duplicate processing, routing to unknown buses, missing
 * media. Each issue carries a severity. A clean project reports
 * zero issues — the scanner never invents problems to look busy.
 */

import type { ProjectState } from "./project.ts";

export type HealthIssue = {
  severity: "error" | "warning";
  area: string;
  detail: string;
};

export function scanHealth(
  state: ProjectState,
  opts: { buses?: string[]; media?: Array<{ track: string; exists: boolean }> } = {},
): HealthIssue[] {
  const issues: HealthIssue[] = [];
  const buses = new Set(opts.buses ?? []);
  const insertCounts: Record<string, number> = {};
  for (const t of state.tracks) {
    if (t.muted) {
      issues.push({ severity: "warning", area: "muted", detail: `track "${t.name}" is muted` });
    }
    if (t.volume > 1.0) {
      issues.push({
        severity: "error",
        area: "gain",
        detail: `track "${t.name}" volume ${t.volume} exceeds unity gain`,
      });
    }
    if (t.inserts.length === 0 && t.sends.length === 0) {
      issues.push({
        severity: "warning",
        area: "routing",
        detail: `track "${t.name}" has no inserts and no sends`,
      });
    }
    for (const send of t.sends) {
      if (buses.size > 0 && !buses.has(send)) {
        issues.push({
          severity: "error",
          area: "routing",
          detail: `track "${t.name}" sends to unknown bus "${send}"`,
        });
      }
    }
    for (const ins of t.inserts) insertCounts[ins] = (insertCounts[ins] ?? 0) + 1;
  }
  for (const [ins, count] of Object.entries(insertCounts)) {
    if (count >= 3) {
      issues.push({
        severity: "warning",
        area: "duplicate-processing",
        detail: `insert "${ins}" appears on ${count} tracks`,
      });
    }
  }
  for (const m of opts.media ?? []) {
    if (!m.exists) {
      issues.push({ severity: "error", area: "media", detail: `track "${m.track}" has missing media` });
    }
  }
  return issues;
}
