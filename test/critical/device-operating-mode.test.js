'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyOperatingFamily,
  applyDesiredMode,
  writeOperationMode,
  buildWritePayload,
  ATTR_ID,
} = require('../../lib/zigbee/DeviceOperatingMode');

function mockDevice(opts = {}) {
  const store = { ...(opts.store || {}) };
  const settings = { ...(opts.settings || {}) };
  return {
    driver: { id: opts.driverId || '' },
    gangCount: opts.gangCount || 1,
    hasCapability: (id) => (opts.caps || []).includes(id),
    getSetting: (k) => settings[k],
    getSettings: () => settings,
    getStoreValue: (k) => store[k],
    setStoreValue: async (k, v) => { store[k] = v; },
    getData: () => ({
      productId: opts.productId || '',
      manufacturerName: opts.mfr || '',
    }),
    log() {},
    store,
    settings,
  };
}

describe('DeviceOperatingMode', () => {
  it('TS004F writes scene/event unless the user chose dimmer', () => {
    const d = mockDevice({ productId: 'TS004F', driverId: 'button_wireless_4' });
    const f = classifyOperatingFamily(d);
    assert.equal(f.family, 'ts004f');
    assert.equal(f.writeSceneAttr, true);
  });

  it('TS0043 / Dylan Zemismart remote never writes 0x8004', () => {
    const d = mockDevice({
      productId: 'TS0043',
      mfr: '_TZ3000_a7ouggvs',
      driverId: 'button_wireless_3',
    });
    const f = classifyOperatingFamily(d);
    // Sacred mfr list classifies as ts0044-skip family (same: no 0x8004 write)
    assert.equal(f.writeSceneAttr, false);
    assert.ok(f.family === 'ts0044' || f.family === 'endpoint_remote');
  });

  it('TS0002 wall relay is switchType not scene mode', () => {
    const d = mockDevice({
      productId: 'TS0002',
      driverId: 'switch_2gang',
      gangCount: 2,
      caps: ['onoff', 'onoff.gang2'],
    });
    const f = classifyOperatingFamily(d);
    assert.equal(f.family, 'zcl_relay');
    assert.equal(f.writeSceneAttr, false);
  });

  it('TS0601 EF00 switch never writes 0x8004', () => {
    const d = mockDevice({ productId: 'TS0601', driverId: 'wall_switch_4_gang_tuya' });
    assert.equal(classifyOperatingFamily(d).family, 'tuya_dp');
    assert.equal(classifyOperatingFamily(d).writeSceneAttr, false);
  });

  it('smart knob stays in command/dimmer', () => {
    const d = mockDevice({ productId: 'TS004F', driverId: 'smart_knob', mfr: '_TZ3000_qja6nq5z' });
    const f = classifyOperatingFamily(d);
    assert.equal(f.family, 'knob');
    assert.equal(f.writeSceneAttr, false);
    assert.equal(f.defaultMode, 'dimmer');
  });

  // WHY(P2354 / T150690): Moes TS004F_1 must force event mode even if modelId lags
  it('xabckq1v Moes TS004F_1 forces event/scene write (not TS0044 skip)', () => {
    const d = mockDevice({
      productId: 'TS004F',
      mfr: '_TZ3000_xabckq1v',
      driverId: 'button_wireless_4',
    });
    const f = classifyOperatingFamily(d);
    assert.equal(f.family, 'ts004f');
    assert.equal(f.writeSceneAttr, true);
    assert.equal(f.defaultMode, 'scene');
  });

  it('xabckq1v without modelId still forces event write', () => {
    const d = mockDevice({
      mfr: '_TZ3000_xabckq1v',
      driverId: 'button_wireless_4',
    });
    const f = classifyOperatingFamily(d);
    assert.equal(f.family, 'ts004f');
    assert.equal(f.writeSceneAttr, true);
  });

  it('Nobø xffhmvhv still skips 0x8004', () => {
    const d = mockDevice({
      productId: 'TS004F',
      mfr: '_TZ3000_xffhmvhv',
      driverId: 'button_wireless_4',
    });
    const f = classifyOperatingFamily(d);
    assert.equal(f.writeSceneAttr, false);
  });

  it('button_wireless_3 with empty model still skips 0x8004', () => {
    const d = mockDevice({ driverId: 'button_wireless_3' });
    const f = classifyOperatingFamily(d);
    assert.equal(f.family, 'endpoint_remote');
    assert.equal(f.writeSceneAttr, false);
  });

  it('applyDesiredMode does not touch OnOff on TS0043', async () => {
    let wrote = false;
    const d = mockDevice({ productId: 'TS0043', driverId: 'button_wireless_3' });
    const zcl = {
      endpoints: {
        1: { clusters: { onOff: { writeAttributes: async () => { wrote = true; } } } },
      },
    };
    const r = await applyDesiredMode(d, zcl);
    assert.equal(r.skipped, 'endpoint_remote');
    assert.equal(wrote, false);
  });

  it('applyDesiredMode writes 0x8004=1 for TS004F scene', async () => {
    const writes = [];
    const d = mockDevice({
      productId: 'TS004F',
      driverId: 'button_wireless_4',
      settings: { button_mode: 'scene' },
    });
    const zcl = {
      endpoints: {
        1: {
          clusters: {
            onOff: {
              writeAttributes: async (attrs) => { writes.push(attrs); },
            },
          },
        },
      },
    };
    const r = await applyDesiredMode(d, zcl);
    assert.equal(r.ok, true);
    assert.equal(r.desired, 'scene');
    assert.equal(writes[0][0x8004] ?? writes[0].tuyaOperationMode, 1);
  });

  it('applyDesiredMode writes 0x8004=0 when user chose dimmer', async () => {
    const writes = [];
    const d = mockDevice({
      productId: 'TS004F',
      driverId: 'button_wireless_4',
      settings: { button_mode: 'dimmer' },
    });
    const zcl = {
      endpoints: {
        1: {
          clusters: {
            onOff: {
              writeAttributes: async (attrs) => { writes.push(attrs); },
            },
          },
        },
      },
    };
    const r = await applyDesiredMode(d, zcl);
    assert.equal(r.ok, true);
    assert.equal(r.desired, 'command');
    assert.equal(writes[0].tuyaOperationMode ?? writes[0][0x8004], 0);
  });

  it('Homey schema reject falls through to raw Enum8 write', async () => {
    const d = mockDevice({ productId: 'TS004F', driverId: 'button_wireless_4' });
    let raw = null;
    const zcl = {
      endpoints: {
        1: {
          clusters: {
            onOff: {
              writeAttributes: async () => {
                throw new Error('32772 is not a valid attribute');
              },
              write: async (frame) => { raw = frame; },
            },
          },
        },
      },
    };
    const r = await writeOperationMode(d, zcl, 'scene');
    assert.equal(r.ok, true);
    assert.equal(r.via, 'raw');
    assert.equal(raw.attributeId, ATTR_ID);
    assert.equal(raw.value, 1);
    assert.equal(raw.dataType, 0x30);
  });

  it('UNSUPPORTED_ATTRIBUTE is cached and not retried', async () => {
    const d = mockDevice({ productId: 'TS004F', driverId: 'button_wireless_4' });
    let n = 0;
    const zcl = {
      endpoints: {
        1: {
          clusters: {
            onOff: {
              writeAttributes: async () => {
                n += 1;
                const err = new Error('UNSUPPORTED_ATTRIBUTE');
                err.status = 0x86;
                throw err;
              },
            },
          },
        },
      },
    };
    const r1 = await writeOperationMode(d, zcl, 'scene');
    const r2 = await writeOperationMode(d, zcl, 'scene');
    assert.equal(r1.unsupported, true);
    assert.equal(r2.unsupported, true);
    assert.equal(n, 1);
    assert.equal(d.store.tuya_operation_mode_unsupported, true);
  });

  it('raw payload is attr 0x8004 + enum8 + value', () => {
    const buf = buildWritePayload(1, 0x30);
    assert.equal(buf.readUInt16LE(0), 0x8004);
    assert.equal(buf[2], 0x30);
    assert.equal(buf[3], 1);
  });
});
