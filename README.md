# SoundPlus

Standalone AI mixing and mastering assistant for FL Studio and Cubase,
built with Yatta JS. No VST, no plugin container: the producer opens
SoundPlus next to the DAW, and it drives the DAW through MCP bridges.

## Phase 1 — skeleton (f411dcf)

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

## Phase 2 — memories + registries (this commit)

- Per-project action history in Yatta's built-in DB
  (`$SOUNDPLUS_HOME/soundplus.db`): strictly isolated per project —
  project A's actions are never visible under B
- Cross-project producer profile distilled ONLY from real recorded
  tool actions (`Used <tool> N time(s)`); nothing invented, and
  distillation never overwrites a hand-edited fact
- Producer-correctable profile: edit/delete via
  `POST /api/profile/:id/edit` and `POST /api/profile/:id/delete`
- Chat records user + assistant turns into the given project's history
  (`"project"` field on `/api/chat`); unknown project → 400
- Project routes: `GET/POST /api/projects`,
  `GET/POST /api/projects/:id/actions`; profile routes:
  `GET /api/profile`, `POST /api/profile/distill`

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

## Phase 3 — features 1–5 (batch 1)

- F1 plugin discovery via bridge `list_plugins` + purpose search
- F2 project intelligence via bridge `get_project` + summary
- F3 DSP diagnosis (peak/RMS/crest/clipping/bands, heuristic flags)
- F4 autonomous mix loop (plan-execute-evaluate, failures recorded)
- F5 vocal chain + drum plans

## Phase 3 — features 6–10 (batch 2, this commit)

- F6 mastering + export verification: RMS loudness estimate (labeled,
  not LUFS), parabolic inter-sample true-peak estimate, clipping
  checks, limiter ceiling by mix heat, deliverables report
- F7 reference matching: tonal/dynamics/width/loudness deltas vs a
  reference, with corrective gain changes actually tested on samples
- F8 undo + versions: modifications recorded with before/after
  states, named version snapshots, rollback restores recorded state
  (live-DAW application happens via bridge tools in Phase 4)
- F9 multi-agent + MCP: explicit per-agent tool allow-lists;
  denied tasks are recorded and never executed
- F10 capability manager: OS/runtime/bridges/plugin formats plus a
  plain list of unsupported features; route `GET /api/capabilities`
- Phase 4: real-machine verification — real FL Studio via flstudio-mcp,
  real Cubase via cubase-mcp, real provider call with the producer's key

## Honest leftovers (not claimed)

- No real DAW execution on this machine, no real provider call, no
  real-browser chatbox test — those happen on the producer's Windows
  machine in Phase 4.
- The VST line is parked and is never re-added to this app.
