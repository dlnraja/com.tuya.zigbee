#!/usr/bin/env bash
# P3093: homey app validate re-composes .homeycompose into the root app.json and leaves .homeybuild.
# Use the lockfile CLI when npm ci has installed it. Fall back to npx only when that binary
# is absent (the P3093 guard test drives a fake npx). Restore app.json either way.
# A reserved setting prefix in the log is a blocking error. The validate exit code is kept
# when the log is clean.
# Usage: bash scripts/ci/homey-validate-safe.sh --level publish
set -u
if [ -x node_modules/.bin/homey ]; then
  node scripts/ci/homey-cli-pin.cjs || exit 1
  homey_bin=(node_modules/.bin/homey)
else
  homey_bin=(npx homey)
fi
bak=$(mktemp)
cp app.json "$bak"
hadbuild=0
[ -e .homeybuild ] && hadbuild=1
log=$(mktemp)
"${homey_bin[@]}" app validate "$@" >"$log" 2>&1
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
