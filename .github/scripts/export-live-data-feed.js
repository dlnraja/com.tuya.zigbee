#!/usr/bin/env node
'use strict';
/**
 * export-live-data-feed.js (P92.77)
 * Exports the curated fingerprint DB as a versioned JSON feed consumed by
 * the app's LiveDataUpdater (daily, from GitHub Pages).
 *
 * Output: .github/pages-build/data/mfs_db_latest.json
 *   { version, generated, appVersion, devices: { mfr: {driverId, modelIds?, source?} } }
 *
 * Compact & safe: only driverId/modelIds/source — no internal notes.
 * Synthetic placeholders are excluded.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, '.github', 'pages-build', 'data');
const SYNTHETIC_RX = /_disabled|_dummy|_generic|_hybrid|_master|placeholder|needs_/i;

const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'mfs_db.json'), 'utf8'));
const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));

const devices = {};
for (const [mfr, entry] of Object.entries(db)) {
  if (!entry || typeof entry !== 'object' || !entry.driverId) {continue;}
  if (SYNTHETIC_RX.test(mfr)) {continue;}
  const out = { driverId: entry.driverId };
  if (Array.isArray(entry.modelIds) && entry.modelIds.length) {
    out.modelIds = entry.modelIds.slice(0, 60);
  }
  if (entry.source) {out.source = String(entry.source).slice(0, 120);}
  devices[mfr] = out;
}

const payload = {
  version: `${app.version}.${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
  generated: new Date().toISOString(),
  appVersion: app.version,
  devices
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'mfs_db_latest.json'), JSON.stringify(payload));
const kb = (fs.statSync(path.join(OUT_DIR, 'mfs_db_latest.json')).size / 1024).toFixed(0);
console.log(`[live-feed] ${Object.keys(devices).length} fabricants exportés (${kb} Ko) → data/mfs_db_latest.json (v${payload.version})`);
