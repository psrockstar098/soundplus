/**
 * Phase 4 CLI: verify one DAW bridge and print the report as JSON.
 *
 * Usage:
 *   bun scripts/verify-bridge.ts <server-name> <bridge-url>
 *
 * Example (on the Windows PC, with FL Studio's bridge running):
 *   bun scripts/verify-bridge.ts flstudio http://127.0.0.1:PORT
 *
 * The URL is whatever the bridge (flstudio-mcp / cubase-mcp) prints
 * when it starts. No key, no DAW project, and no audio is touched —
 * this only reads tools, plugin lists, and project state.
 */

import { verifyBridge } from "../src/verify.ts";

const [name, url] = process.argv.slice(2);
if (!name || !url) {
  console.error("Usage: bun scripts/verify-bridge.ts <server-name> <bridge-url>");
  process.exit(1);
}

const report = await verifyBridge({ name, url, transport: "http" });
console.log(JSON.stringify(report, null, 2));
process.exit(report.reachable ? 0 : 1);
