'use strict';

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

/**
 * P2266 — HACF #38762 / ZHA #2862 Temu `_TZ3000_bjawzodf` + TY0201/TS0201
 * ZCL EP1 temp+humidity + magic packet (not Neo qaaysllp EP2/lux path)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P2266 bjawzodf Temu TY0201 HACF gate', function () {
  this.timeout?.(15000);

  it('compose locks TZ3000_bjawzodf with TY0201/TS0201 and ZCL clusters', () => {
    const compose = JSON.parse(read('drivers/lcdtemphumidsensor/driver.compose.json'));
    assert.ok(compose.zigbee.manufacturerName.some((m) => /bjawzodf/i.test(m) && /TZ3000/i.test(m)));
    assert.ok(compose.zigbee.productId.includes('TY0201'));
    assert.ok(compose.zigbee.productId.includes('TS0201'));
    const ep1 = compose.zigbee.endpoints['1'].clusters.map(Number);
    assert.ok(ep1.includes(0), 'Basic for magic packet');
    assert.ok(ep1.includes(1026), 'temperature');
    assert.ok(ep1.includes(1029), 'humidity');
  });

  it('device.js sends Tuya magic packet', () => {
    const src = read('drivers/lcdtemphumidsensor/device.js');
    assert.ok(src.includes('sendTuyaMagicPacket'));
    assert.ok(src.includes('_sendLcdMagicPacket'));
    assert.ok(src.includes('P2266') || src.includes('bjawzodf'));
  });

  it('fingerprint DB separates TZ3000|TY0201 from TZE200|TS0601', () => {
    const db = read('lib/DeviceFingerprintDB.js');
    assert.ok(db.includes("_TZ3000_bjawzodf|TY0201"));
    assert.ok(db.includes("_TZ3000_bjawzodf|TS0201"));
    assert.ok(db.includes("_TZE200_bjawzodf|TS0601"));
    assert.ok(/_TZ3000_bjawzodf\|TY0201[\s\S]*?lcdtemphumidsensor/.test(db));
    assert.ok(/_TZE200_bjawzodf\|TS0601[\s\S]*?climate_sensor/.test(db));
  });

  it('misattribution registry locks Temu couple', () => {
    const reg = JSON.parse(read('data/user-misattribution-registry.json'));
    const hit = (reg.cases || []).find((c) => c.id === 'p2266-bjawzodf-ty0201-temu');
    assert.ok(hit);
    assert.strictEqual(hit.canonicalDriver, 'lcdtemphumidsensor');
    assert.ok((hit.productId || []).includes('TY0201'));
    assert.ok((hit.forbiddenDrivers || []).includes('climate_sensor'));
  });
});
