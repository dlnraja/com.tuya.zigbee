#!/usr/bin/env bash
# P3025 — data/manifest gates for pre-commit (sourced; same checks as ci-self-check).
#   1) DP shards: when the unknown-DP catalogue (or its builders) is staged, rebuild
#      lib/zigbee/data/dp-shards deterministically, stage it, then --check (fails loudly).
#   2) app.json ↔ compose drift: when app.json / driver.compose.json / .homeycompose is staged,
#      run scripts/ci/appjson-compose-drift-gate.js (HOOKS_AUTO_FIX_DRIFT=1 → --fix + stage).
# Each gate is skipped (with a note) when its script is absent on this branch — fallback, not failure.
# Increments ERRORS (defined by the caller); set HOOKS_SKIP_DATA_GATES=1 to skip (CI still enforces).
_p3025_staged=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null || true)
_p3025_node="${NODE_BIN:-node}"
if [ "${HOOKS_SKIP_DATA_GATES:-0}" != "1" ]; then
  if printf '%s\n' "$_p3025_staged" | grep -Eq '^(lib/zigbee/data/unknown-dp-catalog\.json|lib/zigbee/data/dp-shards/|scripts/data/build-(dp-shards|unknown-dp-catalog)\.js|lib/memory/CatalogStore\.js)'; then
    if [ -f scripts/data/build-dp-shards.js ]; then
      echo "▶ P3025 dp-shards: catalogue staged → rebuilding shards"
      if "$_p3025_node" scripts/data/build-dp-shards.js >/dev/null 2>&1 && git add lib/zigbee/data/dp-shards 2>/dev/null \
         && "$_p3025_node" scripts/data/build-dp-shards.js --check; then
        :
      else
        echo "❌ P3025 dp-shards stale or rebuild failed — run: node scripts/data/build-dp-shards.js && git add lib/zigbee/data/dp-shards"
        ERRORS=$((ERRORS + 1))
      fi
    else
      echo "ℹ P3025 dp-shards: scripts/data/build-dp-shards.js absent on this branch — skipped"
    fi
  fi
  if printf '%s\n' "$_p3025_staged" | grep -Eq '^(app\.json|drivers/[^/]+/driver\.compose\.json|\.homeycompose/)'; then
    if [ -f scripts/ci/appjson-compose-drift-gate.js ]; then
      if [ "${HOOKS_AUTO_FIX_DRIFT:-0}" = "1" ]; then
        "$_p3025_node" scripts/ci/appjson-compose-drift-gate.js --fix >/dev/null 2>&1 && git add app.json
      fi
      if ! "$_p3025_node" scripts/ci/appjson-compose-drift-gate.js; then
        echo "❌ P3025 app.json drifts from compose — run: node scripts/ci/appjson-compose-drift-gate.js --fix && git add app.json (or HOOKS_AUTO_FIX_DRIFT=1)"
        ERRORS=$((ERRORS + 1))
      fi
    fi
  fi
fi
unset _p3025_staged _p3025_node
