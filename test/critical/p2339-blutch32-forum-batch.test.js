'use strict';

/**
 * P2339 — blutch32 forum batch (HOBEIAN ZG-303Z soil + JiriG myd45weu clusters)
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

describe('P2339 blutch32 forum fixes', () => {
  it('soil_sensor compose: myd45weu + HOBEIAN + ZG-303Z locked', () => {
    const c = loadJson('drivers/soil_sensor/driver.compose.json');
    const mfrs = (c.zigbee.manufacturerName || []).map((m) => String(m).toLowerCase());
    assert.ok(mfrs.some((m) => m.includes('myd45weu')));
    assert.ok(mfrs.some((m) => m === 'hobeian'));
    assert.ok((c.zigbee.productId || []).map((p) => String(p).toUpperCase()).includes('ZG-303Z'));
    const ep1 = c.zigbee.endpoints?.['1']?.clusters || [];
    assert.ok(ep1.includes(0) && ep1.includes(61184), 'EF00 pairing clusters');
  });

  it('contact_sensor compose: 99rpfy6 + TS0203 IAS clusters', () => {
    const c = loadJson('drivers/contact_sensor/driver.compose.json');
    const mfrs = (c.zigbee.manufacturerName || []).map((m) => String(m).toLowerCase());
    assert.ok(mfrs.some((m) => m.includes('99rpfy6')));
    assert.ok((c.zigbee.productId || []).includes('TS0203'));
    const ep1 = c.zigbee.endpoints?.['1']?.clusters || [];
    assert.ok(ep1.includes(1280), 'IAS zone cluster for TS0203');
  });

  it('power_clamp_meter: blutch32 energy meter 81yrt3lo sacred couple', () => {
    const c = loadJson('drivers/power_clamp_meter/driver.compose.json');
    const mfrs = (c.zigbee.manufacturerName || []).map((m) => String(m).toLowerCase());
    assert.ok(mfrs.some((m) => m.includes('81yrt3lo')));
    assert.ok((c.zigbee.productId || []).includes('TS0601'));
  });
});
