#!/usr/bin/env python3
"""
FastMCP server for FL Studio
Handles piano roll operations and music theory tools
"""

from fastmcp import FastMCP
import json
import os
import platform
import subprocess
import time
from pathlib import Path


# Initialize FastMCP server
mcp = FastMCP("FL Studio MCP Server")


class FLStudioTrigger:
    """Cross-platform FL Studio trigger - integrated into MCP server"""

    def __init__(self):
        self.system = platform.system()

    def save_current_window(self):
        """Save the current active window/app name"""
        try:
            if self.system == "Darwin":
                script = '''
                tell application "System Events"
                    set frontApp to name of first application process whose frontmost is true
                    return frontApp
                end tell
                '''
                result = subprocess.run(['osascript', '-e', script],
                                      capture_output=True, text=True)
                if result.returncode == 0:
                    return result.stdout.strip()
            elif self.system == "Windows":
                try:
                    import win32gui
                    hwnd = win32gui.GetForegroundWindow()
                    return win32gui.GetWindowText(hwnd)
                except ImportError:
                    pass
        except Exception:
            pass
        return None

    def restore_focus(self, window_id):
        """Restore focus to saved window"""
        if not window_id:
            return False
        try:
            if self.system == "Darwin":
                # Handle different app name formats
                app_name = window_id.split(':')[-1] if ':' in window_id else window_id

                # Common app name mappings
                app_mappings = {
                    'Claude': 'Claude',
                    'Terminal': 'Terminal',
                    'iTerm': 'iTerm',
                    'VSCode': 'Code',
                    'Visual Studio Code': 'Code',
                    'Chrome': 'Google Chrome',
                    'Safari': 'Safari',
                    'Firefox': 'Firefox'
                }

                # Map common names to actual application names
                actual_app_name = app_mappings.get(app_name, app_name)

                # Try to activate the app
                subprocess.run(['osascript', '-e', f'tell application "{actual_app_name}" to activate'],
                             timeout=3, capture_output=True)

                # Additional wait to ensure focus is restored
                time.sleep(0.2)

            elif self.system == "Windows":
                try:
                    import win32gui
                    hwnd = win32gui.FindWindow(None, window_id)
                    if hwnd and win32gui.IsWindow(hwnd):
                        win32gui.SetForegroundWindow(hwnd)
                except ImportError:
                    pass
            return True
        except Exception as e:
            return False

    def focus_fl_studio(self):
        """Focus FL Studio window"""
        try:
            if self.system == "Darwin":
                script = '''
                tell application "System Events"
                    if exists process "OsxFL" then
                        tell process "OsxFL"
                            set frontmost to true
                        end tell
                    end if
                end tell
                '''
                subprocess.run(['osascript', '-e', script], timeout=3)
                return True
            elif self.system == "Windows":
                try:
                    import win32gui
                    hwnd = win32gui.FindWindow("TFruityLooshMainForm", None)
                    if hwnd:
                        if win32gui.IsIconic(hwnd):
                            win32gui.ShowWindow(hwnd, 9)
                        win32gui.SetForegroundWindow(hwnd)
                        return True
                except ImportError:
                    pass
        except Exception:
            pass
        return False

    def trigger_flstudio(self):
        """Trigger FL Studio and restore focus"""
        if not self._is_fl_studio_running():
            return False

        saved_window = self.save_current_window()

        if not self.focus_fl_studio():
            return False

        time.sleep(0.3)

        if not self._send_keystroke():
            return False

        time.sleep(0.2)

        if saved_window:
            self.restore_focus(saved_window)

        return True

    def _is_fl_studio_running(self):
        """Check if FL Studio is running"""
        try:
            if self.system == "Windows":
                result = subprocess.run(['tasklist', '/FI', 'IMAGENAME eq FL.exe'],
                                      capture_output=True, text=True)
                return 'FL.exe' in result.stdout
            elif self.system == "Darwin":
                result = subprocess.run(["pgrep", "OsxFL"], capture_output=True)
                return result.returncode == 0
        except:
            pass
        return False

    def _send_keystroke(self):
        """Send the trigger keystroke"""
        try:
            from pynput.keyboard import Key, Controller
            keyboard = Controller()

            if self.system == "Darwin":
                # macOS: Cmd+Opt+Y
                with keyboard.pressed(Key.cmd):
                    with keyboard.pressed(Key.alt):
                        keyboard.press('y')
                        keyboard.release('y')
            else:
                # Windows: Ctrl+Alt+Y
                with keyboard.pressed(Key.ctrl):
                    with keyboard.pressed(Key.alt):
                        keyboard.press('y')
                        keyboard.release('y')

            # Add delay to allow FL Studio to receive focus and process the keystroke
            time.sleep(2.0)

            return True
        except ImportError:
            # Fallback using platform-specific methods
            if self.system == "Darwin":
                subprocess.run(['osascript', '-e',
                    'tell application "System Events" to keystroke "y" using {command down, option down}'],
                    timeout=3)

                # Add delay to allow FL Studio to receive focus and process the keystroke
                time.sleep(2.0)

                return True
            elif self.system == "Windows":
                try:
                    import pyautogui
                    pyautogui.hotkey('ctrl', 'alt', 'y')

                    # Add delay to allow FL Studio to receive focus and process the keystroke
                    time.sleep(2.0)

                    return True
                except ImportError:
                    pass
        except:
            pass
        return False


