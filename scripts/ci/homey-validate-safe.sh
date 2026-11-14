#!/usr/bin/env bash
# P3093: homey app validate re-composes .homeycompose into the root app.json and leaves .homeybuild.
# Use the lockfile CLI after npm ci. When that binary is absent, call the npx shim so the
# guard test can supply a fake CLI and still see its exit code. Restore app.json either way.
# A reserved setting prefix in the log is a blocking error.
# Usage: bash scripts/ci/homey-validate-safe.sh --level publish
set -u
if [ -x node_modules/.bin/homey ]; then
  node scripts/ci/homey-cli-pin.cjs || exit 1
  homey_cli=node_modules/.bin/homey
else
  homey_cli=npx
fi
bak=$(mktemp)
cp app.json "$bak"
hadbuild=0
[ -e .homeybuild ] && hadbuild=1
log=$(mktemp)
if [ "$homey_cli" = npx ]; then
  "$homey_cli" homey app validate "$@" >"$log" 2>&1
else
  "$homey_cli" app validate "$@" >"$log" 2>&1
fi
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
