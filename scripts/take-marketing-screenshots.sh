#!/usr/bin/env bash
# Take 7 marketing screenshots from the currently visible simulator.
# Usage: ./scripts/take-marketing-screenshots.sh <DEVICE_UDID> <OUTPUT_DIR>
#
# The caller must navigate the app to each screen manually or via deep links.
# This script just captures whatever is on screen with the right filename.

set -euo pipefail

UDID="${1:?Usage: $0 <DEVICE_UDID> <OUTPUT_DIR>}"
OUT="${2:-screenshots/marketing}"

mkdir -p "$OUT"

SCREENS=(
  "01-home"
  "02-mood"
  "03-decide"
  "04-habits"
  "05-reasons"
  "06-awards"
  "07-you"
)

for name in "${SCREENS[@]}"; do
  echo "📸 Ready to capture: $name"
  echo "   Navigate to the '$name' screen in the simulator, then press ENTER."
  read -r
  xcrun simctl io "$UDID" screenshot "$OUT/$name.png"
  echo "   ✅ Saved $OUT/$name.png"
  echo ""
done

echo "🎉 All $((${#SCREENS[@]})) screenshots captured in $OUT/"