# Global trigger instance
trigger = FLStudioTrigger()

# Request/Response file paths for communication
BRIDGE_DIR = Path(os.path.expanduser("~/Documents/Image-Line/FL Studio/Settings/Piano roll scripts"))
REQUEST_FILE = BRIDGE_DIR / "mcp_request.json"
RESPONSE_FILE = BRIDGE_DIR / "mcp_response.json"

# Path to the piano roll scripts directory
SCRIPT_DIR = Path(os.path.expanduser("~/Documents/Image-Line/FL Studio/Settings/Piano roll scripts"))
STATE_FILE = SCRIPT_DIR / "piano_roll_state.json"


@mcp.tool
def get_piano_roll_state() -> str:
    """
    Read the current piano roll state from the exported JSON file.

    The FL Studio script must have exported the state by pressing the 'Export State' button.

    Returns:
        A JSON string containing all notes and metadata from the piano roll.
    """
    if not STATE_FILE.exists():
        return json.dumps({
            "error": "No piano roll state file found. Please run the Piano Roll Bridge script and click 'Export State'.",
            "expected_location": str(STATE_FILE)
        })

    try:
        with open(STATE_FILE, 'r') as f:
            state = json.load(f)
        return json.dumps(state, indent=2)
    except Exception as e:
        return json.dumps({
            "error": f"Failed to read piano roll state: {str(e)}"
        })


@mcp.tool
def send_notes(notes: list[dict], mode: str = "add") -> str:
    """
    Send arbitrary notes to the FL Studio piano roll.

    Args:
        notes: List of note dictionaries, each containing:
            - midi: MIDI note number (0-127)
            - duration: Note duration as multiplier of quarter notes (e.g., 1.0=quarter, 2.0=half)
            - time: Start time offset in quarter notes from beginning (default 0)
            - velocity: Note velocity 0.0-1.0 (default 0.8)
        mode: Either "add" to add to existing notes or "replace" to clear first (default "add")

    Example:
        send_notes([
            {"midi": 60, "duration": 1.0, "time": 0},
            {"midi": 64, "duration": 0.5, "time": 1.0},
            {"midi": 67, "duration": 2.0, "time": 1.5}
        ], mode="replace")

    Returns:
        Status of the note creation request
    """
    if not notes:
        return "Error: notes list cannot be empty"

    # Validate and prepare notes
    prepared_notes = []
    for i, note in enumerate(notes):
        if "midi" not in note:
            return f"Error: note {i} missing required 'midi' field"
        if "duration" not in note:
            return f"Error: note {i} missing required 'duration' field"

        prepared_note = {
            "midi": note["midi"],
            "duration": note["duration"],
            "time": note.get("time", 0),  # Time in quarter notes
            "velocity": note.get("velocity", 0.8)
        }
        prepared_notes.append(prepared_note)

    # Create request for the FL Studio bridge
    request = {
        "action": "add_notes",
        "notes": prepared_notes,
        "mode": mode
    }

    try:
        # Read existing requests or create new list
        requests = []
        if REQUEST_FILE.exists():
            try:
                with open(REQUEST_FILE, 'r') as f:
                    content = json.load(f)
                    if isinstance(content, list):
                        requests = content
            except:
                pass

        # If mode is replace, clear the list first and add a clear action
        if mode == "replace":
            requests = [{"action": "clear"}]

        # Append this notes request
        requests.append(request)

        # Write updated list
        with open(REQUEST_FILE, 'w') as f:
            json.dump(requests, f, indent=2)

        # Trigger FL Studio to process the request
        trigger_success = trigger.trigger_flstudio()

        if trigger_success:
            return f"Sent {len(prepared_notes)} notes to FL Studio (trigger successful). MIDI notes: {[n['midi'] for n in prepared_notes]}"
        else:
            return f"Sent {len(prepared_notes)} notes to FL Studio (trigger failed). Please ensure FL Studio is running and has run ComposeWithLLM once."

    except Exception as e:
        return f"Error sending notes: {str(e)}"


