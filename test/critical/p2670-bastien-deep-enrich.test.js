'use strict';

/**
 * P2670 — Bastien deep coverage Contre quoi
 * Max variants/caps/settings for live mesh couples (complementary only).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function compose(id) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
}

describe('P2670 Bastien deep enrich coverage', () => {
  it('HOBEIAN ZG-301Z + WHD02 variants + countdown_seconds setting', () => {
    const c = compose('switch_1gang');
    const pids = c.zigbee.productId || [];
    assert.ok(pids.some((p) => /^ZG-301Z$/i.test(p)));
    assert.ok(pids.some((p) => /^WHD02$/i.test(p)));
    const settings = JSON.stringify(c.settings || []);
    assert.ok(settings.includes('countdown_seconds'));
    assert.ok(settings.includes('switch_mode'));
    assert.ok(settings.includes('hobeian_mesh_calm'));
  });

  it('firmwareUpdates OTA mfr exact-match zigbee.manufacturerName (Homey validate)', () => {
    const c = compose('switch_1gang');
    const mfr = c.zigbee.manufacturerName || [];
    for (const u of (c.firmwareUpdates && c.firmwareUpdates.updates) || []) {
      for (const n of (u.device && u.device.manufacturerName) || []) {
        assert.ok(mfr.includes(n), `missing exact OTA mfr ${n}`);
      }
    }
  });

  it('Hobeian countdown is ZCL not EF00', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/HobeianZg301zHeal.js'), 'utf8');
    assert.ok(src.includes('setHobeianCountdown'));
    assert.ok(src.includes('onWithTimedOff'));
    assert.ok(src.includes('switchTypeToCode'));
    const dev = fs.readFileSync(path.join(ROOT, 'drivers/switch_1gang/device.js'), 'utf8');
    assert.ok(dev.includes('setHobeianCountdown'));
    assert.ok(dev.includes('async setCountdown'));
  });

  it('switch_4gang unions electrical caps + ltt60asa siblings', () => {
    const c = compose('switch_4gang');
    const caps = c.capabilities || [];
    for (const cap of ['measure_power', 'meter_power', 'measure_voltage', 'measure_current', 'onoff.gang4']) {
      assert.ok(caps.includes(cap), `missing ${cap}`);
    }
    const mfr = c.zigbee.manufacturerName || [];
    assert.ok(mfr.some((m) => /ltt60asa/i.test(m)));
    assert.ok(mfr.some((m) => /mmkbptmx/i.test(m)));
  });

  it('climate + buttons gain alarm_battery and Bastien pids', () => {
    const climate = compose('climate_sensor');
    assert.ok((climate.capabilities || []).includes('alarm_battery'));
    assert.ok((climate.zigbee.productId || []).includes('SNZB-02'));
    assert.ok((climate.zigbee.productId || []).some((p) => /7014/.test(p)));

    for (const id of ['button_wireless_1', 'button_wireless_2', 'button_wireless_3']) {
      const c = compose(id);
      assert.ok((c.capabilities || []).includes('alarm_battery'), id);
      assert.ok((c.capabilities || []).includes('measure_battery'), id);
    }
  });

  it('flow cards set_switch_type + clear_countdown declared', () => {
    const flow = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/switch_1gang/driver.flow.compose.json'),
      'utf8',
    ));
    const ids = (flow.actions || []).map((a) => a.id);
    assert.ok(ids.includes('switch_1gang_set_switch_type'));
    assert.ok(ids.includes('switch_1gang_clear_countdown'));
    assert.ok(ids.includes('switch_1gang_set_countdown'));
  });

  it('mfs has WHD02 under HOBEIAN', () => {
    const mfs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mfs_db.json'), 'utf8'));
    const h = mfs.HOBEIAN || mfs.Hobeian;
    assert.ok(h);
    assert.ok((h.modelIds || []).some((p) => /^WHD02$/i.test(p) || /^ZG-301Z$/i.test(p)));
  });

  it('npm check:p2670 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2670']);
  });
});
