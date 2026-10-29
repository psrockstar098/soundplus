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

They are not SoundPlus code and are not edited here. To update one,
replace its folder with a fresh copy of the upstream repo (keeping
its LICENSE) and re-test. Windows setup uses these copies:
`scripts\setup-windows.bat`.
