#!/usr/bin/env node
'use strict';
/**
 * sync-appjson-zigbee.js — Resync app.json zigbee blocks from driver.compose.json.
 *
 * The driver.compose.json files are the canonical source (edited by bots and
 * humans); app.json is a generated artifact that drifts whenever a bot touches
 * compose without rebuilding. This script copies the zigbee block verbatim
 * from every compose file into the matching app.json driver, preserving all
 * other app.json fields. Idempotent.
 *
 * P3086: the copy goes through the same template substitution as the Homey composer
 * ({{driverId}}, {{driverPath}}, {{driverAssetsPath}}, {{driverName}}) and app.json is written
 * compact, like sanitize-manifest.cjs. 608e233c65 wrote 296 raw "{{driverAssetsPath}}" learnmode
 * images and a pretty-printed 5.35 MB app.json, which broke the P3079 compose parity gate.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DRY = process.argv.includes('--dry-run');

/** Same substitution as homey/lib/HomeyCompose.js replaceSpecialPropertiesRecursive (no Z-Wave here). */
function resolveTemplates(value, driverId, name) {
  if (typeof value === 'string') {
    let v = value.replace(/{{driverId}}/g, driverId);
    const n = name || {};
    if (n.en) {
      v = v.replace(/{{driverName}}/g, n.en);
      v = v.replace(/{{driverName([A-Z][a-z])}}/g, (_m, loc) => n[loc.toLowerCase()] || n.en);
    }
    return v.replace(/{{driverPath}}/g, `/drivers/${driverId}`).replace(/{{driverAssetsPath}}/g, `/drivers/${driverId}/assets`);
  }
  if (Array.isArray(value)) { return value.map((x) => resolveTemplates(x, driverId, name)); }
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) { out[k] = resolveTemplates(value[k], driverId, name); }
    return out;
  }
  return value;
}

/** Copy compose zigbee blocks into app.json (resolved like the composer); returns the counts. */
function syncZigbee(appPath = path.join(ROOT, 'app.json'), driversDir = path.join(ROOT, 'drivers')) {
  const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
  let synced = 0, changed = 0, missing = 0;
  for (const d of app.drivers || []) {
    const p = path.join(driversDir, d.id, 'driver.compose.json');
    if (!fs.existsSync(p)) { missing++; continue; }
    let compose;
    try { compose = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
    if (!compose.zigbee) { continue; }
    const before = JSON.stringify(d.zigbee);
    d.zigbee = resolveTemplates(compose.zigbee, d.id, d.name || compose.name);
    if (JSON.stringify(d.zigbee) !== before) { changed++; }
    synced++;
  }

  if (!DRY && changed > 0) { fs.writeFileSync(appPath, `${JSON.stringify(app)}\n`); }
  return { synced, changed, missing };
}

module.exports = { resolveTemplates, syncZigbee };

if (require.main === module) {
  const { synced, changed, missing } = syncZigbee();
  console.log(`[sync-appjson-zigbee] synced: ${synced} | changed: ${changed} | no compose: ${missing}${DRY ? ' (dry-run)' : ''}`);
}
