#!/usr/bin/env node
'use strict';
// P3092 (31/10/2026): the P52 master→stable sync copied master's lib/tuya/fingerprints.json as-is and put
// _TZE204_z7a2jmyy back on water_valve_smart, while stable's compose (the truth here) has it on climate_sensor.
// After the copy, keep stable's previous entry for any mfr whose new driver does not list it in its stable
// compose but whose previous driver does. Additive: no key is ever removed.
const fs = require('fs');
const path = require('path');

const low = (s) => String(s || '').trim().toLowerCase();
function composeMfrs(root, driverId, cache) {
  if (!driverId) return null;
  if (cache.has(driverId)) return cache.get(driverId);
  let set = null;
  try {
    const c = JSON.parse(fs.readFileSync(path.join(root, 'drivers', driverId, 'driver.compose.json'), 'utf8'));
    set = new Set([].concat((c.zigbee && c.zigbee.manufacturerName) || []).map(low));
  } catch (_) { set = null; }
  cache.set(driverId, set);
  return set;
}

function applyLocks(root, before, after) {
  const cache = new Map();
  const kept = [];
  for (const [mfr, prev] of Object.entries(before || {})) {
    const next = after[mfr];
    if (!next || !prev || next.driverId === prev.driverId) continue;
    const nextSet = composeMfrs(root, next.driverId, cache);
    const prevSet = composeMfrs(root, prev.driverId, cache);
    if (prevSet && prevSet.has(low(mfr)) && !(nextSet && nextSet.has(low(mfr)))) {
      after[mfr] = prev;
      kept.push(`${mfr}: kept on ${prev.driverId} (master said ${next.driverId})`);
    }
  }
  return kept;
}

module.exports = { applyLocks };
if (require.main === module) {
  // usage: node tools/ci/p52-fingerprint-locks.js <stable-before.json> [target=lib/tuya/fingerprints.json]
  const root = process.cwd();
  const target = process.argv[3] || 'lib/tuya/fingerprints.json';
  const before = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const after = JSON.parse(fs.readFileSync(target, 'utf8'));
  const kept = applyLocks(root, before, after);
  if (kept.length) fs.writeFileSync(target, JSON.stringify(after));
  console.log(`p52-fingerprint-locks: ${kept.length} kept${kept.length ? '\n  ' + kept.join('\n  ') : ''}`);
}
