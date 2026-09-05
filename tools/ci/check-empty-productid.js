'use strict';

/**
 * check-empty-productid.js (P2309)
 * Fail CI/local if any zigbee driver.compose.json has productId: [] —
 * Homey prepare-publish FATAL (seen: button_wireless_4_ts0041).
 *
 *   node tools/ci/check-empty-productid.js
 *   node tools/ci/check-empty-productid.js --json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS = path.join(ROOT, 'drivers');
const JSON_MODE = process.argv.includes('--json');

function collect() {
  const empty = [];
  if (!fs.existsSync(DRIVERS)) return empty;
  for (const id of fs.readdirSync(DRIVERS)) {
    const p = path.join(DRIVERS, id, 'driver.compose.json');
    if (!fs.existsSync(p)) continue;
    let j;
    try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
    if (!j.zigbee) continue;
    const conn = [].concat(j.connectivity || []);
    if (conn.length && !conn.includes('zigbee')) continue;
    const pid = j.zigbee.productId;
    if (!Array.isArray(pid) || pid.length === 0) empty.push(id);
  }
  return empty.sort();
}

const empty = collect();
const out = {
  gate: 'empty-productid',
  ok: empty.length === 0,
  empty,
  note: 'Never ship zigbee.productId: [] — Homey publish sanitize then FATAL',
};

if (JSON_MODE) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log(`empty-productid: ${empty.length === 0 ? 'OK' : `FAIL ${empty.length}`}`);
  for (const id of empty) console.log(`  - ${id}`);
}

process.exit(empty.length ? 1 : 0);
