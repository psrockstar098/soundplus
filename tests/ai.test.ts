import { describe, expect, test, afterEach } from "bun:test";
import { chatComplete } from "../src/ai.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function stubFetch(called: string[]) {
  globalThis.fetch = (async (url: string | URL | Request) => {
    called.push(String(url));
    return new Response(
      JSON.stringify({ choices: [{ message: { content: "ok" } }] }),
      { headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;
}

describe("chatComplete endpoint URL", () => {
  test("a base URL that already ends in /chat/completions is not doubled", async () => {
    const called: string[] = [];
    stubFetch(called);
    await chatComplete(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      "test-key",
      "test-model",
      [{ role: "user", content: "hi" }],
    );
    expect(called).toEqual(["https://integrate.api.nvidia.com/v1/chat/completions"]);
  });

  test("a trailing slash is stripped before appending the path", async () => {
    const called: string[] = [];
    stubFetch(called);
    await chatComplete("https://example.test/v1/", "test-key", "test-model", [
      { role: "user", content: "hi" },
    ]);
    expect(called).toEqual(["https://example.test/v1/chat/completions"]);
  });

  test("a plain base URL gets the path appended once", async () => {
    const called: string[] = [];
    stubFetch(called);
    await chatComplete("https://example.test/v1", "test-key", "test-model", [
      { role: "user", content: "hi" },
    ]);
    expect(called).toEqual(["https://example.test/v1/chat/completions"]);
  });
});
