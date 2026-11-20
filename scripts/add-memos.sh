#!/bin/bash
# Add voice memos to boybjorn.com/memos ("From the Attic").
# Usage: scripts/add-memos.sh [folder]   (default: ~/Desktop/memos)
# Files must be named "YYYY-MM-DD title" (any audio type). Each new file is
# converted to a 192 kbps MP3 in memos/audio/ and added to memos/memos.json
# with a TODO note (hidden on the page until you replace it). Files already
# in memos.json are skipped, so it's safe to run again after adding more.
set -euo pipefail
SITE="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$HOME/Desktop/memos}"
OUT="$SITE/memos/audio"; JSON="$SITE/memos/memos.json"
mkdir -p "$OUT"; [ -f "$JSON" ] || echo '[]' > "$JSON"
LAME="$(command -v lame || echo /opt/homebrew/bin/lame)"
FFMPEG="$(command -v ffmpeg || true)"
[ -n "$FFMPEG" ] || [ -x "$LAME" ] || { echo "Needs lame or ffmpeg (brew install lame)"; exit 1; }

added=0
while IFS= read -r f; do
  base="$(basename "$f")"; name="${base%.*}"
  if [[ ! "$name" =~ ^([0-9]{4}-[0-9]{2}-[0-9]{2})[[:space:]_-]+(.+)$ ]]; then
    echo "skip (name isn't 'YYYY-MM-DD title'): $base"; continue
  fi
  date="${BASH_REMATCH[1]}"; title="${BASH_REMATCH[2]}"
  slug="$(printf '%s' "$title" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-|-$//g')"
  file="$date-$slug.mp3"
  if python3 -I -c 'import json,sys; sys.exit(0 if any(m.get("file")==sys.argv[2] for m in json.load(open(sys.argv[1]))) else 1)' "$JSON" "$file"; then
    echo "already listed: $file"; continue
  fi
  if [ -n "$FFMPEG" ]; then
    "$FFMPEG" -loglevel error -y -i "$f" -vn -codec:a libmp3lame -b:a 192k -ar 44100 "$OUT/$file"
  else
    tmp="$(mktemp -t memo).wav"; afconvert -f WAVE -d LEI16@44100 "$f" "$tmp"
    "$LAME" --quiet --cbr -b 192 --tt "$title" --ta "Boy Bjorn" "$tmp" "$OUT/$file"; rm -f "$tmp"
  fi
  size=$(stat -f%z "$OUT/$file")
  python3 -I - "$JSON" "$title" "$date" "$file" <<'PY'
import json, sys
p, title, date, file = sys.argv[1:]
data = json.load(open(p))
data.append({"title": title, "date": date, "note": "TODO: one line about this memo", "file": file})
data.sort(key=lambda m: m["date"], reverse=True)
with open(p, "w") as f:
    f.write("[\n" + ",\n".join("  " + json.dumps(m, ensure_ascii=False) for m in data) + "\n]\n")
PY
  echo "added: $date  $title  -> audio/$file ($((size / 1024)) KB)"; added=$((added + 1))
done < <(find "$SRC" -maxdepth 1 -type f \( -iname '*.m4a' -o -iname '*.mp3' -o -iname '*.wav' -o -iname '*.aif' -o -iname '*.aiff' -o -iname '*.caf' -o -iname '*.aac' -o -iname '*.flac' -o -iname '*.qta' \) | sort)
echo "$added new memo(s). Notes to fill in: memos/memos.json"
