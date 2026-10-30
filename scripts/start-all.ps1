# SoundPlus Universal One-Click Launcher

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       Starting SoundPlus Suite        " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 0. Plugin database: resolve through the real shell Documents folder
# (follows OneDrive redirection) and pass it to this session, but only
# when the user has not already set FLSTUDIO_MCP_PLUGIN_DB. The variable
# reaches the MCP server through SoundPlus, which spawns it with this
# session's environment.
if (-not $env:FLSTUDIO_MCP_PLUGIN_DB) {
  $docs = [Environment]::GetFolderPath("MyDocuments")
  $db = Get-ChildItem -Path (Join-Path $docs "Image-Line") -Filter "FL Studio*" -Directory -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending |
    ForEach-Object { Join-Path $_.FullName "Presets\Plugin database\Installed" } |
    Where-Object { Test-Path $_ } |
    Select-Object -First 1
  if ($db) {
    $env:FLSTUDIO_MCP_PLUGIN_DB = $db
    Write-Host "Plugin database found: $db" -ForegroundColor Green
  }
}

# 1. Start FL Studio MCP Daemon in background process
Write-Host "`n[1/2] Starting FL Studio MCP Daemon..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python -m fl_studio_mcp.daemon"

# Give the daemon socket a brief moment to initialize
Start-Sleep -Seconds 2

# 2. Start SoundPlus Bun Server
Write-Host "`n[2/2] Starting SoundPlus Web Server..." -ForegroundColor Yellow
Write-Host "Access the UI at: http://127.0.0.1:3000`n" -ForegroundColor Green

bun src\server.ts
