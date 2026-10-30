/**
 * AI client — OpenAI-compatible chat completions, BYOK.
 *
 * The producer's key is sent ONLY to their configured base URL, as a
 * Bearer token, and is never logged. For tests and for running without a
 * provider, a baseUrl starting with "stub://" returns a canned reply
 * and touches no network at all.
 */

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  kind?: "text" | "audio" | "image";
};

export async function chatComplete(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
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
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`provider error ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("provider returned no text");
  return content;
}
