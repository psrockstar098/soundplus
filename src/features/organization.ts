/**
 * F12 — Smart Session Organization (standalone port).
 *
 * Organization PLANS: standardized names, a color per role, and
 * group assignment. Plans are data — applying them to a live DAW
 * happens through the bridge's tools in Phase 4. Renaming is
 * idempotent: a name that already carries its role prefix is left
 * alone.
 */

import type { TrackRole } from "./recognition.ts";

export const ROLE_COLORS: Record<TrackRole, string> = {
  vocal: "#e74c3c",
  "backing-vocal": "#f1948a",
  kick: "#e67e22",
  snare: "#f1c40f",
  bass: "#8e44ad",
  guitar: "#27ae60",
  synth: "#2980b9",
  other: "#7f8c8d",
};

export const ROLE_GROUPS: Record<TrackRole, string> = {
  vocal: "Vocals",
  "backing-vocal": "Vocals",
  kick: "Drums",
  snare: "Drums",
  bass: "Bass",
  guitar: "Instruments",
  synth: "Instruments",
  other: "Other",
};

export type OrganizedTrack = {
  original: string;
  renamed: string;
  role: TrackRole;
  color: string;
  group: string;
};

export function organizeSession(
  tracks: Array<{ name: string; role: TrackRole }>,
): OrganizedTrack[] {
  return tracks.map((t) => {
    const alreadyPrefixed = t.name.toLowerCase().startsWith(`${t.role} - `);
    const renamed = alreadyPrefixed ? t.name : `${t.role} - ${t.name}`;
    return {
      original: t.name,
      renamed,
      role: t.role,
      color: ROLE_COLORS[t.role],
      group: ROLE_GROUPS[t.role],
    };
  });
}

export function groupTracks(organized: OrganizedTrack[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const t of organized) {
    (groups[t.group] ??= []).push(t.renamed);
  }
  return groups;
}
