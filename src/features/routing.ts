/**
 * F13 — Intelligent Routing Assistant (standalone port).
 *
 * Routing PLANS: buses, sends, sidechains, and parallel routes.
 * Each step declares what it requires; a step whose requirement is
 * missing (e.g. sidechain with no kick) is reported as blocked, not
 * silently planned. Applying plans to a live DAW goes through the
 * bridge's tools in Phase 4.
 */

import type { TrackRole } from "./recognition.ts";

export type RoutingStep = {
  kind: "bus" | "send" | "sidechain" | "parallel";
  name: string;
  detail: string;
};

export type RoutingPlan = {
  steps: RoutingStep[];
  blocked: Array<{ step: string; reason: string }>;
};

export function planRouting(rolesPresent: TrackRole[]): RoutingPlan {
  const has = (r: TrackRole) => rolesPresent.includes(r);
  const steps: RoutingStep[] = [];
  const blocked: Array<{ step: string; reason: string }> = [];

  if (has("kick") || has("snare")) {
    steps.push({ kind: "bus", name: "Drum Bus", detail: "Route kick and snare to a shared drum bus." });
  }
  if (has("vocal") || has("backing-vocal")) {
    steps.push({ kind: "bus", name: "Vocal Bus", detail: "Route vocals to a shared vocal bus." });
  }
  if (has("vocal") || has("synth")) {
    steps.push({ kind: "send", name: "Reverb Send", detail: "Shared reverb send for vocals and synths." });
  }
  if (has("kick") && has("bass")) {
    steps.push({
      kind: "sidechain",
      name: "Kick -> Bass sidechain",
      detail: "Duck the bass compressor on each kick hit.",
    });
  } else if (has("bass") && !has("kick")) {
    blocked.push({ step: "Kick -> Bass sidechain", reason: "no kick track present" });
  }
  if (has("vocal")) {
    steps.push({
      kind: "parallel",
      name: "Vocal Parallel",
      detail: "Parallel compressed copy of the vocal bus, blended underneath.",
    });
  }
  return { steps, blocked };
}
