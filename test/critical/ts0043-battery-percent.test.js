'use strict';

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const assert = require('assert');
const Module = require('module');

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'zigbee-clusters') {
    return { CLUSTER: { POWER_CONFIGURATION: 'powerConfiguration' } };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const UnifiedBatteryHandler = require('../../lib/battery/UnifiedBatteryHandler');
const {
  normalizeBatteryPercent,
  ingestBatterySample,
  attachMultiProtocolBattery,
} = require('../../lib/battery/MultiProtocolBatteryPercent');
const { normalizeZclBatteryVoltagePercent } = require('../../lib/battery/zcl-percent');
const { attach } = require('../../lib/battery/ZclBatteryMonitor');
const BatteryRouter = require('../../lib/helpers/BatteryRouter');

Module._load = originalLoad;

function fakeButton(overrides = {}) {
  const values = {};
  const store = {};
  const settings = {
    zb_manufacturer_name: '_TZ3000_a7ouggvs',
    zb_model_id: 'TS0043',
    ...overrides.settings,
  };
  return {
    values,
    store,
    settings,
    _destroyed: false,
    mainsPowered: false,
    driver: {
      id: 'button_wireless_3',
      manifest: { class: 'button', energy: { batteries: ['CR2032', 'CR2450'] } },
    },
    getSetting: key => settings[key],
    getSettings: () => settings,
    getStore: () => store,
    getStoreValue: key => store[key],
    setStoreValue: async (key, value) => { store[key] = value; },
    hasCapability: cap => cap === 'measure_battery',
    getCapabilityValue: cap => values[cap] ?? null,
    setCapabilityValue: async (cap, value) => { values[cap] = value; },
    safeSetCapabilityValue: async (cap, value) => { values[cap] = value; },
    getEnergy: () => ({ batteries: ['CR2032', 'CR2450'] }),
    log: () => {},
    ...overrides,
  };
}

describe('TS0043 / Zemismart 3-button battery percent (P218)', function() {
  it('maps Zemismart 3-button mfrs to CR2032 ZCL with 200=100%', function() {
    for (const mfr of ['_TZ3000_a7ouggvs', '_tz3000_qzjcsmar', '_TZ3000_bczr4e10', '_TZ3000_tzvbimpq', '_TZ3000_wkai4ga5']) {
      const profile = UnifiedBatteryHandler.lookupBatteryProfile(mfr, 'TS0043');
      assert.ok(profile, `${mfr} must resolve`);
      assert.strictEqual(profile.chemistry, 'CR2032');
      assert.strictEqual(profile.source === 'manufacturer' || profile.algorithm === 'cr2032_curve', true);
      assert.strictEqual(profile.zcl200IsPercent, true);
    }
  });

  it('falls back to TS0043 productId profile when mfr is unknown', function() {
    const profile = UnifiedBatteryHandler.lookupBatteryProfile('_TZ3000_unknownxyz', 'TS0043');
    assert.strictEqual(profile.chemistry, 'CR2032');
    assert.strictEqual(profile.algorithm, 'cr2032_curve');
    assert.strictEqual(profile.zcl200IsPercent, true);
    assert.strictEqual(profile.source, 'zcl');
  });

  it('normalizes ZCL 0-200, 0-100, sentinels for Zemismart', function() {
    const mfr = '_TZ3000_a7ouggvs';
    assert.strictEqual(normalizeBatteryPercent(200, { protocol: 'zcl', manufacturer: mfr }), 100);
    assert.strictEqual(normalizeBatteryPercent(100, { protocol: 'zcl', manufacturer: mfr }), 100);
    assert.strictEqual(normalizeBatteryPercent(180, { protocol: 'zcl', manufacturer: mfr }), 90);
    assert.strictEqual(normalizeBatteryPercent(40, { protocol: 'zcl', manufacturer: mfr }), 40);
    assert.strictEqual(normalizeBatteryPercent(255, { protocol: 'zcl', manufacturer: mfr }), null);
    assert.strictEqual(normalizeBatteryPercent(0xFFFF, { protocol: 'zcl', manufacturer: mfr }), null);
  });

  it('does not double a genuine 40% report (0-50 scale is curated only)', function() {
    assert.strictEqual(
      UnifiedBatteryHandler.normalizeZigbeeValue(40, { manufacturer: '_TZ3000_a7ouggvs' }),
      40
    );
    assert.strictEqual(
      UnifiedBatteryHandler.normalizeZigbeeValue(40, { manufacturer: '_TZE200_vvmbj46n' }),
      80
    );
  });

  it('maps ZCL voltage 30 (3.0V) and 3000mV via CR2032 curve, not /10 millivolt bug', function() {
    const fromSpec = normalizeZclBatteryVoltagePercent(30, { batteryType: 'CR2032' });
    const fromMv = normalizeZclBatteryVoltagePercent(3000, { batteryType: 'CR2032' });
    assert.ok(fromSpec >= 90 && fromSpec <= 100, `30 (3.0V) → ${fromSpec}`);
    assert.strictEqual(fromSpec, fromMv);
    // The old /10 millivolt path turned 3000 into 300V and clamped 100%.
    assert.ok(fromMv < 100, `3.0V CR2032 is ~95% on the curve, not a clamped 100% (got ${fromMv})`);
  });

  it('never uses the banned linear (V-2.5)/0.5 formula', function() {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../../lib/battery/UnifiedBatteryHandler.js'), 'utf8');
    const code = src.split('\n').filter((line) => {
      const t = line.trim();
      return t && !t.startsWith('*') && !t.startsWith('//') && !t.startsWith('⚠️');
    }).join('\n');
    assert.ok(!/\(voltage\s*-\s*2\.5\)\s*\/\s*0\.5/.test(code));
  });

  it('ingests ZCL percent then refuses a weaker voltage overwrite', async function() {
    const device = fakeButton();
    attachMultiProtocolBattery(device);
    const first = await ingestBatterySample(device, 180, { protocol: 'zcl' });
    assert.strictEqual(first.ok, true);
    assert.strictEqual(first.percent, 90);
    assert.strictEqual(device.values.measure_battery, 90);

    const second = await ingestBatterySample(device, 30, { protocol: 'voltage' });
    assert.strictEqual(second.ok, false);
    assert.strictEqual(second.reason, 'prefer-percent');
    assert.strictEqual(device.values.measure_battery, 90);
  });

  it('maps Tuya DP3 enum and DP15 percent on hybrid leftover EF00', function() {
    assert.strictEqual(normalizeBatteryPercent(0, { protocol: 'tuya-dp', dp: 3 }), 10);
    assert.strictEqual(normalizeBatteryPercent(1, { protocol: 'tuya-dp', dp: 3 }), 50);
    assert.strictEqual(normalizeBatteryPercent(2, { protocol: 'tuya-dp', dp: 3 }), 100);
    assert.strictEqual(normalizeBatteryPercent(88, { protocol: 'tuya-dp', dp: 15 }), 88);
    assert.strictEqual(normalizeBatteryPercent(176, { protocol: 'tuya-dp', dp: 15 }), 88);
  });

  it('routes TS0043 leftover EF00 to ZCL, not Tuya DP', async function() {
    const device = fakeButton({
      zclNode: {
        endpoints: {
          1: {
            clusters: {
              powerConfiguration: { on: () => {} },
              tuya: { on: () => {} },
            },
          },
        },
      },
    });
    const info = await BatteryRouter.resolveBatterySource(device);
    assert.strictEqual(info.source, BatteryRouter.BatterySource.ZCL);
  });

  it('attaches ZclBatteryMonitor only once', function() {
    const listeners = [];
    const cluster = {
      on: (ev, fn) => { listeners.push(ev); },
    };
    const device = fakeButton({
      zclNode: { endpoints: { 1: { clusters: { powerConfiguration: cluster } } } },
      _ownsBatteryHandling: true,
    });
    const a = attach(device, device.zclNode);
    const b = attach(device, device.zclNode);
    assert.strictEqual(a, true);
    assert.strictEqual(b, true);
    assert.strictEqual(listeners.length, 2);
    assert.ok(listeners.includes('attr.batteryPercentageRemaining'));
    assert.ok(listeners.includes('attr.batteryVoltage'));
  });
});
