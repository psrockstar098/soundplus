"""loopMIDI port check for the FL bridge installer.

Lists the MIDI ports visible to this Python process (via mido) and
reports whether the two ports the bridge needs exist:
  FLStudioMCP RX, FLStudioMCP TX

This used to be a `python -c "..."` one-liner inside
install_windows.bat, but cmd's `%VAR%` expansion mangled the
`%s` format expression in it, so the check always died with
"SyntaxError: unterminated string literal" on Windows. A script
file has no shell-quoting layer, so it cannot break that way.

Exit code is ALWAYS 0: this is a report, not a gate. Missing ports
do not fail the install — the user creates them in loopMIDI and
re-runs, and the rest of setup (e.g. the Cubase step) proceeds.
"""

import sys

try:
    import mido
except ImportError:
    print("   mido not installed; cannot list MIDI ports.")
    print("   Install the bridge first (pip install -e .), then re-run.")
    sys.exit(0)

names = set(mido.get_output_names()) | set(mido.get_input_names())
required = ("FLStudioMCP RX", "FLStudioMCP TX")
missing = [n for n in required if not any(n.lower() in x.lower() for x in names)]
if not missing:
    print("   All required ports present.")
else:
    print("   MISSING ports: %s -- create them in loopMIDI." % missing)
    print("   Create EXACTLY these two: 'FLStudioMCP RX' and 'FLStudioMCP TX'.")
sys.exit(0)
