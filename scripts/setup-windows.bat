@echo off
REM ============================================================================
REM  SoundPlus — one-time Windows setup. Run once from the soundplus folder:
REM    scripts\setup-windows.bat
REM  Everything it installs comes from the vendored copies in bridges\ —
REM  no separate repo downloads. You still need Bun, Python, FL Studio,
REM  Cubase, and loopMIDI installed first (those are runtimes/drivers
REM  and cannot live inside a repo).
REM    [1] FL bridge (rosasynthesiz flstudio-mcp): controller + server +
REM        note bridge, via its own install_windows.bat
REM    [2] Cubase bridge (hedidjs cubase-mcp): pip requirements
REM    [3] Compose bridge (calvinw, optional on Windows) is NOT
REM        installed here — its Windows support is partial; see
REM        docs\phase4-verification.md if you want it.
REM ============================================================================
setlocal
set "ROOT=%~dp0.."

where bun >nul 2>nul
if errorlevel 1 (
  echo Bun not found on PATH. Install it from https://bun.sh, then re-run.
  exit /b 1
)
where python >nul 2>nul
if errorlevel 1 (
  echo Python not found on PATH. Install Python 3.12, then re-run.
  exit /b 1
)

echo.
echo [1/2] Installing the FL Studio bridge...
call "%ROOT%\bridges\flstudio-mcp\scripts\install_windows.bat"
if errorlevel 1 (
  echo FL bridge install failed. See the messages above.
  exit /b 1
)
REM The console scripts (fl-studio-mcp) only work if Python's
REM Scripts folder is on PATH, so verify the package itself is
REM importable and steer the user at the python -m forms, which
REM always work.
python -c "import fl_studio_mcp" >nul 2>nul
if errorlevel 1 (
  echo WARNING: the FL bridge package is not importable. Fix with:
  echo   cd "%ROOT%\bridges\flstudio-mcp"
  echo   python -m pip install -e .
  echo   cd "%ROOT%"
  echo Then re-run this script. Continuing with the Cubase step.
)

echo.
echo [2/2] Installing the Cubase bridge requirements...
pushd "%ROOT%\bridges\cubase-mcp"
python -m pip install -r requirements.txt
if errorlevel 1 (
  echo Cubase requirements failed. See the messages above.
  popd
  exit /b 1
)
popd

echo.
echo Setup done. Next steps:
echo   1. Install loopMIDI and create two virtual MIDI ports; wire them
echo      in FL Studio's MIDI settings (see the FL bridge README).
echo   2. Start the FL daemon (keep it running):
echo      python -m fl_studio_mcp.daemon
echo   3. Verify it (the MCP server needs the daemon already running):
echo      bun scripts\verify-bridge.ts flstudio stdio python -m fl_studio_mcp.server
echo   4. Start SoundPlus:  bun src\server.ts
echo   Full checklist: docs\phase4-verification.md
endlocal
