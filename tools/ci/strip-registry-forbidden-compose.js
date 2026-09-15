#!/usr/bin/env node
'use strict';

/**
 * strip-registry-forbidden-compose.js (P2523)
 *
 * WHY: Fleet enrich re-injects doNotLock invent onto forbidden drivers
 * (krwtzhfd+TS004F → climate_sensor). Contre quoi: Fleet anti-bot red.
 *
 * Usage:
 *   node tools/ci/strip-registry-forbidden-compose.js
 *   node tools/ci/strip-registry-forbidden-compose.js --apply
 */

const fs = require('fs');
const path = require('path');
const {
  loadRegistry,
  isForbiddenDriver,
  isForbiddenPlacement,
  invalidate,
} = require('../../lib/pairing/UserMisattributionRegistry');

const ROOT = path.resolve(__dirname, '../..');
const APPLY = process.argv.includes('--apply');

function stripOneCompose(driverId) {
  const fp = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  if (!fs.existsSync(fp)) return null;
  const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const mfrs = j.zigbee?.manufacturerName || [];
  const pids = j.zigbee?.productId || [];
  const removed = [];
  const nextMfr = mfrs.filter((m) => {
    if (isForbiddenPlacement(m, driverId)) {
      removed.push({ mfr: m, reason: 'placement' });
      return false;
    }
    for (const p of pids) {
      if (isForbiddenDriver(m, p, driverId)) {
        removed.push({ mfr: m, pid: p, reason: 'couple' });
        return false;
      }
    }
    return true;
  });
  let nextPid = pids;
  let pidDrop = 0;
  if (driverId === 'climate_sensor') {
    nextPid = pids.filter((p) => !/^TS004F$/i.test(String(p)));
    pidDrop = pids.length - nextPid.length;
  }
  if (!removed.length && !pidDrop) return null;
  j.zigbee.manufacturerName = nextMfr;
  j.zigbee.productId = nextPid;
  if (APPLY) fs.writeFileSync(fp, `${JSON.stringify(j, null, 2)}\n`);
  return { driverId, removed: removed.length, pidDrop };
}

function stripClimateAppJson() {
  const fp = path.join(ROOT, 'app.json');
  if (!fs.existsSync(fp)) return null;
  const raw = fs.readFileSync(fp);
  const a = JSON.parse(raw);
  const d = (a.drivers || []).find((x) => x.id === 'climate_sensor');
  if (!d?.zigbee) return { changed: 0 };
  const beforeM = (d.zigbee.manufacturerName || []).length;
  const beforeP = (d.zigbee.productId || []).length;
  d.zigbee.manufacturerName = (d.zigbee.manufacturerName || []).filter(
    (m) => !/krwtzhfd|8eazvzo6/i.test(m) && !isForbiddenPlacement(m, 'climate_sensor'),
  );
  d.zigbee.productId = (d.zigbee.productId || []).filter((p) => !/^TS004F$/i.test(String(p)));
  const changed = (beforeM - d.zigbee.manufacturerName.length)
    + (beforeP - d.zigbee.productId.length);
  if (changed && APPLY) {
    // Keep compact if file was compact (Athom size); else pretty
    const pretty = Buffer.byteLength(raw) > 3_000_000;
    fs.writeFileSync(fp, pretty ? `${JSON.stringify(a, null, 2)}\n` : JSON.stringify(a));
  }
  return { changed };
}

function scrubMfsInvent() {
  const fp = path.join(ROOT, 'data', 'mfs_db.json');
  if (!fs.existsSync(fp)) return null;
  const db = JSON.parse(fs.readFileSync(fp));
  let n = 0;
  for (const key of Object.keys(db)) {
    if (!/krwtzhfd/i.test(key)) continue;
    const entry = db[key];
    if (!entry || typeof entry !== 'object') continue;
    if (entry.driverId === 'climate_sensor' || isForbiddenPlacement(key, entry.driverId)) {
      entry.driverId = null;
      entry.source = 'p2523-strip-forbidden';
      n += 1;
    }
  }
  if (n && APPLY) fs.writeFileSync(fp, JSON.stringify(db));
  return { scrubbed: n };
}

function main() {
  invalidate();
  const { cases } = loadRegistry();
  const drivers = new Set(['climate_sensor']);
  for (const c of cases || []) {
    if (!c.doNotLock && String(c.forbidMode || '').toLowerCase() !== 'couple') continue;
    for (const d of c.forbiddenDrivers || []) drivers.add(d);
  }
  const compose = [];
  for (const driverId of drivers) {
    const r = stripOneCompose(driverId);
    if (r) compose.push(r);
  }
  const app = stripClimateAppJson();
  const mfs = scrubMfsInvent();
  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', compose, app, mfs }, null, 2));
}

main();
