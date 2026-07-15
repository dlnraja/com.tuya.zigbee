#!/usr/bin/env node
'use strict';

/**
 * tools/ci/_fix-zg204-zv-zx-sacred.js
 *
 * P64.8 — Fix sacredCouples entries for ZG-204ZV and ZG-204ZX that were
 *        incorrectly pointing to vibration_sensor / motion_sensor_radar_mmwave /
 *        generic_diy. They should all be presence_sensor_radar (the actual
 *        driver we have for mmWave-based devices).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MFS_DB = path.join(ROOT, 'data', 'mfs_db.json');

// MFR|PID pairs to fix: key -> correct driver
const FIXES = {
  '_tze200_uli8wasj|ts0601': 'presence_sensor_radar',
  '_tze200_grgol3xp|ts0601': 'presence_sensor_radar',
  '_tze200_rhgsbacq|ts0601': 'presence_sensor_radar',
  '_tze200_y8jijhba|ts0601': 'presence_sensor_radar',  // already correct in some cases
  '_tze200_w0ap83qu|ts0601': 'presence_sensor_radar',
  // Also fix the upper-case fingerprints if any
};

const db = JSON.parse(fs.readFileSync(MFS_DB, 'utf8'));
let fixed = 0;
for (const [k, correctDriver] of Object.entries(FIXES)) {
  const entry = db.sacredCouples[k];
  if (!entry) {
    console.log(`- Skipped ${k} (not in sacredCouples)`);
    continue;
  }
  if (entry.driver === correctDriver) {
    console.log(`- ${k} already ${correctDriver}`);
    continue;
  }
  const oldDriver = entry.driver;
  entry.driver = correctDriver;
  entry.sources = Array.from(new Set([...(entry.sources || []), 'p64.8-zg204-fix']));
  fixed++;
  console.log(`✓ ${k}: ${oldDriver} → ${correctDriver}`);
}

if (fixed > 0) {
  fs.writeFileSync(MFS_DB, JSON.stringify(db, null, 2));
  console.log(`\n✅ ${fixed} sacredCouples entries fixed → ${MFS_DB}`);
}
