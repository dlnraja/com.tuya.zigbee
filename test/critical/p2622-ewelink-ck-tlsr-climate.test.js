'use strict';

/**
 * P2622 — eWeLink CK-TLSR8656-SS5-01(7014) Contre quoi
 * Homey interview paired as virtualdriverzigbee socket because climate_sensor
 * had the pid without manufacturerName eWeLink. Lock sacred couple + family.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const PID_TH = 'CK-TLSR8656-SS5-01(7014)';
const PID_TH2 = 'CK-TLSR8656-SS5-02(7014)';
const EWELINK_RE = /ewelink/i;

function loadCompose(driverId) {
  return JSON.parse(fs.readFileSync(
    path.join(ROOT, 'drivers', driverId, 'driver.compose.json'),
    'utf8',
  ));
}

function hasCouple(compose, pid) {
  const mfrs = compose.zigbee?.manufacturerName || [];
  const pids = compose.zigbee?.productId || [];
  return mfrs.some((m) => EWELINK_RE.test(String(m))) && pids.includes(pid);
}

describe('P2622 eWeLink CK-TLSR climate sacred couple', () => {
  it('climate_sensor locks eWeLink + CK-TLSR8656-SS5-01(7014) (and SS5-02 sibling)', () => {
    const c = loadCompose('climate_sensor');
    assert.equal(c.class, 'sensor');
    assert.ok(hasCouple(c, PID_TH), 'must match interview mfr+pid (not virtual socket)');
    assert.ok(hasCouple(c, PID_TH2), 'SS5-02(7014) sibling TH');
    for (const cap of ['measure_temperature', 'measure_humidity', 'measure_battery']) {
      assert.ok((c.capabilities || []).includes(cap), `missing ${cap}`);
    }
    const clusters = c.zigbee?.endpoints?.['1']?.clusters || [];
    for (const need of [0, 1, 1026, 1029]) {
      assert.ok(clusters.map(Number).includes(need), `cluster ${need} required for ZCL TH`);
    }
  });

  it('family siblings lock eWeLink on correct drivers only (Z2M #8855)', () => {
    assert.ok(hasCouple(loadCompose('button_wireless'), 'CK-TLSR8656-SS5-01(7000)'));
    assert.ok(hasCouple(loadCompose('motion_sensor'), 'CK-TLSR8656-SS5-01(7002)'));
    assert.ok(hasCouple(loadCompose('contact_sensor'), 'CK-TLSR8656-SS5-01(7003)'));
    assert.ok(hasCouple(loadCompose('water_leak_sensor'), 'CK-TLSR8656-SS5-01(7019)'));
  });

  it('misattribution forbids socket/plug/curtain for eWeLink+7014 couple', () => {
    const reg = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'data/user-misattribution-registry.json'),
      'utf8',
    ));
    const entry = (reg.cases || []).find((c) => c && c.id === 'p2622-ewelink-ck-tlsr-th-not-virtual-socket');
    assert.ok(entry, 'registry case p2622 required');
    assert.equal(entry.canonicalDriver, 'climate_sensor');
    assert.equal(entry.forbidMode, 'couple');
    assert.ok((entry.productId || []).includes(PID_TH));
    assert.ok((entry.forbiddenDrivers || []).includes('device_plug_smart'));
    assert.ok((entry.forbiddenDrivers || []).includes('button_wireless_plug'));
  });

  it('device.js logs eWeLink couple (Contre quoi virtual-socket mispair)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/climate_sensor/device.js'),
      'utf8',
    );
    assert.ok(src.includes('CLIMATE-EWELINK'));
    assert.ok(src.includes('CK-TLSR8656'));
    assert.ok(src.includes('zb_product_id') || src.includes('zb_model_id'));
  });

  it('npm check:p2622 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2622']);
  });
});
