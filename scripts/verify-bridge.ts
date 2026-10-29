/**
 * Phase 4 CLI: verify one DAW bridge and print the report as JSON.
 *
 * HTTP bridge:
 *   bun scripts/verify-bridge.ts <server-name> <bridge-url>
 *
 * Stdio bridge (how the real DAW bridges run — a local program):
 *   bun scripts/verify-bridge.ts <server-name> stdio [--cwd <dir>] <command> [args...]
 *
 * Examples:
 *   bun scripts/verify-bridge.ts flstudio stdio fl-studio-mcp-daemon
 *   bun scripts/verify-bridge.ts cubase stdio --cwd ./cubase-mcp python server.py
 *
 * No key, no DAW project, and no audio is touched — this only reads
 * tools, plugin lists, and project state.
 */

import { verifyBridge } from "../src/verify.ts";

const argv = process.argv.slice(2);
const name = argv[0];
if (!name || argv.length < 2) {
  console.error(
    "Usage: bun scripts/verify-bridge.ts <server-name> <bridge-url>\n" +
      "   or: bun scripts/verify-bridge.ts <server-name> stdio [--cwd <dir>] <command> [args...]",
  );
  process.exit(1);
}

let server;
if (argv[1] === "stdio") {
  const rest = argv.slice(2);
  let cwd: string | undefined;
  if (rest[0] === "--cwd") {
    cwd = rest[1];
    rest.splice(0, 2);
  }
  const [command, ...args] = rest;
  if (!command) {
    console.error("stdio mode needs a command");
    process.exit(1);
  }
  server = { name, url: "", transport: "stdio" as const, command, args, cwd };
} else {
  server = { name, url: argv[1], transport: "http" as const };
}

const report = await verifyBridge(server);
console.log(JSON.stringify(report, null, 2));
process.exit(report.reachable ? 0 : 1);
