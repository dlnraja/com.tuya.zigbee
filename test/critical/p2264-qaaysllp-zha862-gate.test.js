'use strict';

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

/**
 * P2264/P2265 — ZHA #862 + Abysim Medium Neo `_TZ3000_qaaysllp` + TS0201
 * EP1: lux/battery/0xE002 · EP2 (virtual): temp/humidity after magic 0xFFFE
 * E002 humidity max attr: 0xD00D (not upstream 0xD00C)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P2264/P2265 qaaysllp Neo TH02B Abysim/ZHA gate', function () {
  this.timeout?.(15000);

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

  it('device.js: magic packet + virtual EP2 + no EP2 configureReporting', () => {
    const src = read('drivers/lcdtemphumidluxsensor/device.js');
    assert.ok(src.includes('sendTuyaMagicPacket'));
    assert.ok(src.includes('_ensureMeasurementEndpoint'));
    assert.ok(src.includes('_sendQaaysMagicPacket'));
    assert.ok(src.includes('_scheduleMagicRetries'));
    assert.ok(src.includes('onEndDeviceAnnounce'));
    assert.ok(src.includes('UNSUPPORTED_ATTRIBUTE') || src.includes('0x86'));
    // Do not configureReporting on EP2 (Abysim: UNSUPPORTED_ATTRIBUTE)
    assert.ok(!src.includes('endpointId: 2,\n          cluster: CLUSTER.TEMPERATURE'));
    assert.ok(!src.includes('RELATIVE_HUMIDITY_MEASUREMENT,\n          attributeName'));
    assert.ok(src.includes('safeSetCapabilityValue'));
  });

  it('E002 humidity max is 0xD00D (Abysim) with legacy 0xD00C RX alias', () => {
    const cluster = read('lib/clusters/TuyaE002Cluster.js');
    assert.ok(/alarmHumidityMax:\s*\{\s*id:\s*0xD00D/.test(cluster));
    assert.ok(cluster.includes('alarmHumidityMaxLegacy') && cluster.includes('0xD00C'));
    const bound = read('lib/clusters/TuyaE002BoundCluster.js');
    assert.ok(bound.includes('0xD00D'));
    assert.ok(bound.includes('0xD00C'));
  });

  it('fingerprint DB + misattribution registry lock the couple', () => {
    const db = read('lib/DeviceFingerprintDB.js');
    assert.ok(db.includes("_TZ3000_qaaysllp|TS0201"));
    assert.ok(db.includes('lcdtemphumidluxsensor'));
    const reg = JSON.parse(read('data/user-misattribution-registry.json'));
    const hit = (reg.cases || []).find((c) => c.id === 'p2264-qaaysllp-neo-th02b');
    assert.ok(hit);
    assert.strictEqual(hit.canonicalDriver, 'lcdtemphumidluxsensor');
    assert.ok((hit.productId || []).includes('TS0201'));
    assert.ok((hit.forbiddenDrivers || []).includes('climate_sensor'));
    assert.ok((hit.sources || []).some((s) => /abysim|zha-device-handlers#862/i.test(s)));
  });
});
