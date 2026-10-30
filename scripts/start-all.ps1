# SoundPlus Universal One-Click Launcher

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       Starting SoundPlus Suite        " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Start FL Studio MCP Daemon in background process
Write-Host "`n[1/2] Starting FL Studio MCP Daemon..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python -m fl_studio_mcp.daemon"

# Give the daemon socket a brief moment to initialize
Start-Sleep -Seconds 2

# 2. Start SoundPlus Bun Server
Write-Host "`n[2/2] Starting SoundPlus Web Server..." -ForegroundColor Yellow
Write-Host "Access the UI at: http://127.0.0.1:3000`n" -ForegroundColor Green

bun src\server.ts
