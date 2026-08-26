'use strict';

/**
 * P2264 — ZHA #862 Neo `_TZ3000_qaaysllp` + TS0201
 * EP1: lux/battery/0xE002 · EP2 (virtual): temp/humidity after magic 0xFFFE
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P2264 qaaysllp Neo TH02B ZHA #862 gate', function () {
  this.timeout(15000);

  it('compose locks couple to lcdtemphumidluxsensor with EP2 temp/humidity', () => {
    const compose = JSON.parse(read('drivers/lcdtemphumidluxsensor/driver.compose.json'));
    assert.ok(compose.zigbee.manufacturerName.some((m) => /qaaysllp/i.test(m)));
    assert.ok(compose.zigbee.productId.includes('TS0201'));
    assert.ok(compose.capabilities.includes('measure_temperature'));
    assert.ok(compose.capabilities.includes('measure_humidity'));
    assert.ok(compose.capabilities.includes('measure_luminance'));
    const ep1 = compose.zigbee.endpoints['1'].clusters.map(Number);
    const ep2 = compose.zigbee.endpoints['2'].clusters.map(Number);
    assert.ok(ep1.includes(1024), 'EP1 illuminance');
    assert.ok(ep1.includes(57346), 'EP1 0xE002');
    assert.ok(ep2.includes(1026), 'EP2 temperature');
    assert.ok(ep2.includes(1029), 'EP2 humidity');
  });

  it('device.js sends Tuya magic packet and creates virtual EP2', () => {
    const src = read('drivers/lcdtemphumidluxsensor/device.js');
    assert.ok(src.includes('sendTuyaMagicPacket'));
    assert.ok(src.includes('_ensureMeasurementEndpoint'));
    assert.ok(src.includes('_sendQaaysMagicPacket'));
    assert.ok(src.includes('onEndDeviceAnnounce'));
    assert.ok(!src.includes('setCapabilityValue(') || src.includes('safeSetCapabilityValue'));
  });

  it('fingerprint DB + misattribution registry lock the couple', () => {
    const db = read('lib/DeviceFingerprintDB.js');
    assert.ok(db.includes("_TZ3000_qaaysllp|TS0201"));
    assert.ok(db.includes('lcdtemphumidluxsensor'));
    assert.ok(db.includes('virtual EP2') || db.includes('TuyaMagicPacket'));
    const reg = JSON.parse(read('data/user-misattribution-registry.json'));
    const hit = (reg.cases || []).find((c) => c.id === 'p2264-qaaysllp-neo-th02b');
    assert.ok(hit);
    assert.strictEqual(hit.canonicalDriver, 'lcdtemphumidluxsensor');
    assert.ok((hit.productId || []).includes('TS0201'));
    assert.ok((hit.forbiddenDrivers || []).includes('climate_sensor'));
  });
});
