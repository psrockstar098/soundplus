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

describe("chatComplete tool loop", () => {
  function stubFetchSequence(responses: unknown[], seen: unknown[]) {
    let i = 0;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      seen.push(JSON.parse(String(init?.body ?? "{}")));
      const body = responses[Math.min(i++, responses.length - 1)];
      return new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;
  }

  test("a tool call executes and its result feeds the next turn", async () => {
    const seen: unknown[] = [];
    stubFetchSequence(
      [
        {
          choices: [
            {
              message: {
                content: "",
                tool_calls: [
                  { id: "call_1", function: { name: "flstudio.fl_ping", arguments: "{}" } },
                ],
              },
            },
          ],
        },
        { choices: [{ message: { content: "pong reply" } }] },
      ],
      seen,
    );
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const reply = await chatComplete("https://example.test/v1", "k", "m", [
      { role: "user", content: "ping FL" },
    ], {
      tools: [{ name: "flstudio.fl_ping", description: "ping" }],
      onToolCall: async (name, args) => {
        calls.push({ name, args });
        return "pong";
      },
    });
    expect(reply).toBe("pong reply");
    expect(calls).toEqual([{ name: "flstudio.fl_ping", args: {} }]);
    const second = seen[1] as { messages: Array<Record<string, unknown>> };
    const toolMsg = second.messages.find((m) => m.role === "tool");
    expect(toolMsg?.tool_call_id).toBe("call_1");
    expect(toolMsg?.content).toBe("pong");
  });

  test("tools are sent with tool_choice auto and a system prompt", async () => {
    const seen: unknown[] = [];
    stubFetchSequence([{ choices: [{ message: { content: "done" } }] }], seen);
    await chatComplete("https://example.test/v1", "k", "m", [
      { role: "user", content: "hi" },
    ], {
      tools: [{ name: "flstudio.fl_ping", description: "ping" }],
    });
    const first = seen[0] as {
      messages: Array<{ role: string; content?: string }>;
      tools: Array<{ function: { name: string } }>;
      tool_choice: string;
    };
    expect(first.messages[0]?.role).toBe("system");
    expect(first.tools.map((t) => t.function.name)).toEqual(["flstudio.fl_ping"]);
    expect(first.tool_choice).toBe("auto");
    // Production-agent rules ride in the system prompt.
    const prompt = first.messages[0]?.content ?? "";
    expect(prompt).toContain("fl_take_snapshot");
    expect(prompt).toContain("fl_set_dry_run");
    expect(prompt).toContain("fl_rollback_last_change");
    expect(prompt).toContain("cannot load a new plugin");
    expect(prompt).toContain("cannot render or export audio");
    expect(prompt).toContain("not LUFS");
  });
});

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
