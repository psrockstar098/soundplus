/**
 * Mock MCP-over-stdio server for tests. Reads newline-delimited
 * JSON-RPC from stdin, writes responses to stdout — the same shape
 * a FastMCP server speaks. Run with: bun tests/fixtures/mock-stdio-server.ts
 */

const decoder = new TextDecoder();
let buffer = "";

function send(id: unknown, result: unknown): void {
  console.log(JSON.stringify({ jsonrpc: "2.0", id, result }));
}

for await (const chunk of Bun.stdin.stream()) {
  buffer += decoder.decode(chunk, { stream: true });
  let idx: number;
  while ((idx = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    let msg: { id?: unknown; method?: string; params?: { name?: string } };
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    if (msg.method === "initialize") {
      send(msg.id, { protocolVersion: "2024-11-05" });
    } else if (msg.method === "tools/list") {
      send(msg.id, {
        tools: [
          { name: "list_plugins", description: "list", inputSchema: { type: "object", properties: { q: { type: "string" } } } },
          { name: "get_project", description: "read" },
          { name: "bad name!", description: "invalid: breaks the MCP tool-name pattern" },
        ],
      });
    } else if (msg.method === "tools/call") {
      if (msg.params?.name === "list_plugins") {
        send(msg.id, { plugins: [{ name: "EQ" }, { name: "Comp" }] });
      } else if (msg.params?.name === "get_project") {
        send(msg.id, { tracks: [{ name: "Vocal" }] });
      } else {
        send(msg.id, { ok: true });
      }
    }
  }
}
