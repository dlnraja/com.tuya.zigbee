#!/usr/bin/env bash
# WHY(P3025, 25/10/2026 Paris): the hooks and the bot routines run node gates from this clone. When node or
# node_modules vanished (main clone lost node_modules on 24-25/10), failures looked like gate errors or
# passed silently. Sourced by pre-commit and pre-push: picks a Node >= 22 when one exists (homey CLI needs 22),
# and fails LOUDLY with the fix when deps are missing. Failover: one automatic `npm ci --ignore-scripts`
# (disable with HOOKS_AUTO_NPM_CI=0); if that fails too, the hook stops with the exact command to run.
_p3025_root="$(git rev-parse --show-toplevel)"
_p3025_major() { "$1" -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }
NODE_BIN="${NODE_BIN:-node}"
command -v node.exe >/dev/null 2>&1 && NODE_BIN="node.exe"   # Windows Git Bash: node.exe is steadier
if ! command -v "$NODE_BIN" >/dev/null 2>&1; then
  echo "❌ HOOK BLOCKED (P3025): node not found on PATH. Install Node 22 (nvm install 22) and retry." >&2
  exit 1
fi
if [ "$(_p3025_major "$NODE_BIN")" -lt 22 ]; then
  for _c in "${HOMEY_NODE22:-}" /workspace/node22/bin/node "$HOME/.nvm/versions/node/v22"*/bin/node; do
    if [ -n "$_c" ] && [ -x "$_c" ] && [ "$(_p3025_major "$_c")" -ge 22 ]; then NODE_BIN="$_c"; PATH="$(dirname "$_c"):$PATH"; export PATH; break; fi
  done
  [ "$(_p3025_major "$NODE_BIN")" -lt 22 ] && echo "⚠️  hooks (P3025): Node $("$NODE_BIN" -v) < 22 — gates run, but homey CLI/CI use Node 22. Set HOMEY_NODE22=/path/to/node22." >&2
fi
export NODE_BIN
if [ ! -f "$_p3025_root/node_modules/.package-lock.json" ]; then
  echo "⚠️  hooks (P3025): $_p3025_root/node_modules is missing (deps not installed)." >&2
  if [ "${HOOKS_AUTO_NPM_CI:-1}" != "0" ] && command -v npm >/dev/null 2>&1; then
    echo "   failover: running 'npm ci --ignore-scripts --no-audit --no-fund' once (HOOKS_AUTO_NPM_CI=0 to disable)..." >&2
    (cd "$_p3025_root" && npm ci --ignore-scripts --no-audit --no-fund >/tmp/p3025-hook-npm-ci.log 2>&1) || true
  fi
  if [ ! -f "$_p3025_root/node_modules/.package-lock.json" ]; then
    echo "❌ HOOK BLOCKED (P3025): dependencies missing. Fix: cd \"$_p3025_root\" && PATH=/path/to/node22/bin:\$PATH npm ci --ignore-scripts" >&2
    [ -f /tmp/p3025-hook-npm-ci.log ] && tail -5 /tmp/p3025-hook-npm-ci.log >&2
    exit 1
  fi
  echo "   ✅ deps restored." >&2
fi
