# FL Studio Piano Roll MCP

An MCP (Model Context Protocol) server that enables AI assistants like Claude to interact with FL Studio's piano roll. Create melodies, chord progressions, and musical patterns through natural language conversation with **automatic, real-time updates**.

See the playlist here:
[LLMs and FL Studio Piano Roll (MacOs Version)](https://youtube.com/playlist?list=PL3miIiuTRI6fgugjvJhGsXoe_oX65-o0S&si=X68d7kPWanyCq9m4)

## Overview

Talk to Claude and watch your musical ideas appear instantly in FL Studio:
- Generate chord progressions by name or custom notes
- Create melodies and bass lines
- Modify existing MIDI notes
- Export and analyze piano roll state
- **Zero manual intervention** - notes appear automatically with built-in trigger!

## Platform Support

**✅ macOS (Primary)** - Full auto-trigger functionality with osascript integration
**⚠️ Windows (Secondary)** - Partially implemented, may require additional configuration

## Prerequisites

- **macOS or Windows** (macOS working fully, Windows needs more work)
- **FL Studio** (any recent version with Python scripting support)
- **Python 3.11+** (managed automatically by uv)
- **MCP-compatible client** (Claude Desktop, Claude Code CLI, or other MCP client)
- **uv** (Fast Python package manager - [installation guide](https://docs.astral.sh/uv/getting-started/installation/))

### macOS Accessibility Permissions

The auto-trigger uses pynput to send keystrokes to FL Studio. You must enable Accessibility access for **Terminal** (or your terminal app) and **Claude Code** (if using Claude Code CLI):

1. Open **System Settings** → **Privacy & Security** → **Accessibility**
2. Click the **+** button to add applications
3. Add **Terminal** (or iTerm, Warp, etc.)
4. Add **Claude** (Claude Code CLI) if you're using it
5. Ensure the toggles are **enabled** for each app

Without these permissions, the auto-trigger cannot send the Cmd+Opt+Y keystroke to FL Studio.

## Installation

### Quick Start (3 Commands)

```bash
git clone https://github.com/calvinw/fl-studio-mcp.git
cd fl-studio-mcp

./install_prerequisites.sh    # Install uv and Python environment
./install_mcp_for_claude.sh   # Register with Claude Code
```

**Then restart Claude Code and you're ready to go!**

## Usage

### Quick Start (Every Session)

**Step 1: Open FL Studio**
1. Open FL Studio
2. Open or create a piano roll

**Step 2: Initialize the Script**

Run this script **once** to update and get ready to work with LLM:

```
Tools → Scripting → ComposeWithLLM
```

This sets up the piano roll state and clears the request queue (no dialog appears).

**Step 3: Talk to Claude or your LLM**

Now just talk to your AI assistant:

- "Add a C major chord"
- "Create a sad chord progression in Am"
- "Add a bass line"
- "Create a pentatonic melody"

Notes will appear automatically in FL Studio!

### Important Tips

#### Refreshing State After Manual Edits

If you manually add/edit notes in FL Studio **between** talking to Claude 
you must send Claude the new edits via the ComposeWithLLM script. If you 
just ran this you can do it by keystroke to run the last script:

1. Press `Cmd+Opt+Y` (macOS) or `Ctrl+Alt+Y` (Windows) to refresh the state
2. Then talk to Claude

This ensures Claude sees your manual changes!


**Example:**
```
You: "Add C major chord"
[Claude adds it automatically ✅]

[You manually add a melody 🎹]

[Press Cmd+Opt+Y to refresh state 🔄]

You: "Add a bass line"
[Claude sees the chord AND melody ✅]
```

### Example Requests

- "Create a I-IV-V-I progression in C major"
- "Add a pentatonic melody over these chords"
- "Add a bass note on the root of each chord"
- "Change that G note to an A"
- "Clear everything and create a jazz progression"
- "Add some arpeggios starting at beat 4"

## Available Tools

Your AI assistant has access to these MCP tools:

- `get_piano_roll_state()` - Read current piano roll state
- `send_notes(notes, mode)` - Add or replace notes (chords are just multiple notes with the same time)
- `delete_notes(notes)` - Remove specific notes
- `clear_queue()` - Discard pending requests

See [CLAUDE.md](CLAUDE.md) for detailed documentation on how the AI assistant uses these tools.

## Architecture

```
┌─────────┐         ┌────────────┐         ┌──────────────┐
│ Claude  │────────▶│ MCP Server │────────▶│ Request Queue│
└─────────┘         └────────────┘         │ (JSON file)  │
                                           └──────┬───────┘
                                                  │
                                                  ▼
                                         MCP Server
                                         Sends Trigger
                                   (Cmd+Opt+Y / Ctrl+Alt+Y)
                                                │
                                                ▼
┌─────────────┐         ┌─────────────────────────────────┐
│ Piano Roll  │◀────────│ FL Studio Bridge Script         │
└─────────────┘         │ (re-runs, applies changes)      │
                        └─────────────────────────────────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │ Piano Roll  | 
                              | State Export│
                              │ (JSON file) │
                              └─────────────┘
```

1. AI assistant sends musical requests via MCP tools
2. MCP server writes requests to JSON queue
3. MCP server sends trigger with 2-second delay
4. FL Studio re-runs ComposeWithLLM script
5. Script processes queue and applies changes
6. Notes appear in piano roll after delay
7. State is exported for Claude to see

## Troubleshooting

### Script Not Appearing in FL Studio

**Problem:** Bridge script doesn't show in Tools menu

**Solutions:**
- Re-run the setup script: `./install_prerequisites.sh`
- Ensure file has `.pyscript` extension
- Restart FL Studio
- Check FL Studio version supports Python scripting

### Changes Not Appearing

**Problem:** Sent requests but nothing happens

**Solutions:**
- Verify you ran `ComposeWithLLM` once in FL Studio
- Make sure FL Studio window is active
- Try pressing Cmd+Opt+Y (macOS) or Ctrl+Alt+Y (Windows) manually to trigger
- Check that Claude has **Accessibility permissions** (System Settings → Privacy & Security → Accessibility)

### Trigger Not Working

**Problem:** Notes don't appear after sending

**Solutions:**
- Restart Claude Code to reconnect MCP server
- Run `ComposeWithLLM` in FL Studio again
- Make sure dependencies are installed: `uv sync`
- Check that Terminal/Claude has **Accessibility permissions** (System Settings → Privacy & Security → Accessibility)

### MCP Server Not Connecting

**Problem:** AI assistant doesn't have FL Studio tools

**Solutions:**
- Restart your MCP client (Claude Desktop/Code)
- Verify configuration file has correct path to `fl_studio_mcp_server.py`
- Ensure dependencies are installed: `uv sync`
- Check that the virtual environment was created in `.venv/`

### Notes at Wrong Positions

**Problem:** Notes appear at incorrect times

**Solutions:**
- Time values should be in quarter notes, not ticks
- `time=0` is beat 1, `time=4` is beat 5 (measure 2 in 4/4)
- Check PPQ value in state export for reference

### Permission Errors

**Problem:** Cannot write to JSON files

**Solutions:**
- Ensure FL Studio scripts directory exists
- Check file permissions (should be read/write)
- On Windows, may need to run FL Studio as administrator

## File Locations

**FL Studio scripts directory:**
```
~/Documents/Image-Line/FL Studio/Settings/Piano roll scripts/
├── ComposeWithLLM.pyscript  (bridge script - auto mode)
├── mcp_request.json          (request queue)
├── mcp_response.json         (execution results)
└── piano_roll_state.json     (exported piano roll state)
```

**Source repository:**
```
/path/to/fl-studio-mcp/
├── ComposeWithLLM.pyscript           (source bridge script)
├── fl_studio_mcp_server.py            (MCP server with built-in trigger)
├── install_prerequisites.sh           (install uv & Python environment and piano roll script)
├── install_mcp_for_claude.sh          (MCP for Claude Code)
├── install_mcp_for_gemini.sh          (MCP for Gemini CLI)
├── install_mcp_for_codex.sh           (MCP for Codex)
├── CLAUDE.md                          (AI assistant documentation)
└── README.md                          (this file)
```

## Development

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT License - feel free to use and modify for your projects.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

## Acknowledgments

Built using the [Model Context Protocol](https://modelcontextprotocol.io/) specification.

Special thanks to the FL Studio and Python communities.


