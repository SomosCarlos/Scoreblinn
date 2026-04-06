#!/bin/bash
# Scoreblinn — install.sh
# Copies extension files into your Xcode Safari Extension project.
#
# Usage:
#   bash install.sh /path/to/YourXcodeProject
#
# Example:
#   bash install.sh ~/Developer/MyScoreblinnApp

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Find the Xcode project root ─────────────────────────────────────────────
if [ -n "$1" ]; then
  XCODE_ROOT="$1"
else
  echo ""
  echo "Usage: bash install.sh /path/to/your/XcodeProjectFolder"
  echo ""
  echo "This script copies Scoreblinn's extension files into your Xcode"
  echo "Safari Extension App project's Resources/ folder."
  echo ""
  echo "To find your project folder: in Xcode, right-click the project"
  echo "name at the top of the file navigator → Show in Finder."
  exit 1
fi

if [ ! -d "$XCODE_ROOT" ]; then
  echo "Error: '$XCODE_ROOT' is not a valid directory."
  exit 1
fi

# ── Find the extension Resources/ folder ─────────────────────────────────────
# Xcode template names it "<AppName> Extension/Resources" or
# "Extension/Resources" — search for it automatically.
RESOURCES_DIR=$(find "$XCODE_ROOT" -type d -name "Resources" \
  | grep -i "extension" \
  | head -1)

if [ -z "$RESOURCES_DIR" ]; then
  # Fallback: look for any Resources/ folder containing a manifest.json
  RESOURCES_DIR=$(find "$XCODE_ROOT" -type f -name "manifest.json" \
    | head -1 \
    | xargs dirname 2>/dev/null)
fi

if [ -z "$RESOURCES_DIR" ]; then
  echo ""
  echo "Could not auto-detect the extension's Resources/ folder inside:"
  echo "  $XCODE_ROOT"
  echo ""
  echo "Please manually specify it:"
  echo "  bash install.sh /path/to/project /path/to/Resources"
  exit 1
fi

# Allow manual override as second argument
if [ -n "$2" ]; then
  RESOURCES_DIR="$2"
fi

echo ""
echo "Scoreblinn installer"
echo "────────────────────────────────────────────────────"
echo "Source:  $SCRIPT_DIR"
echo "Target:  $RESOURCES_DIR"
echo ""

# ── Backup existing template files ──────────────────────────────────────────
BACKUP_DIR="$RESOURCES_DIR/_template_backup_$(date +%Y%m%d_%H%M%S)"
echo "Backing up existing template files to:"
echo "  $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
# Move (not copy) template files so Xcode doesn't get confused by duplicates
for f in manifest.json background.js content.js popup.html _locales images; do
  if [ -e "$RESOURCES_DIR/$f" ]; then
    mv "$RESOURCES_DIR/$f" "$BACKUP_DIR/"
  fi
done

# ── Copy Scoreblinn files ────────────────────────────────────────────────────
echo ""
echo "Copying Scoreblinn extension files..."

FILES=(
  manifest.json
  background.js
  content.js
  content.css
  popup.html
  popup.js
  popup.css
)

for f in "${FILES[@]}"; do
  cp "$SCRIPT_DIR/$f" "$RESOURCES_DIR/$f"
  echo "  ✓ $f"
done

# Copy icons folder
rm -rf "$RESOURCES_DIR/icons"
cp -r "$SCRIPT_DIR/icons" "$RESOURCES_DIR/icons"
echo "  ✓ icons/"

echo ""
echo "────────────────────────────────────────────────────"
echo "Done! Next steps:"
echo ""
echo "  1. In Xcode, right-click '$RESOURCES_DIR'"
echo "     → 'Add Files to [AppName] Extension...'"
echo "     → Select: content.css, popup.js, popup.css, icons/"
echo "     (manifest.json, background.js, content.js, popup.html"
echo "      are already in the project — Xcode just needs the new ones)"
echo ""
echo "  2. Make sure all 8 files appear under the Extension target"
echo "     in the File Navigator (left panel)."
echo ""
echo "  3. Product → Clean Build Folder (⇧⌘K)"
echo "  4. Product → Run (⌘R) → choose your iPhone"
echo "  5. On your iPhone: Settings → Safari → Extensions → Scoreblinn → ON"
echo "  6. In Safari, tap the puzzle-piece icon in the address bar → Scoreblinn"
echo ""
