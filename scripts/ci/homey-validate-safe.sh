#!/usr/bin/env bash
# P3093: homey app validate re-composes .homeycompose into the root app.json and leaves .homeybuild.
# Run the lockfile CLI, restore app.json, and fail if the log names a reserved setting prefix.
# Usage: bash scripts/ci/homey-validate-safe.sh --level publish
set -u
if [ ! -x node_modules/.bin/homey ]; then
  echo "homey-validate-safe: pinned homey CLI missing at node_modules/.bin/homey" >&2
  exit 1
fi
node scripts/ci/homey-cli-pin.cjs || exit 1
bak=$(mktemp)
cp app.json "$bak"
hadbuild=0
[ -e .homeybuild ] && hadbuild=1
log=$(mktemp)
node_modules/.bin/homey app validate "$@" >"$log" 2>&1
rc=$?
cat "$log"
if grep -E 'cannot start with reserved prefix' "$log"; then
  echo "homey-validate-safe: reserved setting prefix is a blocking error" >&2
  rc=1
fi
cp "$bak" app.json
rm -f "$bak" "$log"
[ "$hadbuild" = 0 ] && rm -rf .homeybuild
exit "$rc"
