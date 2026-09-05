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
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DRY = process.argv.includes('--dry-run');

const appPath = path.join(ROOT, 'app.json');
const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));

let synced = 0, changed = 0, missing = 0;
for (const d of app.drivers || []) {
  const p = path.join(ROOT, 'drivers', d.id, 'driver.compose.json');
  if (!fs.existsSync(p)) { missing++; continue; }
  let compose;
  try { compose = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
  if (!compose.zigbee) continue;
  const before = JSON.stringify(d.zigbee);
  d.zigbee = compose.zigbee;
  if (JSON.stringify(d.zigbee) !== before) changed++;
  synced++;
}

if (!DRY && changed > 0) fs.writeFileSync(appPath, JSON.stringify(app));
console.log(`[sync-appjson-zigbee] synced: ${synced} | changed: ${changed} | no compose: ${missing}${DRY ? ' (dry-run)' : ''}`);
