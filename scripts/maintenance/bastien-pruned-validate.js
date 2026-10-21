#!/usr/bin/env node
'use strict';
/**
 * P2928 — validate the PRUNED Bastien publish directory (what Athom actually receives) at level
 * `publish` with homey-lib, in-process. The repo-root `homey app validate` only sees the full
 * manifest; the P2724/P2929 fleet prune rewrites drivers + flow cards afterwards, so a bad prune
 * (orphan card, missing asset) was only caught by Athom (invalid_state / processing_failed).
 * Called by scripts/prepare-publish.js (spawnSync) for com.dlnraja.tuya.zigbee.bastien only.
 * Usage: node scripts/maintenance/bastien-pruned-validate.js <publishDir> [level]
 */
const path = require('path');

/** Orphan check homey-lib does not do: device args filtered to drivers absent from the manifest. */
function findOrphanCards(manifest) {
  const ids = new Set((manifest.drivers || []).map((d) => d.id));
  const out = [];
  for (const s of ['triggers', 'conditions', 'actions']) {
    for (const c of (manifest.flow && manifest.flow[s]) || []) {
      for (const a of c.args || []) {
        const m = a && a.type === 'device' && typeof a.filter === 'string' && a.filter.match(/driver_id=([^&]+)/);
        if (m && !m[1].split('|').some((id) => ids.has(id))) out.push(`${s}.${c.id}`);
      }
    }
  }
  return out;
}

async function validatePrunedDir(dir, level = 'publish') {
  const manifest = JSON.parse(require('fs').readFileSync(path.join(dir, 'app.json'), 'utf8'));
  const orphans = findOrphanCards(manifest);
  if (orphans.length) throw new Error(`${orphans.length} orphan flow card(s): ${orphans.slice(0, 10).join(', ')}`);
  const { App } = require('homey-lib');
  const app = new App(path.resolve(dir));
  await app.validate({ level });
  return true;
}

module.exports = { validatePrunedDir, findOrphanCards };

if (require.main === module) {
  const dir = process.argv[2];
  const level = process.argv[3] || 'publish';
  if (!dir) { console.error('Usage: bastien-pruned-validate.js <publishDir> [level]'); process.exit(2); }
  validatePrunedDir(dir, level)
    .then(() => { console.log(`[P2928] pruned publish dir validated at level ${level}: ${dir}`); })
    .catch((e) => { console.error(`[P2928] pruned publish dir FAILED ${level} validation: ${e && e.message}`); process.exit(1); });
}
