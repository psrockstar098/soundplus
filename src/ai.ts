/**
 * AI client — OpenAI-compatible chat completions, BYOK.
 *
 * The producer's key is sent ONLY to their configured base URL, as a
 * Bearer token, and is never logged. For tests and for running without a
 * provider, a baseUrl starting with "stub://" returns a canned reply
 * and touches no network at all.
 */

export type ChatMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  kind?: "text" | "audio" | "image";
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    function: { name: string; arguments: string };
  }>;
};

/** A tool the model may call, in OpenAI function-calling shape. */
export type ChatTool = {
  /** Namespaced name the model calls, e.g. "flstudio.fl_get_tempo". */
  name: string;
  description: string;
  /** JSON Schema for arguments; defaults to a free-form object. */
  parameters?: Record<string, unknown>;
};

export type ChatOptions = {
  tools?: ChatTool[];
  /** Called for each model tool call; returns the text result. */
  onToolCall?: (name: string, args: Record<string, unknown>) => Promise<string>;
  /** Max model turns per chat call (default 8). */
  maxRounds?: number;
};

const TOOL_SYSTEM_PROMPT = `You are SoundPlus, an AI production assistant connected to FL Studio via Model Context Protocol (MCP).
You have tools for the DAW session: plugins, tracks, mixer state, piano roll, transport, and more.
When the user asks about the current DAW session, plugins, tracks, mixer state, or piano roll, call the matching tool and use its result. Do not claim you lack access to the local environment, and never invent DAW state you did not read through a tool.`;

export async function chatComplete(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<string> {
  if (baseUrl.startsWith("stub://")) {
    const last = [...messages].reverse().find((m) => m.role === "user");
    return `[stub model ${model}] heard: ${last ? last.content : "(no message)"}`;
  }
  // Providers' docs usually print the full endpoint URL
  // (.../v1/chat/completions). SoundPlus appends that path itself,
  // so strip it (and any trailing slash) first — otherwise the
  // request goes to .../chat/completions/chat/completions and the
  // provider answers 404.
  const url =
    baseUrl.replace(/\/$/, "").replace(/\/chat\/completions$/, "") +
    "/chat/completions";
  const tools = opts.tools ?? [];
  const working: ChatMessage[] = [...messages];
  if (tools.length > 0 && working[0]?.role !== "system") {
    working.unshift({ role: "system", content: TOOL_SYSTEM_PROMPT });
  }
  const maxRounds = opts.maxRounds ?? 8;
  for (let round = 0; round < maxRounds; round++) {
    const payload: Record<string, unknown> = {
      model,
      messages: working.map((m) => {
        const base: Record<string, unknown> = { role: m.role, content: m.content };
        if (m.tool_call_id) base.tool_call_id = m.tool_call_id;
        if (m.tool_calls) base.tool_calls = m.tool_calls;
        return base;
      }),
    };
    // tool_choice "auto": the model decides whether a tool fits.
    // (Forcing a tool by keyword would misfire on plain chat.)
    if (tools.length > 0) {
      payload.tools = tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters ?? { type: "object", properties: {} },
        },
      }));
      payload.tool_choice = "auto";
    }
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`provider error ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: Array<{
            id: string;
            function: { name: string; arguments: string };
          }>;
        };
      }>;
    };
    const message = data.choices?.[0]?.message;
    const toolCalls = message?.tool_calls ?? [];
    if (toolCalls.length === 0 || !opts.onToolCall) {
      const content = message?.content;
      if (typeof content !== "string") throw new Error("provider returned no text");
      return content;
    }
    working.push({
      role: "assistant",
      content: message?.content ?? "",
      tool_calls: toolCalls,
    });
    for (const call of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
      } catch {
        working.push({
          role: "tool",
          content: "Error: tool arguments were not valid JSON",
          tool_call_id: call.id,
        });
        continue;
      }
      let result: string;
      try {
        result = await opts.onToolCall(call.function.name, args);
      } catch (e) {
        result = `Error: ${e instanceof Error ? e.message : String(e)}`;
      }
      working.push({ role: "tool", content: result, tool_call_id: call.id });
    }
  }
  return "I called tools but did not reach a final answer.";
}
