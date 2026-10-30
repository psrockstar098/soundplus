# SoundPlus — one-command startup (Windows).
# Starts the FL daemon in its own window, then SoundPlus in this one.
# Run from anywhere:
#   powershell -ExecutionPolicy Bypass -File .\scripts\start-all.ps1
# (Bypass is needed only because Windows blocks .ps1 files by default.)
# Prerequisites (still manual, they cannot live in a script): loopMIDI
# ports FLStudioMCP RX / FLStudioMCP TX created, and FL Studio's MIDI
# settings wired (Output RX Port 42; Input TX, FLStudioMCP, Port 42).
# If the daemon window is already open, just run: bun src\server.ts
#
# Beyond starting two processes, this script:
# - Fails fast if bun or python is missing (clear message, no mystery crash).
# - Warns (never blocks) if the fl_studio_mcp package is not importable,
#   with the exact install command — the server still starts, so chat works.
# - Resolves FL's plugin database through the REAL shell Documents folder
#   (which follows OneDrive redirection, unlike %USERPROFILE%\Documents)
#   and passes it to this session as FLSTUDIO_MCP_PLUGIN_DB, but ONLY when
#   the user has not already set that variable — an explicit override wins.
#   The variable reaches the MCP server through SoundPlus, which spawns it
#   with this session's environment. The daemon itself takes no paths:
#   the database is read by the server's tools, not the daemon.
# - Waits for the daemon's TCP port to accept connections (default
#   127.0.0.1:9787, or FLSTUDIO_MCP_TCP_HOST/PORT) instead of a blind
#   sleep; on timeout it warns and still starts the server.

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

function Fail($msg) { Write-Host $msg -ForegroundColor Red; exit 1 }

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  Fail "bun not found on PATH. Install Bun (https://bun.sh), then re-run this script."
}
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  Fail "python not found on PATH. Install Python 3.12, then re-run this script."
}

python -c "import fl_studio_mcp" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "WARNING: fl_studio_mcp is not importable — the daemon window will fail." -ForegroundColor Yellow
  Write-Host "Fix: cd bridges\flstudio-mcp; python -m pip install -e .; cd ..\.."
  Write-Host "Continuing anyway: SoundPlus chat still works without the bridge."
}

if (-not $env:FLSTUDIO_MCP_PLUGIN_DB) {
  $docs = [Environment]::GetFolderPath("MyDocuments")
  $db = Get-ChildItem -Path (Join-Path $docs "Image-Line") -Filter "FL Studio*" -Directory -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending |
    ForEach-Object { Join-Path $_.FullName "Presets\Plugin database\Installed" } |
    Where-Object { Test-Path $_ } |
    Select-Object -First 1
  if ($db) {
    $env:FLSTUDIO_MCP_PLUGIN_DB = $db
    Write-Host "Plugin database found: $db"
  } else {
    Write-Host "Plugin database not found under $docs — the bridge will try its own discovery, or set FLSTUDIO_MCP_PLUGIN_DB yourself."
  }
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", "python -m fl_studio_mcp.daemon"

$daemonHost = if ($env:FLSTUDIO_MCP_TCP_HOST) { $env:FLSTUDIO_MCP_TCP_HOST } else { "127.0.0.1" }
$daemonPort = if ($env:FLSTUDIO_MCP_TCP_PORT) { [int]$env:FLSTUDIO_MCP_TCP_PORT } else { 9787 }
$bound = $false
for ($i = 0; $i -lt 30; $i++) {
  $client = $null
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $client.Connect($daemonHost, $daemonPort)
    $client.Close()
    $bound = $true
    break
  } catch {
    if ($client) { $client.Dispose() }
    Start-Sleep -Milliseconds 500
  }
}
if ($bound) {
  Write-Host "Daemon listening on ${daemonHost}:${daemonPort}."
} else {
  Write-Host "WARNING: daemon did not accept connections on ${daemonHost}:${daemonPort} after 15s — it may still be starting, or loopMIDI ports may be missing. Starting SoundPlus anyway." -ForegroundColor Yellow
}

bun src\server.ts
