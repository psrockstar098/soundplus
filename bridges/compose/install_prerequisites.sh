#!/bin/bash
# FL Studio MCP - Prerequisites Installation Script
# This script installs Python dependencies and sets up FL Studio

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   FL Studio MCP - Prerequisites Installation               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo

# Define paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FL_SCRIPTS_DIR="$HOME/Documents/Image-Line/FL Studio/Settings/Piano roll scripts"

# ============================================================
# PART 1: Install Python Dependencies
# ============================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PART 1: Installing Python Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "📦 Installing uv (Python package manager)..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"
    echo "✅ uv installed"
else
    echo "✅ uv already installed"
fi

# Create virtual environment and install dependencies
echo "🐍 Setting up Python environment..."
cd "$SCRIPT_DIR"
if [ -d "$SCRIPT_DIR/.venv" ]; then
    echo "📁 Virtual environment exists, updating dependencies..."
    uv pip install -e .
else
    echo "📁 Creating new virtual environment..."
    uv venv
    uv pip install -e .
fi
echo "✅ Python dependencies installed"
echo

# ============================================================
# PART 2: FL Studio Setup
# ============================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  PART 2: Setting Up FL Studio"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

echo "📂 FL Studio scripts directory: $FL_SCRIPTS_DIR"

# Check if FL Studio scripts directory exists
if [ ! -d "$FL_SCRIPTS_DIR" ]; then
    echo "❌ FL Studio scripts directory not found!"
    echo "   Expected: $FL_SCRIPTS_DIR"
    echo
    echo "   Please make sure FL Studio is installed."
    echo "   You may need to create this directory manually."
    exit 1
fi

echo "✅ FL Studio scripts directory found"

# Copy ComposeWithLLM.pyscript
echo "📋 Copying ComposeWithLLM.pyscript to FL Studio..."
if cp "$SCRIPT_DIR/ComposeWithLLM.pyscript" "$FL_SCRIPTS_DIR/"; then
    echo "✅ ComposeWithLLM.pyscript installed"
else
    echo "❌ Failed to copy ComposeWithLLM.pyscript"
    exit 1
fi

# Create initial JSON files
echo "📝 Creating initial JSON files..."
echo "[]" > "$FL_SCRIPTS_DIR/mcp_request.json"
echo "{}" > "$FL_SCRIPTS_DIR/mcp_response.json"
echo "{\"ppq\": 96, \"noteCount\": 0, \"notes\": []}" > "$FL_SCRIPTS_DIR/piano_roll_state.json"
echo "✅ JSON files created"
echo

# ============================================================
# Summary
# ============================================================

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Prerequisites Installation Complete! 🎉                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo
echo "✨ FL Studio scripts and dependencies are ready!"
echo "✨ The auto-trigger is now built into the MCP server!"
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "1️⃣  Register with Claude Code:"
echo "   ./install_mcp_for_claude.sh"
echo
echo "2️⃣  Start using FL Studio with Claude:"
echo "   - Open FL Studio"
echo "   - Run ComposeWithLLM once (Tools → Scripting → ComposeWithLLM)"
echo "   - Start Claude and begin composing!"
echo
echo "3️⃣  (Optional) Generate configs for other AI assistants:"
echo "   ./install_mcp_for_gemini.sh"
echo "   ./install_mcp_for_codex.sh"
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Important Notes:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "🔹 No separate auto-trigger script needed - it's built into the MCP server!"
echo "🔹 Claude Code needs Accessibility permissions:"
echo "   System Settings → Privacy & Security → Accessibility"
echo "🔹 The MCP server will automatically trigger FL Studio when you send notes"
echo
echo "Happy composing! 🎵"