@mcp.tool
def delete_notes(notes: list[dict]) -> str:
    """
    Delete specific notes from the FL Studio piano roll.

    Args:
        notes: List of note dictionaries to delete, each containing:
            - midi: MIDI note number (0-127)
            - time: Start time in quarter notes

    Example:
        delete_notes([
            {"midi": 67, "time": 4},
            {"midi": 72, "time": 8}
        ])

    Returns:
        Status of the delete request
    """
    if not notes:
        return "Error: notes list cannot be empty"

    # Validate notes
    for i, note in enumerate(notes):
        if "midi" not in note:
            return f"Error: note {i} missing required 'midi' field"
        if "time" not in note:
            return f"Error: note {i} missing required 'time' field"

    # Create request for the FL Studio bridge
    request = {
        "action": "delete_notes",
        "notes": notes
    }

    try:
        # Read existing requests or create new list
        requests = []
        if REQUEST_FILE.exists():
            try:
                with open(REQUEST_FILE, 'r') as f:
                    content = json.load(f)
                    if isinstance(content, list):
                        requests = content
            except:
                pass

        # Append this delete request
        requests.append(request)

        # Write updated list
        with open(REQUEST_FILE, 'w') as f:
            json.dump(requests, f, indent=2)

        # Trigger FL Studio to process the request
        trigger_success = trigger.trigger_flstudio()

        if trigger_success:
            return f"Delete request for {len(notes)} notes sent to FL Studio (trigger successful). MIDI notes: {[n['midi'] for n in notes]}"
        else:
            return f"Delete request for {len(notes)} notes added to queue (trigger failed). Please ensure FL Studio is running and has run ComposeWithLLM once."

    except Exception as e:
        return f"Error creating delete request: {str(e)}"


@mcp.tool
def clear_queue() -> str:
    """
    Clear the pending request queue without affecting the piano roll.

    Use this to discard accumulated add/delete requests before they are applied.
    The piano roll itself remains unchanged until you send new requests.

    Returns:
        Status of the queue clearing operation
    """
    try:
        # Clear the request file
        with open(REQUEST_FILE, 'w') as f:
            f.write("[]")

        return "Queue cleared. All pending requests have been discarded."

    except Exception as e:
        return f"Error clearing queue: {str(e)}"


@mcp.tool
def clear_piano_roll() -> str:
    """
    Clear all notes from the FL Studio piano roll.

    This creates a clear request that will remove all notes when processed.
    The clear action is executed immediately when FL Studio runs the last script.

    Returns:
        Status of the clear request
    """
    try:
        # Create clear request
        request = {
            "action": "clear"
        }

        # Write clear request
        with open(REQUEST_FILE, 'w') as f:
            json.dump([request], f, indent=2)

        # Trigger FL Studio to process the clear
        trigger_success = trigger.trigger_flstudio()

        if trigger_success:
            return "Clear request sent to FL Studio (trigger successful). All notes will be removed."
        else:
            return "Clear request added to queue (trigger failed). Please ensure FL Studio is running and has run ComposeWithLLM once."

    except Exception as e:
        return f"Error creating clear request: {str(e)}"


if __name__ == "__main__":
    mcp.run()
