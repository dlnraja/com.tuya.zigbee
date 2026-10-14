'use strict';

/**
 * Contre quoi (forum #2262): `_TZE284_gnpflcoq`+TS0601 4in1 mmWave must stay on
 * `motion_sensor_radar_mmwave` (P2270/P2271) — never presence_sensor_radar / climate.
 * Sources: ZHA#5252/#5286 + T140352 #2262 Istvan Mag screenshot.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function readCompose(driverId) {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, 'drivers', driverId, 'driver.compose.json'), 'utf8'),
  );
}

function hasCouple(compose, mfrRe, pidRe = /^ts0601$/i) {
  const mfr = (compose.zigbee.manufacturerName || []).map(String);
  const pid = (compose.zigbee.productId || []).map(String);
  return mfr.some((m) => mfrRe.test(m)) && pid.some((p) => pidRe.test(p));
}

describe('P2812 gnpflcoq 4in1 → motion_sensor_radar_mmwave', () => {
  it('locks couple on motion_sensor_radar_mmwave including TZE200/204 siblings', () => {
    const compose = readCompose('motion_sensor_radar_mmwave');
    assert.ok(hasCouple(compose, /_TZE284_gnpflcoq/i), 'TZE284 gnpflcoq missing');
    assert.ok(hasCouple(compose, /_TZE200_gnpflcoq/i), 'TZE200 sibling missing');
    assert.ok(hasCouple(compose, /_TZE204_gnpflcoq/i), 'TZE204 sibling missing');
  });

  it('forbids couple on presence_sensor_radar compose', () => {
    const compose = readCompose('presence_sensor_radar');
    const mfr = (compose.zigbee.manufacturerName || []).map(String);
    assert.ok(!mfr.some((m) => /gnpflcoq/i.test(m)), 'gnpflcoq must not be on presence_sensor_radar');
  });

  it('device.js keeps P2271 inverted DP1 + climate DP soft-create for gnpflcoq', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers', 'motion_sensor_radar_mmwave', 'device.js'),
      'utf8',
    );
    assert.match(src, /gnpflcoq/i);
    assert.match(src, /P2271/);
    assert.match(src, /inverted|0=occupied|AlarmPolarity/i);
  });

  it('registry canonical driver is motion_sensor_radar_mmwave', () => {
    const reg = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'data', 'user-misattribution-registry.json'), 'utf8'),
    );
    const entry = (reg.cases || []).find((e) => e.id === 'p2270-gnpflcoq-4in1-mmwave');
    assert.ok(entry, 'registry case missing');
    assert.equal(entry.canonicalDriver, 'motion_sensor_radar_mmwave');
    assert.ok(
      (entry.forbiddenDrivers || []).includes('presence_sensor_radar'),
      'presence must stay forbidden',
    );
  });

  it('P2817 compose does not require ZCL clusters EF00 MCU lacks', () => {
    const compose = readCompose('motion_sensor_radar_mmwave');
    const clusters = (compose.zigbee.endpoints['1'].clusters || []).map(Number);
    assert.deepEqual(clusters.filter((c) => c !== 0 && c !== 61184).sort(), []);
    assert.ok(clusters.includes(0));
  });
});

