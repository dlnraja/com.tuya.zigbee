#!/usr/bin/env node
/**
 * P3086 — regenerate the tracked app.json from compose, the way the bot bump leaves it.
 *
 * WHY: 608e233c65 (market-couples P2232, [skip ci]) committed an app.json written by
 * sync-appjson-zigbee.js: pretty-printed (3.09 MB -> 5.35 MB) and with 296 raw
 * "{{driverAssetsPath}}" learnmode images the Homey composer would have resolved. The P3079
 * parity gate then failed on master for every later commit. This script is the one way a bot
 * rewrites app.json: compose rebuild (homey CLI composer in a temp dir, scripts/ci/compose-rebuild.cjs)
 * -> driver-scoped flow dedupe (tools/ci/sync-appjson-flow-dedupe.js) -> sanitize-manifest.cjs ->
 * compact write. The committed version is kept (the bump owns version sync, M08).
 *
 * The flow dedupe and sanitize steps resolve the repo from their own location, so this always runs on
 * the checkout it lives in (no --root). Drift checking stays with scripts/ci/compose-parity-gate.cjs.
 *
 * Usage: node scripts/maintenance/regen-appjson-from-compose.cjs
 * Exit: 0 written (or already identical), 2 tool error.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { rebuildFromCompose } = require('../ci/compose-rebuild.cjs');

const ROOT = path.resolve(__dirname, '..', '..');

/** Compact form used for the tracked manifest (same bytes sanitize-manifest.cjs writes). */
const compact = (m) => `${JSON.stringify(m)}\n`;

async function regenerate(root = ROOT) {
  const appPath = path.join(root, 'app.json');
  const before = fs.readFileSync(appPath, 'utf8');
  const committed = JSON.parse(before);
  const composed = await rebuildFromCompose(root);
  if (committed.version) { composed.version = committed.version; }
  fs.writeFileSync(appPath, compact(composed));
  const node = process.execPath;
  const opts = { cwd: root, stdio: 'ignore' };
  execFileSync(node, [path.join(root, 'tools/ci/sync-appjson-flow-dedupe.js'), '--apply'], opts);
  execFileSync(node, [path.join(root, 'scripts/maintenance/sanitize-manifest.cjs'), appPath], opts);
  const after = compact(JSON.parse(fs.readFileSync(appPath, 'utf8')));
  fs.writeFileSync(appPath, after);
  return { changed: after !== before, bytesBefore: Buffer.byteLength(before), bytesAfter: Buffer.byteLength(after) };
}

module.exports = { regenerate, compact };

if (require.main === module) {
  regenerate(ROOT).then((r) => {
    console.log(`[regen-appjson] ${JSON.stringify(r)}`);
  }).catch((e) => { console.error('[regen-appjson] error:', e.message); process.exitCode = 2; });
}
