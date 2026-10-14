#!/usr/bin/env node
'use strict';

/**
 * P2815 — soil_sensor must be couple-driven (mfr+pid), not cartesian invent.
 * Contre quoi: P2814 productId-only prune still left Homey mfr[]×pid[] phantoms
 * (HOBEIAN+TS0601, AOYAN+TS0601, myd45weu+ZG-303Z) and polluted mfs modelIds.
 */

const fs = require('fs');
const path = require('path');
const { normalizeSacredCouple } = require('./sacred-couple-pair');

const ROOT = path.join(__dirname, '..', '..');
const SSOT = path.join(ROOT, 'config', 'architecture', 'soil-sensor-couples-ssot.json');
const COMPOSE = path.join(ROOT, 'drivers', 'soil_sensor', 'driver.compose.json');
const MFS = path.join(ROOT, 'data', 'mfs_db.json');
const KEEP = path.join(ROOT, 'config', 'architecture', 'publish-sacred-keep-couples.json');

function fail(msg) {
  console.error(`[P2815] FAIL: ${msg}`);
  process.exitCode = 1;
}

function main() {
  const ssot = JSON.parse(fs.readFileSync(SSOT, 'utf8'));
  const compose = JSON.parse(fs.readFileSync(COMPOSE, 'utf8'));
  const mfrs = (compose.zigbee?.manufacturerName || []).map(String);
  const pids = (compose.zigbee?.productId || []).map(String);
  const mfrLc = new Set(mfrs.map((m) => m.toLowerCase().trim()));
  const pidUc = new Set(pids.map((p) => p.toUpperCase()));

  const couples = ssot.verifiedCouples || [];
  if (couples.length < 6) fail('SSOT verifiedCouples too small');

  for (const c of couples) {
    const n = normalizeSacredCouple(c.mfr, c.pid);
    if (!n) {
      fail(`SSOT couple not normalizable: ${c.mfr}+${c.pid}`);
      continue;
    }
    if (!mfrLc.has(n.mfr.toLowerCase()) && !mfrLc.has(String(c.mfr).toLowerCase())) {
      fail(`compose missing mfr for couple ${n.mfr}+${n.pid}`);
    }
    if (!pidUc.has(n.pid.toUpperCase()) && !pidUc.has(String(c.pid).toUpperCase())) {
      fail(`compose missing pid for couple ${n.mfr}+${n.pid}`);
    }
  }

  // Sacred-keep must pin the critical user-report couples
  const keep = JSON.parse(fs.readFileSync(KEEP, 'utf8'));
  const keepKeys = new Set(
    (keep.couples || [])
      .filter((x) => x.driverId === 'soil_sensor')
      .map((x) => `${String(x.mfr).toLowerCase()}|${String(x.pid).toUpperCase()}`),
  );
  for (const need of [
    '_tze284_myd45weu|TS0601',
    'aoyan|AY-303Z',
    'hobeian|ZG-303Z',
  ]) {
    if (!keepKeys.has(need)) fail(`sacred-keep missing soil couple ${need}`);
  }

  // mfs_db: each verified Tuya/brand mfr must list its couple pid in modelIds
  const mfs = JSON.parse(fs.readFileSync(MFS, 'utf8'));
  for (const c of couples) {
    const key = Object.keys(mfs).find((k) => k.toLowerCase() === String(c.mfr).toLowerCase());
    if (!key) {
      // soft: brand entries may live under alternate case — try create later via align
      console.warn(`[P2815] WARN: mfs_db missing key for ${c.mfr}`);
      continue;
    }
    const models = (mfs[key].modelIds || []).map((x) => String(x).toUpperCase());
    if (!models.includes(String(c.pid).toUpperCase())) {
      fail(`mfs_db ${key} modelIds missing pid ${c.pid} for couple (refuse mfr-only)`);
    }
  }

  // Contre quoi phantoms: qaxkdgyt must not be on soil compose
  if (mfrs.some((m) => /qaxkdgyt/i.test(m))) {
    fail('compose still claims smoke/gas qaxkdgyt on soil_sensor');
  }

  // productId junk regression (P2814)
  if (pids.some((p) => /\s|battery switch|^trv|zbmini/i.test(p))) {
    fail('compose productId still contains junk strings');
  }

  if (process.exitCode) {
    console.error('[P2815] soil couple SSOT gate FAILED');
    process.exit(1);
  }
  console.log(`[P2815] OK — ${couples.length} verified soil couples locked (compose + sacred-keep + mfs)`);
}

main();
