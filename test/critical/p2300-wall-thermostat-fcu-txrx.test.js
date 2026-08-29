'use strict';

/**
 * P2300 — issue #532 FCU TX/RX dead + discussion #100 pressure band contact
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

describe('P2300 wall_thermostat FCU TX/RX + contact pressure band', function () {
  it('wall_thermostat calls super.onNodeInit (DeviceIO/EF00 attach)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/wall_thermostat/device.js'), 'utf8');
    assert.ok(/await\s+super\.onNodeInit\s*\(/.test(src), 'must await super.onNodeInit');
    assert.ok(src.includes('_attachTuyaRx'), 'EF00 RX attach helper');
    assert.ok(src.includes('_queryFcuState'), 'FCU DP query after pair');
    assert.ok(src.includes('requestDP') || src.includes('queryAllDPs'), 'DeviceIO query path');
    assert.ok(src.includes('_onZigbeeIdentityResolved'), 'late MFR-ENSURE FCU re-arm');
    assert.ok(/mpbki2zm/i.test(src), 'FCU couple mpbki2zm');
  });

  it('helpers getDataValue handles Buffer / nested Buffer', () => {
    const { getDataValue } = require(path.join(ROOT, 'drivers/wall_thermostat/helpers.js'));
    assert.strictEqual(getDataValue({ datatype: 1, data: Buffer.from([1]) }), true);
    assert.strictEqual(getDataValue({ datatype: 2, data: Buffer.from([0, 0, 0, 0xdc]) }), 220);
    assert.strictEqual(
      getDataValue({ datatype: 2, data: { type: 'Buffer', data: [0, 0, 0, 0xfa] } }),
      250,
    );
    assert.strictEqual(getDataValue({ datatype: 4, data: [2] }), 2);
    assert.strictEqual(getDataValue({ value: 19 }), 19);
  });

  it('contact_sensor locks _TZ3000_pjb1ua0m + TS0203 (discussion #100)', () => {
    const compose = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/contact_sensor/driver.compose.json'), 'utf8'),
    );
    const mfrs = compose.zigbee.manufacturerName || [];
    assert.ok(mfrs.some((m) => /pjb1ua0m/i.test(m)), 'pjb1ua0m in contact_sensor');
    assert.ok((compose.zigbee.productId || []).includes('TS0203'), 'TS0203 productId');
  });

  it('registry has P2300 contact + FCU notes', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const ids = (reg.cases || []).map((c) => c.id);
    assert.ok(ids.includes('p2300-tz3000_pjb1ua0m-contact-ts0203'));
    const fcu = (reg.cases || []).find((c) => c.id === 'p2234b-tze204_mpbki2zm');
    assert.ok(fcu && /P2300/i.test(JSON.stringify(fcu)), 'FCU case mentions P2300');
  });

  it('sacred-keep pins FCU + pressure-band couples', () => {
    const keep = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'), 'utf8'),
    );
    const key = (c) => `${String(c.mfr).toLowerCase()}|${String(c.pid).toUpperCase()}|${c.driverId}`;
    const set = new Set((keep.couples || []).map(key));
    assert.ok(set.has('_tze204_mpbki2zm|TS0601|wall_thermostat'), 'FCU sacred keep');
    assert.ok(set.has('_tz3000_pjb1ua0m|TS0203|contact_sensor'), 'pressure band sacred keep');
  });

  it('doorwindowsensor_3 no longer steals pjb1ua0m (publish collision)', () => {
    const door = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/doorwindowsensor_3/driver.compose.json'), 'utf8'),
    );
    assert.ok(
      !(door.zigbee.manufacturerName || []).some((m) => /pjb1ua0m/i.test(m)),
      'pjb1ua0m must leave doorwindowsensor_3',
    );
  });
});
