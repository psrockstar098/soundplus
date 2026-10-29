# Phase 4 — Real-machine verification (Windows PC checklist)

Phase 3 is complete on paper: all 30 features pass tests against
mocks and synthetic audio. Phase 4 is the part that can only happen
on a real machine — proving SoundPlus talks to real FL Studio,
real Cubase, and a real AI provider. Nothing here needs D; it needs
Dominic at his Windows PC, one step at a time.

## Correction: these bridges are programs, not websites

The three DAW bridges are **stdio programs** — SoundPlus starts
them and talks to them over stdin/stdout. There is no URL to paste.
In SoundPlus settings a bridge is registered as:

```json
{ "name": "flstudio", "transport": "stdio", "command": "fl-studio-mcp-daemon", "args": [] }
```

The verify command for a stdio bridge is:

```bash
bun scripts/verify-bridge.ts <name> stdio [--cwd <dir>] <command> [args...]
```

## What you need on the PC

- Bun (https://bun.sh — the installer)
- Python 3.10+ (FL bridge) / 3.11+ (compose bridge)
- This repo: `git clone https://github.com/psrockstar098/soundplus`
- The bridge repos (cloned wherever you like):
  - FL: https://github.com/rosasynthesiz/flstudio-mcp
  - Compose (optional on Windows, see Step 2): https://github.com/calvinw/fl-studio-mcp
  - Cubase: https://github.com/hedidjs/cubase-mcp
- FL Studio 2026, Cubase, loopMIDI (free virtual MIDI ports)
- A provider API key, entered by you in SoundPlus settings
  (stored masked, file mode 0600 — never send it to D)

## Step 1 — FL Studio bridge (rosasynthesiz, the main one)

1. In the flstudio-mcp folder, run `scripts\install_windows.bat`
   (installs the controller + server + note bridge).
2. Install loopMIDI, create two virtual MIDI ports, and wire them
   in FL Studio's MIDI settings as that repo's guide shows.
3. Start the bridge: `fl-studio-mcp-daemon` (keep it running).
4. Open FL Studio. In the piano roll, arm `MCP_Apply` once per
   session — FL exposes no API to run a script, so this one manual
   step is required before note writing works.
5. Verify from the soundplus folder:
   `bun scripts/verify-bridge.ts flstudio stdio fl-studio-mcp-daemon`
   Pass = `reachable: true` and a real tool list (67 tools). With
   a project open in FL, `trackCount` should match the project.

Known FL limits (from that repo, not SoundPlus bugs): plugins,
audio files, and rendering are UI-only in FL's scripting API —
the tools *suggest* a plugin or preset, you load it, then the
bridge configures it. Audio export is manual (File > Export).

## Step 2 — Compose bridge (calvinw, optional on Windows)

This repo is macOS-first; Windows support is partial. It needs
`uv` + Python 3.11+, then its `fl_studio_mcp_server.py` runs as a
stdio server the same way. Verify with:
`bun scripts/verify-bridge.ts compose stdio --cwd <that-folder> uv run fl_studio_mcp_server.py`
(adjust the command to whatever that repo's install leaves you with.)

If its Windows trigger does not work, skip it — the Step 1 bridge
already writes notes and covers composition, so nothing is lost.

## Step 3 — Cubase bridge (hedidjs, weakest link — be aware)

1. `pip install -r requirements.txt`, then `python server.py`
   from the cubase-mcp folder.
2. That repo's setup guide is macOS-only (IAC Driver). On Windows,
   use loopMIDI as the virtual-MIDI equivalent — this path is
   untested by that repo's author, so if it fights you, say so and
   stop; don't force it.
3. Verify:
   `bun scripts/verify-bridge.ts cubase stdio --cwd <that-folder> python server.py`
   Coverage here is transport, mixer, and MIDI-file creation —
   not full project control like the FL bridge.

## Step 4 — SoundPlus with real bridges

1. Start SoundPlus: `bun src/server.ts` from the soundplus folder.
2. Register the bridges in settings (stdio entries, same commands
   as above — SoundPlus starts and stops the bridge processes).
3. Check `GET /api/capabilities` shows both bridges reachable with
   their real tools.
4. Ask it something real with a project open in FL, e.g. "what
   plugins are installed?" and "summarize this project".

## Step 5 — Real provider call

1. In SoundPlus settings, enter your provider key and model
   (OpenAI-compatible: base URL + key + model). The settings page
   shows only the last 4 characters of the key, never the full key.
2. Send one chat message. Pass = a real reply comes back, not the
   stub reply. If it fails, the error shown is the real provider
   error — send that text to D, not the key.

## Step 6 — Chatbox in a real browser

Open the chatbox page in a real browser on the PC and use it:
send text, and try audio/image only if your chosen model supports
them (unsupported inputs must be disabled AND rejected — that is
the capability gating working, not a bug).

## What to send back to D

For each bridge: the JSON report from `verify-bridge.ts`, plus one
line saying what was open in the DAW at the time. For the provider:
"real reply received" or the exact error text. For the chatbox:
anything that looked wrong, with a screenshot.

## What Phase 4 does NOT cover

- Real-browser chatbox JS edge cases beyond the basic flow above
- Performance on huge projects (100+ tracks)
- Any DAW action that writes to a project (mixing actions stay
  plans until you approve them in the chatbox)

If a bridge command is wrong or a bridge is not running, the
report says `reachable: false` — that is a setup step, not a
SoundPlus bug. Fix the bridge, re-run the same command.
