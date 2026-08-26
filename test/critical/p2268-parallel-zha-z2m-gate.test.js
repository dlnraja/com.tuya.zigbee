'use strict';

/**
 * P2268 — Parallel projects shadow enrich (ZHA / Z2M / ZHC)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P2268 parallel ZHA/Z2M couple corrections', function () {
  this.timeout(20000);

  it('cjbofhxw removed from smoke, locked on power_clamp_meter', () => {
    const smoke = JSON.parse(read('drivers/smoke_sensor3/driver.compose.json'));
    assert.ok(!(smoke.zigbee.manufacturerName || []).some((m) => /cjbofhxw/i.test(m)));
    const clamp = JSON.parse(read('drivers/power_clamp_meter/driver.compose.json'));
    assert.ok((clamp.zigbee.manufacturerName || []).some((m) => /cjbofhxw/i.test(m)));
    assert.ok((clamp.zigbee.productId || []).includes('TS0601'));
  });

  it('a14rjslz removed from climate, locked on energy_meter_3phase', () => {
    const climate = JSON.parse(read('drivers/climate_sensor/driver.compose.json'));
    assert.ok(!(climate.zigbee.manufacturerName || []).some((m) => /a14rjslz/i.test(m)));
    const meter = JSON.parse(read('drivers/energy_meter_3phase/driver.compose.json'));
    assert.ok((meter.zigbee.manufacturerName || []).some((m) => /a14rjslz/i.test(m)));
  });

  it('tonrapsk+TS0002 on switch_2gang; UnifiedSwitchBase sends magic packet', () => {
    const sw = JSON.parse(read('drivers/switch_2gang/driver.compose.json'));
    assert.ok((sw.zigbee.manufacturerName || []).some((m) => /tonrapsk/i.test(m)));
    assert.ok((sw.zigbee.productId || []).includes('TS0002'));
    const base = read('lib/devices/UnifiedSwitchBase.js');
    assert.ok(base.includes('sendTuyaMagicPacket'));
  });

  it('fingerprint DB + registry lock parallel couples', () => {
    const db = read('lib/DeviceFingerprintDB.js');
    assert.ok(db.includes("_TZE284_cjbofhxw|TS0601"));
    assert.ok(db.includes("_TZE284_a14rjslz|TS0601"));
    assert.ok(db.includes("_TZ3000_tonrapsk|TS0002"));
    const reg = JSON.parse(read('data/user-misattribution-registry.json'));
    const ids = (reg.cases || []).map((c) => c.id);
    assert.ok(ids.includes('p2268-cjbofhxw-clamp-not-smoke'));
    assert.ok(ids.includes('p2268-a14rjslz-3phase-not-climate'));
    assert.ok(ids.includes('p2268-tonrapsk-ts0002-2gang'));
  });

  it('silent enrich phases include Z2M/ZHA soft sync', () => {
    const phases = JSON.parse(read('config/enrichment/phases.json'));
    const sync = phases.blocks.sync || [];
    assert.ok(sync.some((s) => s.id === 'sync-z2m-zha-light' || (s.args || []).includes('--only=z2m')));
  });
});
