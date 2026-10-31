#!/usr/bin/env bash
# P3093 (31/10/2026): shared guard every bot runs right before `git commit`.
#  - P3086: if the staged set touches app.json / driver.compose.json / .homeycompose, bring app.json back in line
#    with compose (appjson-compose-drift-gate --fix), restage it, then refuse the commit if drift remains.
#  - P3089: refuse when a P3077-moved couple was re-injected on its old driver (workflow-lessons-gate).
# Bots whose commit touches none of those paths pass straight through.
set -u
staged=$(git diff --cached --name-only 2>/dev/null || true)
echo "$staged" | grep -qE '^(app\.json|\.homeycompose/|drivers/[^/]+/driver\.compose\.json)' || exit 0
if [ -f scripts/ci/appjson-compose-drift-gate.js ]; then
  node scripts/ci/appjson-compose-drift-gate.js --fix >/dev/null 2>&1 || true
  git add app.json 2>/dev/null || true
  if ! node scripts/ci/appjson-compose-drift-gate.js; then
    echo "::error::bot-commit-guard: app.json still drifts from compose — commit refused (P3086)"; exit 1
  fi
fi
if [ -f tools/ci/workflow-lessons-gate.js ]; then
  node -e "const g=require('./tools/ci/workflow-lessons-gate');const e=g.checkMoves(process.cwd());if(e.length){console.log('::error::'+e.join('\n::error::'));process.exit(1)}" \
    || { echo "::error::bot-commit-guard: moved couple re-injected — commit refused (P3089)"; exit 1; }
fi
exit 0
