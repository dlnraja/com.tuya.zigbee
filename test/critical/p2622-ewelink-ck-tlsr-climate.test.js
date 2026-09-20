'use strict';

/**
 * P2622 — eWeLink CK-TLSR8656-SS5-01(7014) Contre quoi (master BOTH)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const PID_TH = 'CK-TLSR8656-SS5-01(7014)';

function loadCompose(driverId) {
  return JSON.parse(fs.readFileSync(
    path.join(ROOT, 'drivers', driverId, 'driver.compose.json'),
    'utf8',
  ));
}

function hasCouple(compose, pid) {
  const mfrs = compose.zigbee?.manufacturerName || [];
  const pids = compose.zigbee?.productId || [];
  return mfrs.some((m) => /ewelink/i.test(String(m))) && pids.includes(pid);
}

describe('P2622 eWeLink CK-TLSR climate (master)', () => {
  it('climate_sensor locks eWeLink + CK-TLSR8656-SS5-01(7014)', () => {
    const c = loadCompose('climate_sensor');
    assert.ok(hasCouple(c, PID_TH));
    assert.ok((c.capabilities || []).includes('measure_temperature'));
    assert.ok((c.capabilities || []).includes('measure_humidity'));
    assert.ok((c.capabilities || []).includes('measure_battery'));
  });

  it('family siblings present', () => {
    assert.ok(hasCouple(loadCompose('button_wireless'), 'CK-TLSR8656-SS5-01(7000)'));
    assert.ok(hasCouple(loadCompose('motion_sensor'), 'CK-TLSR8656-SS5-01(7002)'));
    assert.ok(hasCouple(loadCompose('contact_sensor'), 'CK-TLSR8656-SS5-01(7003)'));
    assert.ok(hasCouple(loadCompose('water_leak_sensor'), 'CK-TLSR8656-SS5-01(7019)'));
  });
});
