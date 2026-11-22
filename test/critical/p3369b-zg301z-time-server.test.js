'use strict';

/**
 * P3369b - HOBEIAN + ZG-301Z gets the passive ZCL Time server (0x000A) bound.
 * Contre quoi: Bastien DIAG-DEV (2026-11-06) shows each of the 7 relays reading genTime
 * LocalTime (zcl_unk=1/0xA/c0:0700) 4-5 times at boot with no answer; zigbee-herdsman
 * answers these reads. Exact couple only: blank pid (soft-assume) or another HOBEIAN
 * model does not bind. Binding sends nothing.
 */

require('../../tools/ci/preload-homey-stub');
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const { healHobeianZg301z, isExactHobeianZg301z } = require('../../lib/tuya/HobeianZg301zHeal');

function fake(mfr, pid) {
  const binds = [];
  const settings = { zb_manufacturer_name: mfr, zb_model_id: pid };
  return {
    binds,
    driver: { id: 'switch_1gang' },
    homey: { clock: { getTimezone: () => 'Europe/Paris' }, setTimeout: () => 0, clearTimeout() {} },
    zclNode: { endpoints: { 1: { clusters: { onOff: { writeAttributes: async () => {} } }, bindings: {}, bind(name, impl) { binds.push(name); this.bindings[name] = impl; } } } },
    getSetting: (k) => settings[k],
    setSettings: async (o) => { Object.assign(settings, o); },
    getData: () => ({}),
    getStoreValue: () => undefined,
    setStoreValue: async () => {},
    getClass: () => 'light',
    hasCapability: () => false,
    getCapabilities: () => ['onoff'],
    log() {},
    error() {},
  };
}

describe('P3369b ZG-301Z ZCL time server', function() {
  it('exact couple check', function() {
    assert.strictEqual(isExactHobeianZg301z(fake('HOBEIAN', 'ZG-301Z')), true);
    assert.strictEqual(isExactHobeianZg301z(fake('HOBEIAN', '')), false);
    assert.strictEqual(isExactHobeianZg301z(fake('HOBEIAN', 'ZG-301Z-2CH')), false);
    assert.strictEqual(isExactHobeianZg301z(fake('_TZ3000_x', 'ZG-301Z')), false);
  });

  it('heal binds the time server on the exact couple only', async function() {
    const d = fake('HOBEIAN', 'ZG-301Z');
    await healHobeianZg301z(d, d.zclNode).catch(() => {});
    assert.ok(d.binds.includes('time'), 'time bound');
    const blank = fake('HOBEIAN', '');
    await healHobeianZg301z(blank, blank.zclNode).catch(() => {});
    assert.ok(!blank.binds.includes('time'), 'soft-assumed blank pid must not bind');
  }).timeout(20000);

  it('the bound server answers LocalTime', function() {
    const d = fake('HOBEIAN', 'ZG-301Z');
    require('../../lib/zigbee/TimeServerBoundCluster').bindTimeServer(d);
    const t = d.zclNode.endpoints[1].bindings.time;
    assert.ok(Number.isFinite(Number(t.localTime)) && Number(t.localTime) > 0);
  });
});
