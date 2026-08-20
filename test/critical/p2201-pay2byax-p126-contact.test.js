'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { lookup } = require(path.join(ROOT, 'lib/DeviceFingerprintDB.js'));

describe('P2201 pay2byax contact + P126 no TS0601 on contact_sensor', () => {
  it('contact_sensor must not list productId TS0601', () => {
    const compose = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/contact_sensor/driver.compose.json'), 'utf8')
    );
    assert.ok(!(compose.zigbee.productId || []).includes('TS0601'));
  });

  it('contact_sensor_zigbee owns pay2byax + TS0601 only', () => {
    const compose = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/contact_sensor_zigbee/driver.compose.json'), 'utf8')
    );
    const mfrs = compose.zigbee.manufacturerName || [];
    assert.ok(mfrs.some((m) => String(m).toLowerCase() === '_tze200_pay2byax'));
    assert.ok(mfrs.some((m) => String(m).toLowerCase() === '_tze204_pay2byax'));
    assert.ok((compose.zigbee.productId || []).includes('TS0601'));
    assert.ok(mfrs.every((m) => /pay2byax/i.test(m)), 'TS0601 path must stay pay2byax-only');
  });

  it('DeviceFingerprintDB routes pay2byax|TS0601 to contact_sensor_zigbee', () => {
    assert.equal(lookup('_TZE200_pay2byax', 'TS0601').driver, 'contact_sensor_zigbee');
    assert.equal(lookup('_TZE204_pay2byax', 'TS0601').driver, 'contact_sensor_zigbee');
  });
});
