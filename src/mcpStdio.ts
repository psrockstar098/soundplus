/**
 * MCP-over-stdio client — for bridges that are local programs, not
 * HTTP servers. This is how the real DAW bridges work: rosasynthesiz
 * flstudio-mcp, hedidjs cubase-mcp, and calvinw fl-studio-mcp are
 * all FastMCP servers whose default transport is stdio (a spawned
 * process speaking newline-delimited JSON-RPC on stdin/stdout).
 *
 * One client = one spawned bridge process, kept alive across calls
 * and closed with close(). Responses are matched to requests by id;
 * notifications (no id) are ignored. A dead stream rejects pending
 * requests instead of hanging.
 */

import { spawn, type Subprocess } from "bun";

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class StdioMcpClient {
  private proc: Subprocess | null = null;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private buffer = "";
  private decoder = new TextDecoder();
  private started = false;

  constructor(
    private command: string,
    private args: string[],
    private cwd?: string,
  ) {}

  start(): void {
    if (this.started) return;
    this.started = true;
    // Throws synchronously when the command does not exist; the
    // caller (gateway) turns that into a skipped server, never a crash.
    this.proc = spawn([this.command, ...this.args], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "ignore",
      cwd: this.cwd,
    });
    void this.pump();
  }

  private async pump(): Promise<void> {
    if (!this.proc) return;
    const reader = this.proc.stdout.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        this.buffer += this.decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = this.buffer.indexOf("\n")) >= 0) {
          const line = this.buffer.slice(0, idx).trim();
          this.buffer = this.buffer.slice(idx + 1);
          if (line) this.handleLine(line);
        }
      }
    } catch {
      // Stream ended; pending requests are rejected below.
    }
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error("stdio MCP server closed the stream"));
    }
    this.pending.clear();
  }

  private handleLine(line: string): void {
    let msg: { id?: number; result?: unknown; error?: { message?: string } };
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    if (msg.id === undefined || msg.id === null) return; // notification
    const p = this.pending.get(msg.id);
    if (!p) return;
    this.pending.delete(msg.id);
    clearTimeout(p.timer);
    if (msg.error) {
      p.reject(new Error(`MCP error: ${msg.error.message ?? "unknown"}`));
    } else {
      p.resolve(msg.result);
    }
  }

  request(method: string, params?: unknown, timeoutMs = 15000): Promise<unknown> {
    this.start();
    if (!this.proc) {
      return Promise.reject(new Error("stdio MCP server not started"));
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`stdio MCP request timed out: ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.proc!.stdin.write(
          `${JSON.stringify({ jsonrpc: "2.0", id, method, params: params ?? {} })}\n`,
        );
      } catch (e) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
  }

  close(): void {
    try {
      this.proc?.kill();
    } catch {
      // Already gone.
    }
    this.proc = null;
    this.started = false;
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error("stdio MCP client closed"));
    }
    this.pending.clear();
  }
}
