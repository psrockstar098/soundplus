# SoundPlus

Standalone AI mixing and mastering assistant for FL Studio and Cubase,
built with Yatta JS. No VST, no plugin container: the producer opens
SoundPlus next to the DAW, and it drives the DAW through MCP bridges.

## Phase 1 — skeleton (this commit)

- Yatta JS app (`yatta.js/api`) serving a chatbox page at `/`
- BYOK settings: provider base URL + key + model, key MASKED on every
  read (last 4 chars max), stored owner-only at `~/.soundplus/settings.json`
  (override with `$SOUNDPLUS_HOME`)
- Capability gating: chatbox inputs follow the picked model's
  capabilities; audio/image messages are rejected server-side when the
  model lacks them, never silently sent
- MCP gateway: MCP-over-HTTP JSON-RPC client, tools namespaced
  `<server>.<tool>`, unreachable or duplicate-name servers land in
  `skippedServers` and are never fatal
- Tests: `bun test` (mock MCP server, stub model — no real keys, no DAWs)

## Run

```sh
bun install
bun start            # http://127.0.0.1:3000 (HOST/PORT env override)
```

Configure a provider (or a stub for offline use):

```sh
curl -X POST localhost:3000/api/settings \
  -H 'content-type: application/json' \
  -d '{"provider":{"baseUrl":"stub://demo","model":"stub-model"}}'
curl -X POST localhost:3000/api/chat \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"mix this track","kind":"text"}]}'
```

A real OpenAI-compatible provider works the same way: set `baseUrl`,
`model`, and `apiKey` in settings. The key is sent only to that base
URL as a Bearer token and is never logged or returned unmasked.

## Next

- Phase 2: per-project action history + producer profile (Yatta DB),
  MCP server registry UI, model registry UI
- Phase 3: features 1–30, same order as the VST spec
- Phase 4: real-machine verification — real FL Studio via flstudio-mcp,
  real Cubase via cubase-mcp, real provider call with the producer's key

## Honest leftovers (not claimed)

- No real DAW execution on this machine, no real provider call, no
  real-browser chatbox test — those happen on the producer's Windows
  machine in Phase 4.
- The VST line is parked and is never re-added to this app.
