/**
 * F11 — Automatic Track Recognition (standalone port).
 *
 * Identify track sources from names first (strongest signal in real
 * sessions) and from audio band shares as a fallback. Audio-only
 * calls carry low confidence and say so — a sub-heavy track is
 * probably a kick, not certainly one. The AI treats low-confidence
 * roles as suggestions, never facts.
 */

import type { BandShares } from "./dsp.ts";

export type TrackRole =
  | "vocal"
  | "backing-vocal"
  | "kick"
  | "snare"
  | "bass"
  | "guitar"
  | "synth"
  | "other";

export type Recognition = {
  track: string;
  role: TrackRole;
  confidence: number; // 0..1
  basis: "name" | "audio" | "none";
};

const NAME_ROLES: Array<[TrackRole, string[]]> = [
  ["backing-vocal", ["backing", "bgv", "harmony", "choir", "adlib"]],
  ["vocal", ["vocal", "vox", "lead", "voice"]],
  ["kick", ["kick", "bd ", "bass drum"]],
  ["snare", ["snare", "sd ", "clap"]],
  ["bass", ["bass", "sub ", "808"]],
  ["guitar", ["guitar", "gtr"]],
  ["synth", ["synth", "pad", "keys", "piano", "arp"]],
];

export function classifyTrack(
  name: string,
  audio?: { bands: BandShares },
): Recognition {
  const lower = name.toLowerCase();
  for (const [role, words] of NAME_ROLES) {
    if (words.some((w) => lower.includes(w))) {
      return { track: name, role, confidence: 0.9, basis: "name" };
    }
  }
  if (audio) {
    if (audio.bands.sub > 0.5) {
      return { track: name, role: "kick", confidence: 0.55, basis: "audio" };
    }
    if (audio.bands.lowMid > 0.5) {
      return { track: name, role: "bass", confidence: 0.5, basis: "audio" };
    }
    if (audio.bands.high > 0.4) {
      return { track: name, role: "synth", confidence: 0.45, basis: "audio" };
    }
  }
  return { track: name, role: "other", confidence: 0.3, basis: "none" };
}

export function classifyProject(
  tracks: Array<{ name: string; audio?: { bands: BandShares } }>,
): Recognition[] {
  return tracks.map((t) => classifyTrack(t.name, t.audio));
}
