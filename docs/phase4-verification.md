# Phase 4 — Real-machine verification (Windows PC checklist)

Phase 3 is complete on paper: all 30 features pass 95+ tests against
mocks and synthetic audio. Phase 4 is the part that can only happen
on a real machine — proving SoundPlus talks to real FL Studio,
real Cubase, and a real AI provider. Nothing here needs D; it needs
Dominic at his Windows PC, one step at a time.

## What you need

- Bun installed on the Windows PC (https://bun.sh — the installer)
- This repo cloned: `git clone https://github.com/psrockstar098/soundplus`
- FL Studio 2026 installed, with the flstudio-mcp bridge running
- Cubase installed, with the cubase-mcp bridge running
- A provider API key, entered by you in SoundPlus settings
  (the key is stored masked, file mode 0600 — never send it to D)

## Step 1 — FL Studio bridge

1. Start FL Studio, then start the flstudio-mcp bridge. Note the URL
   it prints (something like `http://127.0.0.1:PORT`).
2. From the repo folder, run:
   `bun scripts/verify-bridge.ts flstudio http://127.0.0.1:PORT`
3. Pass = the report says `reachable: true` and lists real tools.
   If `list_plugins` is there, `pluginCount` should match what FL
   shows. If `get_project` is there, open a project in FL first,
   then re-run — `trackCount` should match the project.

## Step 2 — Cubase bridge

Same as Step 1, with the cubase-mcp bridge URL:
`bun scripts/verify-bridge.ts cubase http://127.0.0.1:PORT`

## Step 3 — SoundPlus with real bridges

1. Start SoundPlus: `bun src/server.ts` (or however you run it).
2. Register both bridges in settings (same URLs as above).
3. Open the chatbox page and check `GET /api/capabilities` shows
   both bridges reachable and their real tools.
4. Ask it something real, e.g. "what plugins are installed?" and
   "summarize this project" — with a real project open in FL.

## Step 4 — Real provider call

1. In SoundPlus settings, enter your provider key and model
   (OpenAI-compatible: base URL + key + model). The settings page
   shows only the last 4 characters of the key, never the full key.
2. Send one chat message. Pass = a real reply comes back, not the
   stub reply. If it fails, the error shown is the real provider
   error — send that text to D, not the key.

## Step 5 — Chatbox in a real browser

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

If a bridge URL is wrong or a bridge is not running, the report
says `reachable: false` — that is a setup step, not a SoundPlus
bug. Fix the bridge, re-run the same command.
