'use strict';
const assert = require('assert');
const F = require('../lib/compensation/FirmwareLimitCompensation');

function dev(settings = {}, caps = ['alarm_battery']) {
  const store = {}; const values = {}; const set = new Set(caps);
  return {
    store, values, caps: set, homey: { setInterval: () => ({ unref() {} }), clearInterval() {} },
    getSetting: (k) => settings[k], getStoreValue: (k) => store[k],
    setStoreValue: async (k, v) => { store[k] = v; },
    hasCapability: (c) => set.has(c), addCapability: async (c) => { set.add(c); }, removeCapability: async (c) => { set.delete(c); delete values[c]; },
    setCapabilityValue: async (c, v) => { values[c] = v; }, getCapabilityValue: (c) => values[c], log() {},
  };
}
const tick = () => new Promise((r) => setImmediate(r));
const attach = (d) => F.attach(d, { mfr: '_TZE200_rxq4iti9', pid: 'TS0601' });

describe('P3108 TRV06 optional estimated battery (t657u)', () => {
  it('setting OFF (default): nothing changes, estimate stays in store only', async () => {
    const d = dev(); const c = attach(d);
    c.onAlarmBattery(true); await tick();
    assert.ok(!d.caps.has('measure_battery'));
    assert.strictEqual(d.store.fwlimit_measure_battery_estimate.origin, 'estimated');
  });
  it('setting ON: measure_battery added from the estimate, flagged as ours', async () => {
    const d = dev({ fwlimit_show_estimated_battery: true }); const c = attach(d);
    c.onAlarmBattery(true); await tick();
    assert.strictEqual(d.values.measure_battery, 15);
    assert.strictEqual(d.store.fwlimit_measure_battery_shown, true);
    c.onAlarmBattery(false); await tick();
    assert.strictEqual(d.values.measure_battery, 80);
  });
  it('a real battery DP wins and disables the estimate for good', async () => {
    const d = dev({ fwlimit_show_estimated_battery: true }); const c = attach(d);
    c.onAlarmBattery(true); await tick();
    c.handleDp(15); d.values.measure_battery = 63;
    c.onAlarmBattery(true); await tick();
    assert.strictEqual(d.values.measure_battery, 63);
    assert.strictEqual(d.store.fwlimit_measure_battery_shown, null);
    assert.strictEqual(await c.onShowEstimatedBatteryChanged(false), false, 'real-owned capability is never removed');
    assert.ok(d.caps.has('measure_battery'));
  });
  it('toggle ON then OFF removes only the capability we added', async () => {
    const s = {}; const d = dev(s); const c = attach(d);
    s.fwlimit_show_estimated_battery = true;
    await c.onShowEstimatedBatteryChanged(true);
    assert.strictEqual(d.values.measure_battery, 80);
    s.fwlimit_show_estimated_battery = false;
    await c.onShowEstimatedBatteryChanged(false);
    assert.ok(!d.caps.has('measure_battery'));
  });
  it('never touches a device whose existing measure_battery is not ours', async () => {
    const d = dev({ fwlimit_show_estimated_battery: true }, ['alarm_battery', 'measure_battery']); const c = attach(d);
    c.onAlarmBattery(true); await tick();
    assert.strictEqual(d.values.measure_battery, undefined);
  });
  it('setting declared, default OFF, on the radiator valve driver', () => {
    const j = require('../drivers/device_radiator_valve/driver.compose.json');
    const s = j.settings.find((x) => x.id === F.SHOW_SETTING);
    assert.ok(s && s.type === 'checkbox' && s.value === false && s.label.fr);
  });
});
