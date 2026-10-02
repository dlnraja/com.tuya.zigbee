'use strict';

/**
 * P2792 — additive coverage for three identities. Existing couples stay exactly where they are
 * (_TZE200_vzekyi4c on switch_wireless, _TZ3000_pmz6mjyu / _TZ3000_mklgayek on button_wireless_2);
 * only pid variants not yet on any driver are added, and no couple may be on two drivers.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const app = JSON.parse(fs.readFileSync(path.join(__dirname, '../../app.json'), 'utf8'));

function couples(mfr) {
  const out = {};
  for (const d of app.drivers) {
    const z = d.zigbee || {};
    if (!(z.manufacturerName || []).some((m) => m.toLowerCase() === mfr)) {continue;}
    for (const p of z.productId || []) {(out[p.toUpperCase()] ||= new Set()).add(d.id);}
  }
  return out;
}

describe('P2792 additive identity coverage', () => {
  it('existing placements are untouched', () => {
    assert.deepEqual([...couples('_tze200_vzekyi4c').TS0601], ['switch_wireless']);
    assert.deepEqual([...couples('_tz3000_pmz6mjyu').TS011F], ['button_wireless_2']);
    assert.deepEqual([...couples('_tz3000_mklgayek').TS0002], ['button_wireless_2']);
  });
  it('_TZE200_vzekyi4c / TS0205 (smoke) is covered by smoke_sensor3 with four case variants', () => {
    assert.deepEqual([...couples('_tze200_vzekyi4c').TS0205], ['smoke_sensor3']);
    const z = app.drivers.find((d) => d.id === 'smoke_sensor3').zigbee;
    assert.equal(z.manufacturerName.filter((m) => m.toLowerCase() === '_tze200_vzekyi4c').length, 4);
  });
  it('no couple of these identities is on two drivers', () => {
    for (const m of ['_tze200_vzekyi4c', '_tz3000_pmz6mjyu', '_tz3000_mklgayek']) {
      for (const [pid, set] of Object.entries(couples(m))) {assert.equal(set.size, 1, `${m}/${pid}: ${[...set]}`);}
    }
  });
});

describe('P2792 in-place identity layer (per exact couple, optional)', () => {
  const L = require('../../lib/devices/InPlaceIdentityLayer');
  const { EventEmitter } = require('events');
  function fakeDevice({ mfr, pid, driverId, endpoints }) {
    const caps = new Set(['button.1']);
    const values = {};
    const listeners = {};
    return {
      caps, values, listeners,
      driver: { id: driverId },
      zclNode: { endpoints },
      getSetting: (k) => ({ zb_manufacturer_name: mfr, zb_model_id: pid }[k]),
      getData: () => ({}),
      getStoreValue: () => undefined,
      hasCapability: (c) => caps.has(c),
      addCapability: async (c) => { caps.add(c); },
      setCapabilityValue: async (c, v) => { values[c] = v; },
      registerCapabilityListener: (c, fn) => { listeners[c] = fn; },
      log: () => {},
    };
  }
  function onOffCluster() {
    const c = new EventEmitter();
    c.calls = [];
    c.setOn = async () => c.calls.push('on');
    c.setOff = async () => c.calls.push('off');
    c.readAttributes = async () => ({ onOff: true });
    return c;
  }

  it('2-gang relay on the button driver: onoff + onoff.gang2 via native On/Off, kept by strip guards', async () => {
    const ep1 = { clusters: { basic: {}, onOff: onOffCluster() } };
    const ep2 = { clusters: { onOff: onOffCluster() } };
    const d = fakeDevice({ mfr: '_TZ3000_mklgayek', pid: 'TS0002', driverId: 'button_wireless_2', endpoints: { 1: ep1, 2: ep2 } });
    const r = await L.applyInPlaceIdentityLayer(d, d.zclNode);
    assert.equal(r.applied, true);
    assert.equal(r.gangs, 2);
    assert.ok(d.caps.has('onoff') && d.caps.has('onoff.gang2'));
    await d.listeners['onoff.gang2'](false);
    assert.deepEqual(ep2.clusters.onOff.calls, ['off']);
    ep1.clusters.onOff.emit('attr.onOff', false);
    assert.equal(d.values.onoff, false);
    assert.equal(L.keepsCapability(d, 'onoff'), true);
    assert.equal(r.metering, false);
  });

  it('other couples of the same mfr keep the host behaviour (TS0042 button untouched)', async () => {
    const d = fakeDevice({ mfr: '_TZ3000_pmz6mjyu', pid: 'TS0042', driverId: 'button_wireless_2', endpoints: { 1: { clusters: { onOff: onOffCluster() } } } });
    const r = await L.applyInPlaceIdentityLayer(d, d.zclNode);
    assert.equal(r.applied, false);
    assert.ok(!d.caps.has('onoff'));
    assert.equal(L.keepsCapability(d, 'onoff'), false);
  });

  it('TS011F module adds metering only when native clusters exist', async () => {
    const em = new EventEmitter();
    const ep1 = { clusters: { onOff: onOffCluster(), electricalMeasurement: em } };
    const d = fakeDevice({ mfr: '_TZ3000_pmz6mjyu', pid: 'TS011F', driverId: 'button_wireless_2', endpoints: { 1: ep1 } });
    const r = await L.applyInPlaceIdentityLayer(d, d.zclNode);
    assert.equal(r.gangs, 1);
    assert.ok(d.caps.has('measure_power'));
    em.emit('attr.activePower', 12);
    assert.equal(d.values.measure_power, 12);
  });

  it('smoke identity on the wireless switch driver: DP overrides (DP1 0 = smoke)', async () => {
    const d = fakeDevice({ mfr: '_TZE200_vzekyi4c', pid: 'TS0601', driverId: 'switch_wireless', endpoints: { 1: { clusters: { basic: {}, tuya: {} } } } });
    const o = L.dpOverrides(d);
    assert.equal(o[1].capability, 'alarm_smoke');
    assert.equal(o[1].transform(0), true);
    assert.equal(o[1].transform(1), false);
    assert.equal(o[14].transform(0), true);
    const r = await L.applyInPlaceIdentityLayer(d, d.zclNode);
    assert.equal(r.applied, true);
    assert.ok(d.caps.has('alarm_smoke'));
    assert.equal(L.dpOverrides(fakeDevice({ mfr: '_TZE200_vzekyi4c', pid: 'TS0601', driverId: 'smoke_sensor2', endpoints: {} })), null);
  });

  it('hosts are wired and strip routines honour the layer', () => {
    const src = (p) => fs.readFileSync(path.join(__dirname, '../..', p), 'utf8');
    assert.match(src('drivers/button_wireless_2/device.js'), /applyInPlaceIdentityLayer\(this, zclNode\)/);
    assert.match(src('drivers/switch_wireless/device.js'), /InPlaceIdentityLayer\.dpOverrides\(this\)/);
    assert.equal((src('lib/devices/ButtonDevice.js').match(/_inPlaceKeeps\(this/g) || []).length, 3);
    assert.match(src('lib/devices/BaseUnifiedDevice.js'), /InPlaceIdentityLayer'\)\.keepsCapability\(this, capability\)/);
  });
});
