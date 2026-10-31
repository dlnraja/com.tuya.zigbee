#!/usr/bin/env bash
# P3093 (31/10/2026): `homey app validate` re-composes .homeycompose into the root app.json (2.4 -> 4.8 MB) and
# leaves .homeybuild. Run it, then put back exactly the app.json we had, so no later step or bot commit sees
# the validate artifact. Exit code is validate's own. Usage: bash scripts/ci/homey-validate-safe.sh --level publish
set -u
bak=$(mktemp); cp app.json "$bak"
hadbuild=0; [ -e .homeybuild ] && hadbuild=1
npx homey app validate "$@"; rc=$?
cp "$bak" app.json; rm -f "$bak"
[ "$hadbuild" = 0 ] && rm -rf .homeybuild
exit $rc
