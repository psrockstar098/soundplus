/**
 * F18 — Preset Intelligence (standalone port).
 *
 * Search and recommend presets by source material, genre, and
 * desired sound. Scoring is tag overlap: genre and source matches
 * weigh more than sound tags. Zero-overlap presets are never
 * recommended — a bad recommendation is worse than none.
 */

export type Preset = {
  name: string;
  plugin: string;
  genres: string[];
  sources: string[];
  sounds: string[];
};

export type PresetQuery = {
  source?: string;
  genre?: string;
  sound?: string;
};

export type PresetMatch = { preset: Preset; score: number };

function norm(s: string): string {
  return s.toLowerCase().trim();
}

export function recommendPresets(presets: Preset[], query: PresetQuery): PresetMatch[] {
  const out: PresetMatch[] = [];
  for (const p of presets) {
    let score = 0;
    if (query.genre && p.genres.some((g) => norm(g) === norm(query.genre!))) score += 2;
    if (query.source && p.sources.some((s) => norm(s) === norm(query.source!))) score += 2;
    if (query.sound && p.sounds.some((s) => norm(s).includes(norm(query.sound!)))) score += 1;
    if (score > 0) out.push({ preset: p, score });
  }
  return out.sort((a, b) => b.score - a.score);
}
