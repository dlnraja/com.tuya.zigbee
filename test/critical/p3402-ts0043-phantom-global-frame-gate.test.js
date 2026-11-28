'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

describe('P3402 TS0043 phantom ZCL Global / idle battery / climate_sensor conditions gate', () => {
  it('WallSceneRemoteHybridInit blocks ZCL Global frames and never uses d.includes(0xFD)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/WallSceneRemoteHybridInit.js'), 'utf8');
    assert.ok(!src.includes('d.includes(0xFD)'), 'd.includes(0xFD) fires phantom triggers when TSN===253');
    assert.ok(src.includes('!hdr.clusterSpecific'), '0x0006 raw path must reject ZCL Global frames');
    assert.ok(src.includes('!e000Hdr.clusterSpecific'), '0xE000 raw path must reject ZCL Global frames');
  });

  it('ButtonE000RawInterceptor rejects phantom endpoints and ZCL Global frames', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/utils/ButtonE000RawInterceptor.js'), 'utf8');
    assert.ok(src.includes('Number(epId) > max'), 'must reject phantom endpoints beyond maxButton');
    assert.ok(src.includes('!hdr.clusterSpecific'), 'must reject ZCL Global frames on E000');
  });

  it('ButtonDevice debounces same-ms (===0) callbacks, enforces APS retry floor, and skips idle wake magic TX', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.ok(src.includes('timeSinceLastButton >= 0'), 'must debounce 0ms parallel-listener collisions');
    assert.ok(src.includes('apsRetryFloorMs'), 'must enforce APS retry floor on single presses');
    assert.ok(src.includes('skipIdleMagic'), 'must skip forced magic-packet TX on sleepy idle wake');
  });

  it('PhysicalButtonMixin skips repeat magic packet on sleepy CR2032 restart', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.ok(src.includes('magic_packet_sent'), 'must persist magic_packet_sent to avoid restart drain');
  });

  it('ClimateSensorDriver registers all 5 condition run listeners', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/climate_sensor/driver.js'), 'utf8');
    for (const id of [
      'climate_sensor_temperature_above',
      'climate_sensor_temperature_below',
      'climate_sensor_humidity_above',
      'climate_sensor_humidity_below',
      'climate_sensor_battery_voltage_below',
    ]) {
      assert.ok(src.includes(id), `missing condition listener: ${id}`);
    }
  });

  it('runtime: ButtonE000RawInterceptor drops ZCL Global ReportAttributes and phantom EP4', async () => {
    const { installE000RawInterceptor } = require('../../lib/utils/ButtonE000RawInterceptor');
    const triggered = [];
    const device = {
      log: () => {},
      triggerButtonPress: async (btn, pt) => { triggered.push({ btn, pt }); },
    };
    const zclNode = { handleFrame: async () => 'ok' };
    installE000RawInterceptor(device, zclNode, { maxButton: 3, tag: 'p3402-test' });

    await zclNode.handleFrame(1, 0xE000, { data: Buffer.from([0x18, 0xFD, 0x0A, 0x01]) }, {});
    await zclNode.handleFrame(4, 0xE000, { data: Buffer.from([0x01, 0x02, 0xFD, 0x00]) }, {});
    assert.deepStrictEqual(triggered, [], 'ZCL Global and EP4 frames must never trigger button presses');

    await zclNode.handleFrame(1, 0xE000, { data: Buffer.from([0x01, 0x05, 0xFD, 0x00]) }, {});
    assert.equal(triggered.length, 1, 'genuine cluster-specific press on EP1 must still trigger');
    assert.equal(triggered[0].btn, 1);
  });

  it('bastien-anon-learnings SSOT records all P3402 guards', () => {
    const ssot = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/ci/bastien-anon-learnings.json'), 'utf8'));
    const ids = new Set(ssot.items.map((x) => x.id));
    assert.ok(ids.has('ts0043-phantom-global-frames'));
    assert.ok(ids.has('climate-sensor-condition-listeners'));
    assert.ok(ids.has('ts0043-idle-magic-packet-zero-tx'));
  });
});
