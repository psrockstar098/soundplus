# Vendored DAW bridges

These are verbatim copies of the three DAW-control repos SoundPlus
talks to (minus their `.git` folders and Python caches), so cloning
SoundPlus alone is enough — no separate repo downloads.

- `flstudio-mcp/` — https://github.com/rosasynthesiz/flstudio-mcp
  (FL Studio, 67 tools, MIT — see its LICENSE)
- `compose/` — https://github.com/calvinw/fl-studio-mcp
  (piano-roll compose, MIT — see its LICENSE)
- `cubase-mcp/` — https://github.com/hedidjs/cubase-mcp
  (Cubase, MIT — see its LICENSE)

They are not SoundPlus code and are not edited here, except for one
local fix: `flstudio-mcp/scripts/install_windows.bat` step [4/4]
used to run the loopMIDI port check as a `python -c` one-liner,
but cmd's `%VAR%` expansion mangled its `%s` format string, so
the check always crashed with "unterminated string literal" on
Windows. The check now lives in `scripts/check_ports.py` (same
logic, no shell-quoting layer) and always exits 0 — it reports
missing ports instead of failing the install. To update one,
replace its folder with a fresh copy of the upstream repo (keeping
its LICENSE) and re-apply that fix if upstream still has the
one-liner. Windows setup uses these copies:
`scripts\setup-windows.bat`.
