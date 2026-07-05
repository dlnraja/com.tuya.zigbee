'use strict';

const assert = require('assert');
const UnifiedBatteryHandler = require('../../lib/battery/UnifiedBatteryHandler');

describe('unified battery cascade', function() {
  it('keeps the merged Tuya battery DP matrix explicit and conflict-aware', function() {
    const dps = UnifiedBatteryHandler.getTuyaBatteryDPs();

    for (const dp of [3, 4, 10, 14, 15, 21, 100, 101, 102, 104, 105, 121]) {
      assert(dps.includes(dp), `DP${dp} must stay in the common battery cascade`);
    }

    assert(!dps.includes(2), 'DP2 must remain profile-only because it often carries humidity/position');
    assert(!dps.includes(7), 'DP7 must remain profile-only because it often carries luminance/valve battery');
    assert(UnifiedBatteryHandler.getTuyaBatteryDPs({ includeProfileOnly: true }).includes(2));
    assert.deepStrictEqual(UnifiedBatteryHandler.getTuyaVoltageDPs(), [33, 35, 247]);
  });

  it('normalizes ZCL 0-200 values without losing sentinel handling', function() {
    assert.strictEqual(UnifiedBatteryHandler.normalizeZigbeeValue(200), 100);
    assert.strictEqual(UnifiedBatteryHandler.normalizeZigbeeValue(200, { treat200AsSentinel: true }), null);
    assert.strictEqual(UnifiedBatteryHandler.normalizeZigbeeValue(150), 75);
    assert.strictEqual(UnifiedBatteryHandler.normalizeZigbeeValue(255), null);
    assert.strictEqual(UnifiedBatteryHandler.normalizeZigbeeValue(0xFFFF), null);
  });

  it('normalizes Tuya DP percent, enum, boolean-low, profile-only, and voltage forms', function() {
    assert.strictEqual(UnifiedBatteryHandler.normalizeTuyaBatteryValue(14, 0), 10);
    assert.strictEqual(UnifiedBatteryHandler.normalizeTuyaBatteryValue(14, 1), 50);
    assert.strictEqual(UnifiedBatteryHandler.normalizeTuyaBatteryValue(14, 2), 100);
    assert.strictEqual(UnifiedBatteryHandler.normalizeTuyaBatteryValue(14, true, { stateMode: 'low_bool' }), 10);
    assert.strictEqual(UnifiedBatteryHandler.normalizeTuyaBatteryValue(14, false, { stateMode: 'low_bool' }), 100);
    assert.strictEqual(UnifiedBatteryHandler.normalizeTuyaBatteryValue(15, 200), 100);
    assert.strictEqual(UnifiedBatteryHandler.normalizeTuyaBatteryValue(121, 88), 88);
    assert.strictEqual(UnifiedBatteryHandler.normalizeTuyaBatteryValue(102, 1), null);
    assert.strictEqual(UnifiedBatteryHandler.normalizeTuyaBatteryValue(2, 77), null);
    assert.strictEqual(
      UnifiedBatteryHandler.normalizeTuyaBatteryValue(2, 77, { profile: { dpId: 2, algorithm: 'direct' } }),
      77
    );
    const voltagePercent = UnifiedBatteryHandler.normalizeTuyaBatteryValue(33, 3000);
    assert(voltagePercent >= 90 && voltagePercent <= 100, `3.0V should resolve near full battery, got ${voltagePercent}`);
  });

  it('accepts historical voltage formats used by ZCL and Tuya DP devices', function() {
    assert.strictEqual(UnifiedBatteryHandler.normalizeVoltage(3000), 3);
    assert.strictEqual(UnifiedBatteryHandler.normalizeVoltage(1500), 1.5);
    assert.strictEqual(UnifiedBatteryHandler.normalizeVoltage(300), 3);
    assert.strictEqual(UnifiedBatteryHandler.normalizeVoltage(30), 3);
    assert.strictEqual(UnifiedBatteryHandler.normalizeVoltage(20), 2);
    assert.strictEqual(UnifiedBatteryHandler.normalizeVoltage(3), 3);
  });

  it('restores old app store keys before falling back to estimates', async function() {
    const values = {};
    const store = {
      batteryPercent: '84',
      battery_voltage_mv: 3000,
    };
    const device = {
      getStoreValue: key => store[key],
      getCapabilityValue: () => null,
      hasCapability: cap => cap === 'measure_battery',
      setCapabilityValue: async (cap, value) => {
        values[cap] = value;
      },
      log: () => {},
      error: () => {},
    };
    const handler = new UnifiedBatteryHandler(device);

    await handler._restoreStoredBattery();

    assert.strictEqual(values.measure_battery, 84);
    assert.strictEqual(handler.lastValue, 84);
    assert.strictEqual(handler.lastVoltage, 3);
  });

  it('uses a marked 50 percent estimate when no real battery value exists yet', function() {
    const values = {};
    const store = {};
    const device = {
      getStoreValue: key => store[key],
      setStoreValue: async (key, value) => {
        store[key] = value;
      },
      getCapabilityValue: () => null,
      hasCapability: cap => cap === 'measure_battery',
      setCapabilityValue: async (cap, value) => {
        values[cap] = value;
      },
      emit: () => {},
      log: () => {},
      error: () => {},
    };
    const handler = new UnifiedBatteryHandler(device);

    handler._setDefaultBattery();

    assert.strictEqual(values.measure_battery, 50);
    assert.strictEqual(store.last_battery_estimated, true);
    assert.strictEqual(store.last_battery_source, 'estimated-default');
  });
});
