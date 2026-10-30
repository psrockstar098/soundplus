# SoundPlus

Standalone AI mixing and mastering assistant for FL Studio and Cubase,
built with Yatta JS. No VST, no plugin container: the producer opens
SoundPlus next to the DAW, and it drives the DAW through MCP bridges.

## Quick start (Windows, FL Studio)

Prerequisites (runtimes and drivers cannot live in a repo): Bun,
Python 3.12, FL Studio, loopMIDI.

```powershell
git clone https://github.com/psrockstar098/soundplus.git
cd soundplus
bun install
scripts\setup-windows.bat
```

`setup-windows.bat` installs the FL bridge (controller script, MCP
server, note-bridge script) from the vendored copy in `bridges/` and
the Cubase bridge's requirements. Then, once, by hand:

- loopMIDI: create two virtual ports, exactly `FLStudioMCP RX` and
  `FLStudioMCP TX`.
- FL Studio → Options → MIDI Settings: Output `FLStudioMCP RX`
  enabled, Port 42; Input `FLStudioMCP TX` enabled, Controller type
  `FLStudioMCP`, Port 42.

Then launch everything with one command (daemon in its own window,
SoundPlus in this one):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-all.ps1
```

The launcher fails fast if bun or python is missing, warns if the
bridge package is not installed, resolves the plugin database
through the real Documents folder (OneDrive-aware) when you have not
set `FLSTUDIO_MCP_PLUGIN_DB` yourself, and waits for the daemon's
port (default 127.0.0.1:9787) before starting the server.

Open http://127.0.0.1:3000/settings, save your provider (base URL,
key, model) and the FL bridge (command `python`, args
`-m fl_studio_mcp.server`), then open a project in FL, arm
`MCP_Apply` once in the piano roll, and ask the chatbox something
real — "what plugins are installed?" The chat sends the registered
bridge tools to the model, which calls them and answers from their
results; the chatbox shows which tools were used. Full checklist:
`docs/phase4-verification.md`.

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

## Phase 3 — features 6–10 (batch 2)

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

## Phase 3 — features 11–30 (batches 3–5) — PHASE 3 COMPLETE

- F11 track recognition (name-first, audio fallback, labeled confidence)
- F12 session organization plans (role names/colors/groups)
- F13 routing plans (buses, sends, sidechain, parallel; blocked steps reported)
- F14 automation curves (ramps, rides, log filter sweeps, reverb throws)
- F15 health scanner (muted/gain/duplicate/routing/media, with severity)
- F16 parameter understanding (concept inference, verified ranges, instruction mapping)
- F17 substitution (same-purpose alternatives from discovered catalog)
- F18 preset recommendations (genre/source/sound overlap)
- F19 knowledge base (token search over manuals/docs/params)
- F20 chain optimization (permutations ranked, heuristic orders for large chains)
- F21 tuning/timing (autocorrelation pitch, onset grid deviations)
- F22 restoration (click repair, hum detection, noise floor)
- F23 phase/stereo (correlation, imbalance, mono-compatibility)
- F24 masking (shared dominant bands flagged with recommendations)
- F25 dynamics (crest, level consistency, pumping risk; tonal signals excluded)
- F26 genre profiles (hip-hop, Afrobeats, gospel, pop, rock, EDM; unknown → null)
- F27 sound design (risers, impacts, textures, transitions)
- F28 alternative mixes (canonical variants for audition/comparison)
- F29 batch processing (reusable workflow, per-item failure isolation)
- F30 regression testing (duration/channels/level/clipping/similarity vs previous render)

All 30 features: 95/95 tests pass. Remaining: Phase 4 real-machine
verification on the producer's Windows PC.
- Phase 4: real-machine verification — real FL Studio via flstudio-mcp,
  real Cubase via cubase-mcp, real provider call with the producer's key

## Honest leftovers (not claimed)

- No real DAW execution on this machine, no real provider call, no
  real-browser chatbox test — those happen on the producer's Windows
  machine in Phase 4.
- The VST line is parked and is never re-added to this app.
