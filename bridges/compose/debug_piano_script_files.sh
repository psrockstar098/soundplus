#!/bin/bash
# Debug script to show contents of FL Studio MCP JSON files

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FL_STUDIO_DIR="$HOME/Documents/Image-Line/FL Studio/Settings/Piano roll scripts"

echo "=== FL Studio MCP Debug Information ==="
echo "Time: $(date)"
echo "Directory: $FL_STUDIO_DIR"
echo

echo "=== mcp_request.json ==="
if [ -f "$FL_STUDIO_DIR/mcp_request.json" ]; then
    cat "$FL_STUDIO_DIR/mcp_request.json"
    echo
else
    echo "File not found"
    echo
fi

echo "=== mcp_response.json ==="
if [ -f "$FL_STUDIO_DIR/mcp_response.json" ]; then
    cat "$FL_STUDIO_DIR/mcp_response.json"
    echo
else
    echo "File not found"
    echo
fi

echo "=== piano_roll_state.json ==="
if [ -f "$FL_STUDIO_DIR/piano_roll_state.json" ]; then
    cat "$FL_STUDIO_DIR/piano_roll_state.json"
    echo
else
    echo "File not found"
    echo
fi

echo "=== End Debug ==="