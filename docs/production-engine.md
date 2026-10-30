# Production engine: what the agent can do end to end

SoundPlus chat + the FL bridge already form the production engine this
project is aiming at. The LLM is the reasoning loop (inspect →
diagnose → apply → verify, via the chat tool loop), and the bridge
supplies the hands. This page maps each production stage to the tools
that do it — and names the steps that stay manual, because FL's API
cannot do them.

## Beatmaking & composition

- Write notes: `fl_write_piano_roll_notes` (any pattern the LLM composes,
  Afrobeat / Trap / Lo-Fi included — there is no one-shot style tool,
  the LLM writes the notes directly).
- Chords & melody: `fl_write_raga_chords`, `fl_write_raga_melody`.
- Arrangement: `fl_arrange_new_pattern`, `fl_arrange_clone_pattern`,
  `fl_arrange_add_marker`, `fl_arrange_select_channel`,
  `fl_quantize_pattern`, `fl_extract_melody`, `fl_export_midi`.
- SoundPlus-side planning: F14 automation curves, F21 tuning/timing,
  F27 sound design chains.

## Recording & transport

- `fl_play`, `fl_stop`, `fl_toggle_play`, `fl_record` (toggles FL's
  record-arm state), `fl_get_play_state`, `fl_get_song_position`,
  `fl_set_song_position`, `fl_get_tempo`, `fl_set_tempo`.
- NOT exposed as tools: per-track arming, input-source selection, take
  folders. If a future bridge adds them, the chat picks them up with
  no gateway change.

## Automated mixing (Mix Doctor)

- Diagnose: `fl_diagnose_mix`, `fl_gain_stage`,
  `fl_detect_cleanup_candidates`, `fl_get_mixer_state`,
  `fl_get_channel_state`, `fl_get_project_state`.
- Fix: `fl_apply_mix_fix`, `fl_apply_eq_intent`,
  `fl_apply_compression_intent`, `fl_apply_delay_intent`,
  `fl_apply_reverb_intent`.
- Routing: `fl_group_tracks`, `fl_set_route`, `fl_get_routing`,
  `fl_get_routing_all`.
- Reference: `fl_reference_match` (bridge) + F7 (SoundPlus).
- Live watch: `fl_mix_watch_start` / `fl_mix_watch_status` /
  `fl_mix_watch_stop`.
- SoundPlus-side planning: F3 DSP diagnosis, F4 autonomous mix loop
  (plan → execute → evaluate), F5 vocal/drum plans, F15 health
  scanner, F24 masking, F25 dynamics, F30 regression vs previous
  render.

## Mastering

- Adjust plugins ALREADY loaded on the master bus:
  `fl_plugin_list` (filled slots 0–9), `fl_plugin_get_params`,
  `fl_plugin_set_param`, plus `fl_setup_chain` / `fl_list_chains` /
  `fl_suggest_preset` / `fl_list_presets`.
- SoundPlus-side: F6 mastering/export verification (RMS loudness
  estimate — labeled, NOT LUFS — true-peak estimate, limiter ceiling
  by mix heat).

## Safety net (the agent is instructed to use it)

- `fl_take_snapshot` before destructive changes,
  `fl_set_dry_run` when unsure, `fl_rollback_last_change` when a
  verification fails. SoundPlus F8 undo/versions covers the same net
  on the planning side. The system prompt carries these rules on
  every tool-enabled chat call.

## Stays manual (FL API limits — never claimed otherwise)

- Loading a NEW plugin into a project (bridge docstring: "We cannot
  load NEW plugins (FL API limit)"). The producer loads it; the agent
  then adjusts it.
- Rendering / exporting audio (File > Export by hand).
- LUFS calibration: no rendered audio means no LUFS measurement;
  F6's estimate is RMS-based and labeled as such.
- Plugin/preset database reads are suggestions only; FL still can't
  load from them via the API.

## Startup

One command, `powershell -ExecutionPolicy Bypass -File
.\scripts\start-all.ps1`, boots the daemon (with plugin-DB discovery)
and the Bun server; every tool above is available to the chat the
moment it loads — provided the bridge is registered in settings and
reachable (see `docs/phase4-verification.md`).
