/**
 * Tests: settings masking + save/load. Placeholder keys only.
 * Run: bun test
 */

import { describe, test, expect } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  maskKey,
  publicSettings,
  loadSettings,
  saveSettings,
  defaultSettings,
} from "../src/settings.ts";

describe("maskKey", () => {
  test("exposes at most the last 4 chars", () => {
    expect(maskKey("sk-abcdef123456")).toBe("****3456");
    expect(maskKey("short")).toBe("****hort");
  });
  test("empty and short keys reveal nothing", () => {
    expect(maskKey("")).toBe("****");
    expect(maskKey("abc")).toBe("****");
  });
});

describe("settings roundtrip", () => {
  test("save/load preserves the key on disk but never in the public view", () => {
    const dir = mkdtempSync(join(tmpdir(), "soundplus-test-"));
    const s = defaultSettings();
    s.provider = { baseUrl: "stub://demo", apiKey: "sk-test-abcdef1234", model: "stub-model" };
    saveSettings(s, dir);
    const loaded = loadSettings(dir);
    expect(loaded.provider.apiKey).toBe("sk-test-abcdef1234");
    const pub = publicSettings(loaded);
    expect(pub.provider.apiKey).toBe("****1234");
    expect(JSON.stringify(pub)).not.toContain("sk-test-abcdef1234");
  });
});
