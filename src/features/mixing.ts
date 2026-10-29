/**
 * F4 — Autonomous Mixing and Self-Correction (standalone port).
 *
 * Plan -> execute -> evaluate -> revise, until the criteria are met
 * or the round budget runs out. The loop is dependency-injected:
 * steps carry their own execute/evaluate functions, so the same loop
 * drives mock steps in tests and real MCP tool calls in production.
 * A failed step is recorded and scores 0 — it never crashes the loop.
 */

export type MixStep = {
  name: string;
  execute: () => Promise<void>;
  evaluate: () => number; // 0..1, 1 = criteria fully met
};

export type MixRound = { round: number; scores: Record<string, number>; mean: number };

export type MixResult = {
  rounds: MixRound[];
  finalScore: number;
  stopped: "target" | "max-rounds" | "no-steps";
  failures: string[];
};

export async function autonomousMix(opts: {
  steps: MixStep[];
  target?: number;
  maxRounds?: number;
}): Promise<MixResult> {
  const target = opts.target ?? 0.9;
  const maxRounds = opts.maxRounds ?? 5;
  const rounds: MixRound[] = [];
  const failures: string[] = [];
  if (opts.steps.length === 0) {
    return { rounds, finalScore: 0, stopped: "no-steps", failures };
  }
  for (let round = 1; round <= maxRounds; round++) {
    const scores: Record<string, number> = {};
    for (const step of opts.steps) {
      try {
        await step.execute();
        scores[step.name] = Math.max(0, Math.min(1, step.evaluate()));
      } catch (e) {
        failures.push(`${step.name}: ${e instanceof Error ? e.message : String(e)}`);
        scores[step.name] = 0;
      }
    }
    const values = Object.values(scores);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    rounds.push({ round, scores, mean });
    if (mean >= target) {
      return { rounds, finalScore: mean, stopped: "target", failures };
    }
  }
  const finalScore = rounds.length ? rounds[rounds.length - 1].mean : 0;
  return { rounds, finalScore, stopped: "max-rounds", failures };
}
