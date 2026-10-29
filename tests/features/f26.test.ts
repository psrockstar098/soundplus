/**
 * Tests: F26 genre profiles, F27 sound design, F28 mix variants.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { genreProfile, knownGenres } from "../../src/features/genres.ts";

describe("F26 genre profiles", () => {
  test("known genres return profiles", () => {
    expect(knownGenres().sort()).toEqual(
      ["afrobeats", "edm", "gospel", "hip-hop", "pop", "rock"].sort(),
    );
    expect(genreProfile("Afrobeats")?.genre).toBe("afrobeats");
    expect(genreProfile("HIP-HOP")?.drumPunch).toBe("high");
    expect(genreProfile("gospel")?.vocalPresenceDb).toBe(4);
  });

  test("unknown genre returns null, never generic", () => {
    expect(genreProfile("k-pop")).toBeNull();
    expect(genreProfile("")).toBeNull();
  });
});

