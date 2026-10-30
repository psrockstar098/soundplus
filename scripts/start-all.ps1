# SoundPlus — one-command startup (Windows).
# Starts the FL daemon in its own window, then SoundPlus in this one.
# Run from anywhere:
#   powershell -ExecutionPolicy Bypass -File .\scripts\start-all.ps1
# (Bypass is needed only because Windows blocks .ps1 files by default.)
# Prerequisites (still manual, they cannot live in a script): loopMIDI
# ports FLStudioMCP RX / FLStudioMCP TX created, and FL Studio's MIDI
# settings wired (Output RX Port 42; Input TX, FLStudioMCP, Port 42).
# If the daemon window is already open, just run: bun src\server.ts
Set-Location (Join-Path $PSScriptRoot "..")
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python -m fl_studio_mcp.daemon"
Start-Sleep -Seconds 2
bun src\server.ts
