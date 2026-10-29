#!/bin/bash
# FL Studio MCP - Codex CLI Registration
# Registers the MCP server with OpenAI Codex CLI

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
VENV_PYTHON="$SCRIPT_DIR/.venv/bin/python"
SERVER_SCRIPT="$SCRIPT_DIR/fl_studio_mcp_server.py"
CODEX_CONFIG_DIR="$HOME/.codex"
CODEX_CONFIG_FILE="$CODEX_CONFIG_DIR/config.toml"

# Remove existing registration
if grep -q "\[mcp_servers.fl-studio-mcp\]" "$CODEX_CONFIG_FILE" 2>/dev/null; then
    sed -i.bak '/\[mcp_servers.fl-studio-mcp\]/,/^$/d' "$CODEX_CONFIG_FILE" 2>/dev/null || true
fi

# Add new registration
mkdir -p "$CODEX_CONFIG_DIR"
cat >> "$CODEX_CONFIG_FILE" << EOF

[mcp_servers.fl-studio-mcp]
command = "$VENV_PYTHON"
args = ["$SERVER_SCRIPT"]
EOF