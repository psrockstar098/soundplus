/**
 * F26 — Genre-Aware Mixing Profiles (standalone port).
 *
 * Starting-point strategies per genre. An unknown genre returns
 * null — never a generic profile dressed up as genre knowledge.
 * The AI refines these starting points against real audio (F3).
 */

export type GenreProfile = {
  genre: string;
  bassDb: number;
  vocalPresenceDb: number;
  drumPunch: "low" | "medium" | "high";
  reverbMixPercent: number;
  note: string;
};

const PROFILES: Record<string, GenreProfile> = {
  "hip-hop": {
    genre: "hip-hop",
    bassDb: 3,
    vocalPresenceDb: 2,
    drumPunch: "high",
    reverbMixPercent: 8,
    note: "808 weight, forward vocal, hard-hitting drums.",
  },
  afrobeats: {
    genre: "afrobeats",
    bassDb: 2,
    vocalPresenceDb: 2,
    drumPunch: "high",
    reverbMixPercent: 12,
    note: "Groove-first: bass and percussion drive, vocals sit on top.",
  },
  gospel: {
    genre: "gospel",
    bassDb: 1,
    vocalPresenceDb: 4,
    drumPunch: "medium",
    reverbMixPercent: 20,
    note: "Choir and lead vocals forward, spacious room.",
  },
  pop: {
    genre: "pop",
    bassDb: 1,
    vocalPresenceDb: 3,
    drumPunch: "medium",
    reverbMixPercent: 14,
    note: "Polished vocal, tight low end, controlled width.",
  },
  rock: {
    genre: "rock",
    bassDb: 1,
    vocalPresenceDb: 2,
    drumPunch: "high",
    reverbMixPercent: 10,
    note: "Guitars and drums up front, vocal cutting through.",
  },
  edm: {
    genre: "edm",
    bassDb: 3,
    vocalPresenceDb: 1,
    drumPunch: "high",
    reverbMixPercent: 16,
    note: "Huge low end, sidechained space, wide synths.",
  },
};

/** Null for unknown genres — never a disguised generic profile. */
export function genreProfile(genre: string): GenreProfile | null {
  return PROFILES[genre.toLowerCase().trim()] ?? null;
}

export function knownGenres(): string[] {
  return Object.keys(PROFILES);
}
