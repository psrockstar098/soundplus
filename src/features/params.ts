/**
 * F16 — Plugin Parameter Understanding (standalone port).
 *
 * Translate plugin controls into meaningful concepts: infer what a
 * parameter IS from its name (gain, frequency, threshold, ratio,
 * attack, release, mix, time), describe it in plain words with its
 * verified unit and range, and map a user's plain instruction to
 * the parameters it actually touches. An instruction with no
 * matching concept maps to nothing — never to an invented parameter.
 */

export type ParamDef = {
  name: string;
  unit: string;
  min: number;
  max: number;
  defaultValue: number;
};

export type Concept =
  | "gain"
  | "frequency"
  | "q"
  | "threshold"
  | "ratio"
  | "attack"
  | "release"
  | "mix"
  | "time"
  | "unknown";

const CONCEPT_KEYWORDS: Array<[Concept, string[]]> = [
  ["threshold", ["threshold"]],
  ["frequency", ["freq", "cutoff", "hz"]],
  ["attack", ["attack"]],
  ["release", ["release"]],
  ["ratio", ["ratio"]],
  ["q", ["q", "resonance", "bandwidth"]],
  ["mix", ["mix", "wet", "dry"]],
  ["time", ["time", "delay", "decay", "predelay", "pre-delay"]],
  ["gain", ["gain", "level", "volume", "drive", "output", "input"]],
];

export function inferConcept(param: ParamDef): Concept {
  const lower = param.name.toLowerCase();
  for (const [concept, words] of CONCEPT_KEYWORDS) {
    if (words.some((w) => lower.includes(w))) return concept;
  }
  return "unknown";
}

export function describeParam(param: ParamDef): string {
  const concept = inferConcept(param);
  return `${param.name} (${concept}): ${param.min} to ${param.max} ${param.unit}, default ${param.defaultValue} ${param.unit}`;
}

const INSTRUCTION_CONCEPTS: Array<[Concept, string[]]> = [
  ["gain", ["gain", "volume", "louder", "quieter", "level"]],
  ["frequency", ["frequency", "freq", "bass", "treble", "highs", "lows", "top end", "low end"]],
  ["threshold", ["threshold"]],
  ["ratio", ["ratio", "compression", "compress"]],
  ["attack", ["attack"]],
  ["release", ["release"]],
  ["mix", ["mix", "wet", "reverb amount"]],
  ["time", ["time", "delay", "decay", "echo"]],
];

export type InstructionMatch = {
  param: ParamDef;
  concept: Concept;
  direction: "up" | "down" | "neutral";
};

/** Map a plain instruction to verified parameters, or nothing. */
export function mapInstruction(instruction: string, params: ParamDef[]): InstructionMatch[] {
  const lower = instruction.toLowerCase();
  const wanted = new Set<Concept>();
  for (const [concept, words] of INSTRUCTION_CONCEPTS) {
    if (words.some((w) => lower.includes(w))) wanted.add(concept);
  }
  if (wanted.size === 0) return [];
  const direction: InstructionMatch["direction"] = /boost|increase|more|up|louder/.test(lower)
    ? "up"
    : /cut|decrease|less|down|quieter/.test(lower)
      ? "down"
      : "neutral";
  return params
    .map((p) => ({ param: p, concept: inferConcept(p), direction }))
    .filter((m) => wanted.has(m.concept));
}
