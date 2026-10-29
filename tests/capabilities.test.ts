/**
 * Tests: capability gating + stub AI client. No real keys, no network.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { defaultSettings } from "../src/settings.ts";
import { enabledInputs, gateInput, modelCapabilities } from "../src/capabilities.ts";
import { chatComplete } from "../src/ai.ts";

describe("capability gating", () => {
  test("unknown model defaults to text-only", () => {
    const s = defaultSettings();
    s.provider.model = "anything";
    expect(modelCapabilities(s)).toEqual({ text: true, audio: false, image: false });
    expect(enabledInputs(s)).toEqual({ text: true, audio: false, image: false });
    expect(gateInput(s, "text")).toBeNull();
    expect(gateInput(s, "audio")).toContain("not supported");
    expect(gateInput(s, "image")).toContain("not supported");
  });

  test("a model entry with audio+image enables those inputs", () => {
    const s = defaultSettings();
    s.provider.model = "full-model";
    s.models = [
      { name: "full-model", baseUrl: "", capabilities: { text: true, audio: true, image: true } },
    ];
    expect(enabledInputs(s)).toEqual({ text: true, audio: true, image: true });
    expect(gateInput(s, "audio")).toBeNull();
    expect(gateInput(s, "image")).toBeNull();
  });
});

describe("stub AI client", () => {
  test("stub:// replies without network and never needs a key", async () => {
    const reply = await chatComplete("stub://demo", "", "stub-model", [
      { role: "user", content: "mix this track", kind: "text" },
    ]);
    expect(reply).toContain("stub-model");
    expect(reply).toContain("mix this track");
  });
});
