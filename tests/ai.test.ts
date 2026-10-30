import { describe, expect, test, afterEach } from "bun:test";
import { chatComplete, sanitizeProviderToolName } from "../src/ai.ts";

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
                  // The model only ever sees the sanitized name...
                  { id: "call_1", function: { name: "flstudio_fl_ping", arguments: "{}" } },
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
    // ...but execution routes on the original namespaced name.
    expect(calls).toEqual([{ name: "flstudio.fl_ping", args: {} }]);
    const first = seen[0] as { tools: Array<{ function: { name: string } }> };
    expect(first.tools.map((t) => t.function.name)).toEqual(["flstudio_fl_ping"]);
    const second = seen[1] as { messages: Array<Record<string, unknown>> };
    const toolMsg = second.messages.find((m) => m.role === "tool");
    expect(toolMsg?.tool_call_id).toBe("call_1");
    expect(toolMsg?.content).toBe("pong");
  });

  test("provider tool names are sanitized and collisions disambiguated", async () => {
    expect(sanitizeProviderToolName("flstudio.fl_ping")).toBe("flstudio_fl_ping");
    expect(sanitizeProviderToolName("my server.bad name!")).toBe("my_server_bad_name_");
    expect(sanitizeProviderToolName("flstudio.fl-ping_x")).toBe("flstudio_fl-ping_x");
    const seen: unknown[] = [];
    stubFetchSequence(
      [
        {
          choices: [
            {
              message: {
                content: "",
                tool_calls: [
                  { id: "c1", function: { name: "a_b", arguments: "{}" } },
                  { id: "c2", function: { name: "a_b__2", arguments: "{}" } },
                ],
              },
            },
          ],
        },
        { choices: [{ message: { content: "done" } }] },
      ],
      seen,
    );
    const calls: string[] = [];
    await chatComplete("https://example.test/v1", "k", "m", [
      { role: "user", content: "hi" },
    ], {
      // Both sanitize to "a_b" — the second gets a suffix, and each
      // routes back to its own original tool.
      tools: [
        { name: "a.b", description: "first" },
        { name: "a_b", description: "second" },
      ],
      onToolCall: async (name) => {
        calls.push(name);
        return "ok";
      },
    });
    const first = seen[0] as { tools: Array<{ function: { name: string } }> };
    expect(first.tools.map((t) => t.function.name)).toEqual(["a_b", "a_b__2"]);
    expect(calls).toEqual(["a.b", "a_b"]);
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
    expect(first.tools.map((t) => t.function.name)).toEqual(["flstudio_fl_ping"]);
    expect(first.tool_choice).toBe("auto");
    // Production-agent rules ride in the system prompt.
    const prompt = first.messages[0]?.content ?? "";
    expect(prompt).toContain("fl_take_snapshot");
    expect(prompt).toContain("fl_set_dry_run");
    expect(prompt).toContain("fl_rollback_last_change");
    expect(prompt).toContain("cannot load a new plugin");
    expect(prompt).toContain("cannot render or export audio");
    expect(prompt).toContain("not LUFS");
    expect(prompt).toContain("use fl_plugin_list for the live session's loaded plugins");
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
