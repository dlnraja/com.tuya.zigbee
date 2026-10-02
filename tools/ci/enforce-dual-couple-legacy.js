#!/usr/bin/env node
'use strict';
/**
 * P2797 — keep dual-couple resolutions (P2794) from being undone by enrichment scripts.
 *
 * lib/data/dual-couple-legacy.json lists fingerprint entries removed from a driver because the couple
 * belongs to another driver. Enrichment scripts that infer placements from incomplete data can put them
 * back (e.g. ZG-301Z on curtain_motor). This step removes those entries again from driver.compose.json
 * and from the matching app.json driver. Paired devices are unaffected (pairing only).
 *
 *   node tools/ci/enforce-dual-couple-legacy.js          # fix
 *   node tools/ci/enforce-dual-couple-legacy.js --check  # exit 1 when a legacy entry is back
 *   node tools/ci/enforce-dual-couple-legacy.js --sync   # fix, then copy every compose manufacturerName/productId
 *                                                        # list into app.json (keeps app.json's formatting)
 *
 * WHY --sync: the fleet enrichment pipeline resynced app.json in the middle (harden-unknown-zigbee) and
 * later compose clean-ups (prune / re-inject / strip-forbidden) never reached app.json, so app.json kept
 * entries the compose files had dropped (ff1de8d2e, 26 drivers). Run it as the last step before commit.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.argv.find((a) => a.startsWith('--root='))?.slice(7) || path.join(__dirname, '..', '..'));
const CHECK = process.argv.includes('--check');
const SYNC = !CHECK && process.argv.includes('--sync');

function main() {
  const legacyPath = path.join(ROOT, 'lib/data/dual-couple-legacy.json');
  if (!fs.existsSync(legacyPath)) {return 0;}
  const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8')).drivers || {};
  const appPath = path.join(ROOT, 'app.json');
  const appRaw = fs.existsSync(appPath) ? fs.readFileSync(appPath, 'utf8') : null;
  const app = appRaw ? JSON.parse(appRaw) : null;
  const found = [];
  let appChanged = false;
  for (const [driver, spec] of Object.entries(legacy)) {
    const drop = {
      manufacturerName: new Set((spec.manufacturerName || []).map((s) => String(s).toLowerCase())),
      productId: new Set((spec.productId || []).map((s) => String(s).toUpperCase())),
    };
    const norm = (k, v) => k === 'productId' ? String(v).toUpperCase() : String(v).toLowerCase();
    const strip = (zb, where) => {
      let changed = false;
      for (const k of ['manufacturerName', 'productId']) {
        if (!zb || !Array.isArray(zb[k]) || !drop[k].size) {continue;}
        const keep = zb[k].filter((v) => !drop[k].has(norm(k, v)));
        if (keep.length !== zb[k].length) {
          found.push(`${where}:${driver}:${zb[k].filter((v) => drop[k].has(norm(k, v))).join(',')}`);
          zb[k] = keep;
          changed = true;
        }
      }
      return changed;
    };
    const cp = path.join(ROOT, 'drivers', driver, 'driver.compose.json');
    if (fs.existsSync(cp)) {
      const c = JSON.parse(fs.readFileSync(cp, 'utf8'));
      if (strip(c.zigbee, 'compose') && !CHECK) {fs.writeFileSync(cp, `${JSON.stringify(c, null, 2)}\n`);}
    }
    const ad = app && (app.drivers || []).find((d) => d.id === driver);
    if (ad && strip(ad.zigbee, 'app.json')) {appChanged = true;}
  }
  let synced = 0;
  if (SYNC && app) {
    for (const d of app.drivers || []) {
      const cp = path.join(ROOT, 'drivers', d.id, 'driver.compose.json');
      if (!fs.existsSync(cp)) {continue;}
      let c;
      try { c = JSON.parse(fs.readFileSync(cp, 'utf8')); } catch (_e) { continue; }
      if (!c.zigbee || !d.zigbee) {continue;}
      // fingerprint lists only: the rest of app.json's zigbee block is build output (asset paths)
      let changed = false;
      for (const k of ['manufacturerName', 'productId']) {
        if (Array.isArray(c.zigbee[k]) && JSON.stringify(c.zigbee[k]) !== JSON.stringify(d.zigbee[k])) {
          d.zigbee[k] = c.zigbee[k];
          changed = true;
        }
      }
      if (changed) {synced++;}
    }
    if (synced) {appChanged = true;}
  }
  if (appChanged && !CHECK) {
    const pretty = /^\{\s*\n/.test(appRaw);
    fs.writeFileSync(appPath, pretty ? `${JSON.stringify(app, null, 2)}\n` : JSON.stringify(app));
  }
  if (SYNC) {console.log(`app.json fingerprint lists resynced from compose: ${synced}`);}
  if (found.length) {
    console.log(`${CHECK ? '❌' : '🔧'} dual-couple legacy entries ${CHECK ? 'found' : 'removed'}: ${found.join(' | ')}`);
    return CHECK ? 1 : 0;
  }
  console.log('✅ dual-couple legacy entries stay removed');
  return 0;
}

if (require.main === module) {process.exit(main());}
module.exports = { main };
