# Producer bundle (Windows, no Bun/Python install)

The bundle is a zip a producer unzips and runs with `start.bat`:
a compiled SoundPlus exe (Bun runtime embedded), a portable
Python 3.12 with all bridge dependencies pre-installed, and the
vendored bridges. Rebuilding it is a Linux-side job; the result
cannot be execution-tested on Linux (Windows binaries), so the
first Windows run is the real test.

## How it is built

1. SoundPlus exe (the chatbox page is embedded at build time —
   `src/server.ts` imports it as text — so no `public/` folder is
   needed next to the exe):
   `bun build --compile --target=bun-windows-x64 src/server.ts --outfile soundplus.exe`
2. Portable Python: python.org's Windows embeddable package
   (3.12.10) with `python312._pth` edited to add `Lib\site-packages`
   and `import site`.
3. Bridge dependencies as Windows wheels:
   `pip download --platform win_amd64 --python-version 312
   --only-binary=:all: <deps>` — unzipped into
   `python\Lib\site-packages`. Packages that ship sdists only
   (pyautogui, pygetwindow, pyscreeze, pymsgbox, mouseinfo) are
   unpacked from source and their package dirs copied in.
   pynput is downloaded `--no-deps` (its resolver conflicts on
   cross-platform marker evaluation; on Windows it needs no
   compiled deps).
4. The FL bridge package itself: `pip wheel bridges/flstudio-mcp`
   (pure Python, hatchling) unzipped into site-packages, so
   `python -m fl_studio_mcp.server` and `python -m fl_studio_mcp.daemon`
   work with no install step.
5. `start.bat` starts the FL daemon in the background, then the exe.
   Bridge settings entries use `python\python.exe` as the command.

## What cannot be bundled

- loopMIDI: a Windows MIDI driver. It needs its installer and
  admin rights. No zip replaces it.
- FL Studio / Cubase themselves, and the producer's provider key
  (entered once in settings, masked).

## Size

About 205 MB unzipped, ~90 MB zipped (exe ~115 MB, portable
Python ~94 MB, bridges ~2 MB).
