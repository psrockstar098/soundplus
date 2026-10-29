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
echo   2. Start the FL bridge:  fl-studio-mcp-daemon
echo   3. Verify it:  bun scripts\verify-bridge.ts flstudio stdio fl-studio-mcp-daemon
echo   4. Start SoundPlus:  bun src\server.ts
echo   Full checklist: docs\phase4-verification.md
endlocal
