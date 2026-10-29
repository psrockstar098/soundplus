/**
 * F19 — Custom Plugin Knowledge Base (standalone port).
 *
 * Index plugin manuals, vendor docs, and parameter metadata so the
 * AI can understand unfamiliar plugins. Simple token-overlap search
 * over titles, text, and parameter names — no embeddings, no
 * external service, and zero-score docs are never returned.
 */

export type DocEntry = {
  id: string;
  plugin: string;
  title: string;
  text: string;
  params: string[];
};

export type DocMatch = { doc: DocEntry; score: number };

function tokens(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
}

export class KnowledgeBase {
  private docs: DocEntry[] = [];

  addDoc(doc: DocEntry): void {
    this.docs = [...this.docs.filter((d) => d.id !== doc.id), doc];
  }

  search(query: string): DocMatch[] {
    const q = new Set(tokens(query));
    if (q.size === 0) return [];
    const out: DocMatch[] = [];
    for (const doc of this.docs) {
      const hay = tokens(`${doc.title} ${doc.text} ${doc.params.join(" ")}`);
      const haySet = new Set(hay);
      let score = 0;
      for (const t of q) if (haySet.has(t)) score++;
      // Title hits weigh double: the doc is ABOUT the query term.
      const titleTokens = new Set(tokens(doc.title));
      for (const t of q) if (titleTokens.has(t)) score++;
      if (score > 0) out.push({ doc, score });
    }
    return out.sort((a, b) => b.score - a.score);
  }

  count(): number {
    return this.docs.length;
  }
}
