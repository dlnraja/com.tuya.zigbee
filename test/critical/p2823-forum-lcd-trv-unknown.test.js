'use strict';

/**
 * P2823 — Forum T140352 latest Contre quoi
 * #2263 Kizabgd: _TZE284_9ern5sfh+TS0601 must live on lcdtemphumidsensor
 *         (LCD add-flow), not climate_sensor → Unknown Zigbee
 * #2261/#2253 TRV: DP36 time sync uses structured datapoint (no bare args)
 * #2261 fl8cuafl stays device_radiator_valve + sacred-keep
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function compose(id) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
}

function hasMfr(id, needle) {
  const n = String(needle).toLowerCase();
  return (compose(id).zigbee?.manufacturerName || []).some((m) => String(m).toLowerCase() === n);
}

function hasPid(id, pid) {
  return (compose(id).zigbee?.productId || []).some((p) => String(p).toUpperCase() === String(pid).toUpperCase());
}

describe('P2823 forum LCD + TRV unknown harden', () => {
  it('9ern5sfh+TS0601 on lcdtemphumidsensor, not climate_sensor (#2263)', () => {
    assert.equal(hasMfr('lcdtemphumidsensor', '_TZE284_9ern5sfh'), true);
    assert.equal(hasPid('lcdtemphumidsensor', 'TS0601'), true);
    assert.equal(hasMfr('climate_sensor', '_TZE284_9ern5sfh'), false);
    assert.equal(hasMfr('climate_sensor', '_TZE200_9ern5sfh'), false);
  });

  it('sacred-keep pins 9ern5sfh → lcdtemphumidsensor', () => {
    const sk = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'), 'utf8'),
    );
    const hit = (sk.couples || []).find(
      (c) => /9ern5sfh/i.test(c.mfr) && c.driverId === 'lcdtemphumidsensor' && String(c.pid).toUpperCase() === 'TS0601',
    );
    assert.ok(hit, 'missing sacred-keep for 9ern5sfh LCD');
  });

  it('fl8cuafl+TS0601 stays device_radiator_valve (#2261)', () => {
    assert.equal(hasMfr('device_radiator_valve', '_TZE200_fl8cuafl'), true);
    assert.equal(hasPid('device_radiator_valve', 'TS0601'), true);
  });

  it('TRV DP36 time sync uses sendStructuredDatapoint (P2823b)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/device_radiator_valve/device.js'), 'utf8');
    assert.ok(src.includes('sendStructuredDatapoint(tuyaCluster, 36'));
    assert.ok(!/datapoint\(\{\s*dp:\s*36,\s*datatype:\s*4,\s*data:\s*payload\s*\}\)/.test(src));
  });

  it('AOYAN AY-303Z + meter91 lux couples remain locked', () => {
    assert.equal(hasMfr('soil_sensor', 'AOYAN'), true);
    assert.equal(hasPid('soil_sensor', 'AY-303Z'), true);
    assert.equal(hasMfr('illuminance_sensor', '_TZ3000_7y90pany'), true);
    assert.equal(hasPid('illuminance_sensor', 'ZG-106Z'), true);
  });
});
