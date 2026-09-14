'use strict';

/**
 * P2490 — Contre quoi (T140352 VicHY / Eduard / MIAMO / Peter / PresentSky):
 * 1) Athom compact drops `_TZE200_icka1clh` from curtain_motor → Homey Unknown (MIAMO #2229)
 *    while `_TZE284_fodv6bkr` (Eduard) was already sacred-kept — asymmetric failover.
 * 2) Peter #2237: measure_battery already stripped before P2488 keep-lock — need rehydrate.
 * 3) VicHY: curtain phantoms must be in radar staleCaps (complementary to DynCap heal).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..', '..');

const keep = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'),
  'utf8'
));
const couples = keep.couples || [];

function hasKeep(mfr, pid, driverId) {
  return couples.some((c) => (
    String(c.mfr).toLowerCase() === String(mfr).toLowerCase()
    && c.pid === pid
    && c.driverId === driverId
  ));
}

assert.ok(hasKeep('_TZE200_icka1clh', 'TS0601', 'curtain_motor'), 'icka1clh TZE200 sacred-keep');
assert.ok(hasKeep('_TZE204_icka1clh', 'TS0601', 'curtain_motor'), 'icka1clh TZE204 sacred-keep');
assert.ok(hasKeep('_TZE284_fodv6bkr', 'TS0601', 'curtain_motor'), 'fodv6bkr keep remains');
assert.ok(hasKeep('_TZE200_zah67ekd', 'TS0601', 'curtain_motor'), 'zah67ekd AM43 sibling keep');

const { compactManifestFile } = require('../../scripts/maintenance/compact-zigbee-identifiers.cjs');
const tmp = path.join(os.tmpdir(), `p2490-compact-${process.pid}.json`);
fs.copyFileSync(path.join(ROOT, 'app.json'), tmp);
compactManifestFile(tmp, {
  maxTotalCombos: 17000,
  maxDriverCombos: 2000,
  maxCaseForms: 2,
});
const after = JSON.parse(fs.readFileSync(tmp, 'utf8'));
try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }

const curtain = (after.drivers || []).find((d) => d.id === 'curtain_motor');
assert.ok(curtain, 'curtain_motor in compacted manifest');
const mfrs = (curtain.zigbee && curtain.zigbee.manufacturerName) || [];
assert.ok(mfrs.some((m) => /_TZE200_icka1clh/i.test(m)), 'compact keeps _TZE200_icka1clh');
assert.ok(mfrs.some((m) => /_TZE284_fodv6bkr/i.test(m)), 'compact keeps _TZE284_fodv6bkr');

const btnSrc = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_1/device.js'), 'utf8');
assert.ok(
  /P2490 rehydrate measure_battery/.test(btnSrc) && /addCapability\('measure_battery'\)/.test(btnSrc),
  'button_wireless_1 must rehydrate measure_battery on boot'
);

const adapterSrc = fs.readFileSync(path.join(ROOT, 'lib/intelligent/IntelligentDeviceAdapter.js'), 'utf8');
assert.ok(
  /P2490 keep-lock/.test(adapterSrc) && /Queue rehydrate measure_battery/.test(adapterSrc),
  'IntelligentDeviceAdapter must queue measure_battery rehydrate when keep-lock'
);

const radarSrc = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/device.js'), 'utf8');
assert.ok(
  /windowcoverings_set/.test(radarSrc)
  && /staleCaps[\s\S]*windowcoverings_set/.test(radarSrc),
  'presence radar staleCaps must include windowcoverings phantoms'
);

console.log('P2490 complementary failover locks OK');
