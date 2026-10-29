/**
 * F20 — Plugin Chain Optimization (standalone port).
 *
 * Compare effect orders and combinations, then rank them by an
 * evaluation score. The evaluator is injected: in tests it is a
 * synthetic scorer; in production it measures real audio results
 * (F3 analysis before/after). Candidate orders are all permutations
 * for small chains; for larger chains a few heuristic orders are
 * used instead of factorial blowup. An empty chain list ranks empty.
 */

export type ChainRank = { chain: string[]; score: number };

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const p of permutations(rest)) out.push([items[i], ...p]);
  }
  return out;
}

export function optimizeChains(
  plugins: string[],
  evaluate: (chain: string[]) => number,
): ChainRank[] {
  if (plugins.length === 0) return [];
  const candidates =
    plugins.length <= 4
      ? permutations(plugins)
      : [plugins, [...plugins].reverse(), [...plugins].sort()];
  return candidates
    .map((chain) => ({ chain, score: evaluate(chain) }))
    .sort((a, b) => b.score - a.score);
}
