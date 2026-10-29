/**
 * F27 — Creative Sound Design (standalone port).
 *
 * Effect-chain plans for transitions, risers, impacts, and
 * atmospheric textures. Plans are ordered stages with starting
 * parameters — the DAW renders them through its bridge in Phase 4.
 */

export type DesignStep = {
  stage: string;
  tool: string;
  params: Record<string, number | string>;
};

export type DesignType = "riser" | "impact" | "texture" | "transition";

export function buildSoundDesign(type: DesignType): DesignStep[] {
  switch (type) {
    case "riser":
      return [
        { stage: "noise-bed", tool: "noise", params: { levelDb: -24 } },
        { stage: "filter-sweep-up", tool: "filter", params: { fromHz: 200, toHz: 12000 } },
        { stage: "gain-ramp", tool: "gain", params: { fromDb: -24, toDb: 0 } },
        { stage: "reverb-build", tool: "reverb", params: { mixPercent: 40 } },
      ];
    case "impact":
      return [
        { stage: "transient", tool: "transient-shaper", params: { attackDb: 6 } },
        { stage: "low-thump", tool: "sine-drop", params: { fromHz: 150, toHz: 40 } },
        { stage: "reverb-tail", tool: "reverb", params: { mixPercent: 25, decayS: 2.5 } },
      ];
    case "texture":
      return [
        { stage: "pad", tool: "synth-pad", params: { detuneCents: 8 } },
        { stage: "chorus", tool: "chorus", params: { rateHz: 0.5, depthPercent: 40 } },
        { stage: "long-reverb", tool: "reverb", params: { mixPercent: 50, decayS: 6 } },
      ];
    case "transition":
      return [
        { stage: "filter-sweep", tool: "filter", params: { fromHz: 12000, toHz: 200 } },
        { stage: "riser", tool: "noise", params: { levelDb: -18 } },
        { stage: "impact", tool: "transient-shaper", params: { attackDb: 6 } },
        { stage: "breath", tool: "silence", params: { durationMs: 150 } },
      ];
  }
}
