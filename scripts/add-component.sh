#!/usr/bin/env bash
# add-component.sh — wraps `shadcn add` into a TD-channel-tagged flow.
#
# Usage:
#   scripts/add-component.sh <name> <channel> [shadcn-source-url-or-name]
#
# Examples:
#   scripts/add-component.sh hero v1 button
#   scripts/add-component.sh hero v2 https://ui.shadcn.com/r/styles/new-york/button.json
#
# Behavior:
#   1. Refuses to write to a channel whose registry/<channel>/index.json sets
#      "frozen": true (ADR-02 enforcement at author-time; CI enforces at merge).
#   2. Runs `shadcn` (via pnpm dlx) to materialize the upstream component into
#      a tmp dir.
#   3. Copies the resulting registry-item JSON to registry/<channel>/<name>.json
#      and tags it with td.channel + td.added_at + td.source.
#   4. Reminds the operator to update registry/<channel>/CHANGES.md.
#
# Notes:
#   - This is the source-side wrapper. Clients still consume the registry via
#     `shadcn add @td-v1/<name>` (URL routing handled by registry.json channels).

set -euo pipefail

NAME="${1:-}"
CHANNEL="${2:-}"
SOURCE="${3:-}"

if [[ -z "$NAME" || -z "$CHANNEL" ]]; then
  echo "usage: $0 <name> <channel> [shadcn-source]" >&2
  exit 2
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INDEX="$REPO_ROOT/registry/$CHANNEL/index.json"

if [[ ! -f "$INDEX" ]]; then
  echo "error: unknown channel '$CHANNEL' (no $INDEX)" >&2
  exit 1
fi

FROZEN=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$INDEX','utf8')).frozen === true ? 'true' : 'false')")
if [[ "$FROZEN" == "true" ]]; then
  echo "error: channel '$CHANNEL' is FROZEN per ADR-02. Open a new channel or land the change as a migration codemod." >&2
  exit 1
fi

TARGET="$REPO_ROOT/registry/$CHANNEL/$NAME.json"
if [[ -f "$TARGET" ]]; then
  echo "error: $TARGET already exists. In-channel mutation forbidden. Bump channel or rename." >&2
  exit 1
fi

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

if [[ -n "$SOURCE" ]]; then
  echo "Fetching upstream registry item from: $SOURCE"
  cd "$TMPDIR"
  pnpm dlx shadcn@latest add "$SOURCE" --yes --cwd "$TMPDIR" || {
    echo "shadcn add failed; capture output above and re-run." >&2
    exit 1
  }
fi

# Minimal stub item; in real use, populate from shadcn output above.
node -e "
const fs = require('fs');
const item = {
  '\$schema': 'https://ui.shadcn.com/schema/registry-item.json',
  name: '$NAME',
  type: 'registry:ui',
  td: {
    channel: '$CHANNEL',
    added_at: new Date().toISOString(),
    source: '${SOURCE:-stub}'
  },
  files: []
};
fs.writeFileSync('$TARGET', JSON.stringify(item, null, 2) + '\n');
console.log('wrote $TARGET');
"

echo
echo "Next steps:"
echo "  1. Populate registry/$CHANNEL/$NAME.json files[] with real component sources."
echo "  2. Update registry/$CHANNEL/CHANGES.md with rationale."
echo "  3. pnpm run registry:validate"
echo "  4. pnpm run build"
echo "  5. Commit; open PR; CI enforces freeze rules."
