/**
 * Tests: F19 knowledge base, F20 chain optimization.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { KnowledgeBase } from "../../src/features/kb.ts";

describe("F19 knowledge base", () => {
  test("search finds the doc about the query, title hits rank first", () => {
    const kb = new KnowledgeBase();
    kb.addDoc({
      id: "eq-manual",
      plugin: "Pro-Q 3",
      title: "EQ frequency bands",
      text: "Use the frequency knob to sweep bands.",
      params: ["Frequency", "Gain"],
    });
    kb.addDoc({
      id: "comp-manual",
      plugin: "Pro-C 2",
      title: "Compressor threshold",
      text: "The threshold sets where compression begins.",
      params: ["Threshold", "Ratio"],
    });
    expect(kb.count()).toBe(2);
    const out = kb.search("frequency bands");
    expect(out[0].doc.id).toBe("eq-manual");
    expect(kb.search("reverb tail")).toEqual([]);
    expect(kb.search("")).toEqual([]);
  });

  test("re-adding the same id replaces the doc", () => {
    const kb = new KnowledgeBase();
    kb.addDoc({ id: "d1", plugin: "X", title: "Old", text: "old text", params: [] });
    kb.addDoc({ id: "d1", plugin: "X", title: "New", text: "new text", params: [] });
    expect(kb.count()).toBe(1);
    expect(kb.search("new")[0].doc.title).toBe("New");
  });
});

