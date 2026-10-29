/**
 * F5 — Intelligent Vocal and Drum Processing (standalone port).
 *
 * Source-aware processing PLANS (not audio rendering): given track
 * roles, produce ordered, parameterized steps the DAW executes
 * through its bridge. Parameters are starting points for the AI to
 * refine against real audio (F3/F4), not fixed prescriptions.
 */

export type ProcessStep = {
  stage: string;
  tool: string;
  params: Record<string, number | string>;
  note: string;
};

/** Vocal chain: de-ess -> clarity EQ -> compression. */
export function buildVocalChain(): ProcessStep[] {
  return [
    {
      stage: "de-ess",
      tool: "de-esser",
      params: { frequencyHz: 7000, thresholdDb: -18 },
      note: "Tame sibilance before EQ lifts the top end.",
    },
    {
      stage: "clarity-eq",
      tool: "eq",
      params: { highShelfHz: 10000, gainDb: 2, lowCutHz: 80 },
      note: "Air lift plus low cut to clear mud under the vocal.",
    },
    {
      stage: "compression",
      tool: "compressor",
      params: { ratio: 3, attackMs: 10, releaseMs: 120, thresholdDb: -18 },
      note: "Gentle leveling; the AI revises against measured dynamics.",
    },
  ];
}

export type DrumRoles = {
  kick: boolean;
  snare: boolean;
  bass: boolean;
};

/** Drum plan: only stages for roles actually present in the project. */
export function buildDrumPlan(roles: DrumRoles): ProcessStep[] {
  const steps: ProcessStep[] = [];
  if (roles.kick && roles.bass) {
    steps.push({
      stage: "kick-bass-balance",
      tool: "eq",
      params: { kickFundamentalHz: 50, bassCutHz: 50 },
      note: "Give the kick the sub fundamental; carve the bass around it.",
    });
  }
  if (roles.snare) {
    steps.push({
      stage: "snare-punch",
      tool: "compressor",
      params: { ratio: 4, attackMs: 5, releaseMs: 100 },
      note: "Fast attack shaping for snap; body preserved by release.",
    });
  }
  if (roles.kick || roles.snare || roles.bass) {
    steps.push({
      stage: "drum-bus",
      tool: "compressor",
      params: { ratio: 2, attackMs: 30, releaseMs: 200 },
      note: "Bus glue: slow attack so transients survive.",
    });
    steps.push({
      stage: "reverb-management",
      tool: "reverb",
      params: { mixPercent: 12, preDelayMs: 20 },
      note: "Short, low-mix room so drums stay forward.",
    });
  }
  return steps;
}
