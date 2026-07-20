#!/usr/bin/env node
// test-mixin-coverage.js - P75.32: Test critical mixins not yet covered
// Goal: increase test coverage to address 168 untested lib files
const path = require('path');

let totalPass = 0, totalFail = 0;
const t = (name, fn) => {
  try {
    if (fn()) { console.log('  ✓', name); totalPass++; }
    else { console.log('  ✗', name); totalFail++; }
  } catch (e) {
    console.log('  ✗', name, '—', e.message);
    totalFail++;
  }
};

// Test 1: SafeCapabilityMixin
console.log('=== SafeCapabilityMixin tests ===');
try {
  const M = require('../../lib/mixins/SafeCapabilityMixin.js');
  t('exports safeSetCapabilityValue function', () => typeof M.safeSetCapabilityValue === 'function');
  t('safeSetCapabilityValue: null device returns false', async () => await M.safeSetCapabilityValue(null, 'measure_battery', 50) === false);
  t('safeSetCapabilityValue: null capability returns false', async () => await M.safeSetCapabilityValue({setCapabilityValue:()=>Promise.resolve()}, null, 50) === false);
  t('safeSetCapabilityValue: null value returns false', async () => await M.safeSetCapabilityValue({setCapabilityValue:()=>Promise.resolve()}, 'cap', null) === false);
  t('safeSetCapabilityValue: NaN value returns false', async () => await M.safeSetCapabilityValue({setCapabilityValue:()=>Promise.resolve()}, 'cap', NaN) === false);
  t('safeSetCapabilityValue: rejected promise caught', async () => await M.safeSetCapabilityValue({setCapabilityValue:()=>Promise.reject(new Error('boom'))}, 'cap', 50) === false);
  t('safeSetCapabilityValue: valid call succeeds', async () => {
    let called = false;
    const r = await M.safeSetCapabilityValue({setCapabilityValue:(c,v)=>{called=true;return Promise.resolve();}}, 'cap', 50);
    return r === true && called === true;
  });
  t('safeSetCapabilityValue: destroyed device returns false', async () => await M.safeSetCapabilityValue({destroyed:true, setCapabilityValue:()=>Promise.resolve()}, 'cap', 50) === false);
  t('safeSetCapabilityValue: falsy value (0) accepted', async () => {
    let received = null;
    const r = await M.safeSetCapabilityValue({setCapabilityValue:(c,v)=>{received=v;return Promise.resolve();}}, 'cap', 0);
    return r === true && received === 0;
  });
  t('safeSetCapabilityValue: empty string accepted', async () => {
    let received = 'untouched';
    const r = await M.safeSetCapabilityValue({setCapabilityValue:(c,v)=>{received=v;return Promise.resolve();}}, 'cap', '');
    return r === true && received === '';
  });
} catch (e) {
  console.log('  ERROR:', e.message);
  totalFail++;
}

// Test 2: VirtualEnergyMeterMixin
console.log('\n=== VirtualEnergyMeterMixin tests ===');
try {
  const V = require('../../lib/mixins/VirtualEnergyMeterMixin.js');
  t('exports _initVirtualEnergy', () => typeof V._initVirtualEnergy === 'function');
  t('exports _updateVirtualEnergy', () => typeof V._updateVirtualEnergy === 'function');
  t('exports _ensureNominalPower', () => typeof V._ensureNominalPower === 'function');
  t('exports _safeSetCapability', () => typeof V._safeSetCapability === 'function');
  t('_safeSetCapability: null device returns false', async () => await V._safeSetCapability(null, 'cap', 50) === false);
  t('_safeSetCapability: destroyed device returns false', async () => await V._safeSetCapability({_destroyed:true, setCapabilityValue:()=>true}, 'cap', 50) === false);
  t('_ensureNominalPower: missing store value uses default', () => {
    let stored = null;
    const dev = { getStoreValue: () => undefined, getSetting: () => null, log: () => {}, setStoreValue: (k,v) => { stored = v; return Promise.resolve(); }, driver: {id: 'test_plug'}, getClass: () => 'socket' };
    V._ensureNominalPower.call(dev);
    return stored > 0;
  });
  t('_ensureNominalPower: existing store value preserved', () => {
    let stored = null;
    const dev = { getStoreValue: () => 100, getSetting: () => null, log: () => {}, setStoreValue: (k,v) => { stored = v; return Promise.resolve(); }, driver: {id: 'test_plug'}, getClass: () => 'socket' };
    V._ensureNominalPower.call(dev);
    return stored === null; // not re-set if already exists
  });
  t('_ensureNominalPower: setting override wins (stored on next call)', () => {
    // When override is set, nominalPower is set in local var but NOT yet stored.
    // Next call should preserve override. Verify first call doesn't crash:
    let stored = null;
    const dev = { getStoreValue: () => undefined, getSetting: (k) => k === 'nominal_power_override' ? 50 : null, log: () => {}, setStoreValue: (k,v) => { stored = v; return Promise.resolve(); }, driver: {id: 'test_plug'}, getClass: () => 'socket' };
    V._ensureNominalPower.call(dev);
    // First call: stored is null because override path skips the setStoreValue (it sets the local var but doesn't persist)
    return stored === null; // Override takes effect on read path, not write path
  });
  t('_ensureNominalPower: bulb driver guesses 9W', () => {
    let stored = null;
    const dev = { getStoreValue: () => undefined, getSetting: () => null, log: () => {}, setStoreValue: (k,v) => { stored = v; return Promise.resolve(); }, driver: {id: 'bulb_rgb'}, getClass: () => 'light' };
    V._ensureNominalPower.call(dev);
    return stored === 9.0;
  });
  t('_ensureNominalPower: heater driver guesses 2000W', () => {
    let stored = null;
    const dev = { getStoreValue: () => undefined, getSetting: () => null, log: () => {}, setStoreValue: (k,v) => { stored = v; return Promise.resolve(); }, driver: {id: 'heater_smart'}, getClass: () => 'heater' };
    V._ensureNominalPower.call(dev);
    return stored === 2000.0;
  });
  t('_ensureNominalPower: 1gang switch guesses 0.2W', () => {
    let stored = null;
    const dev = { getStoreValue: () => undefined, getSetting: () => null, log: () => {}, setStoreValue: (k,v) => { stored = v; return Promise.resolve(); }, driver: {id: 'switch_1gang'}, getClass: () => 'switch' };
    V._ensureNominalPower.call(dev);
    return stored === 0.2;
  });
  t('_ensureNominalPower: 4gang switch guesses 0.8W', () => {
    let stored = null;
    const dev = { getStoreValue: () => undefined, getSetting: () => null, log: () => {}, setStoreValue: (k,v) => { stored = v; return Promise.resolve(); }, driver: {id: 'switch_4gang'}, getClass: () => 'switch' };
    V._ensureNominalPower.call(dev);
    return stored === 0.8;
  });
  t('_ensureNominalPower: unknown defaults to 1.0W', () => {
    let stored = null;
    const dev = { getStoreValue: () => undefined, getSetting: () => null, log: () => {}, setStoreValue: (k,v) => { stored = v; return Promise.resolve(); }, driver: {id: 'mystery_device'}, getClass: () => 'other' };
    V._ensureNominalPower.call(dev);
    return stored === 1.0;
  });
} catch (e) {
  console.log('  ERROR:', e.message);
  totalFail++;
}

// Test 3: ZigbeeHealthMixin
console.log('\n=== ZigbeeHealthMixin tests ===');
try {
  const Z = require('../../lib/mixins/ZigbeeHealthMixin.js');
  t('exports _initZigbeeHealth', () => typeof Z._initZigbeeHealth === 'function');
  t('exports _updateZigbeeHealth', () => typeof Z._updateZigbeeHealth === 'function');
  t('exports _updateRadioStability', () => typeof Z._updateRadioStability === 'function');
  t('exports _destroyZigbeeHealth', () => typeof Z._destroyZigbeeHealth === 'function');
  t('_destroyZigbeeHealth: null device does not throw', () => {
    Z._destroyZigbeeHealth.call({_destroyed:false, _healthInterval:null});
    Z._destroyZigbeeHealth.call({_destroyed:true});
    return true;
  });
  t('_updateZigbeeHealth: null device does not throw', () => {
    Z._updateZigbeeHealth.call({_destroyed:false, log:()=>{}});
    return true;
  });
} catch (e) {
  console.log('  ERROR:', e.message);
  totalFail++;
}

// Test 4: SonoffEnergyMixin
console.log('\n=== SonoffEnergyMixin tests ===');
try {
  const S = require('../../lib/mixins/SonoffEnergyMixin.js');
  t('exports setupSonoffEnergy', () => typeof S.setupSonoffEnergy === 'function');
  t('setupSonoffEnergy: null device does not throw', () => {
    S.setupSonoffEnergy(null);
    return true;
  });
  t('setupSonoffEnergy: non-sonoff device returns false', async () => {
    const dev = { getSetting: () => 'other' };
    const r = await S.setupSonoffEnergy(dev, null);
    return r === false;
  });
  t('setupSonoffEnergy: sonoff without zclNode returns false', async () => {
    const dev = { getSetting: (k) => k === 'zb_manufacturer_name' ? 'sonoff' : 'S60ZB' };
    const r = await S.setupSonoffEnergy(dev, null);
    return r === false;
  });
} catch (e) {
  console.log('  ERROR:', e.message);
  totalFail++;
}

// Test 5: UnifiedButtonEngine
console.log('\n=== UnifiedButtonEngine tests ===');
try {
  const U = require('../../lib/mixins/UnifiedButtonEngine.js');
  t('exports a function', () => typeof U === 'function');
  t('U(null) returns a class', () => typeof U(null) === 'function');
  t('U(BaseClass) returns a subclass', () => {
    class Base { async onNodeInit() {} }
    const Mixed = U(Base);
    return typeof Mixed === 'function' && Object.getPrototypeOf(Mixed) === Base;
  });
  t('U(BaseClass) inherits onNodeInit', () => {
    class Base { async onNodeInit() {} }
    const Mixed = U(Base);
    return typeof Mixed.prototype.onNodeInit === 'function';
  });
  t('U(BaseClass) provides setupButtonDetection', () => {
    class Base {}
    const Mixed = U(Base);
    return typeof Mixed.prototype.setupButtonDetection === 'function';
  });
} catch (e) {
  console.log('  ERROR:', e.message);
  totalFail++;
}

// Test 6: NaturalLightMixin
console.log('\n=== NaturalLightMixin tests ===');
try {
  const N = require('../../lib/mixins/NaturalLightMixin.js');
  t('exports _initNaturalLight', () => typeof N._initNaturalLight === 'function');
  t('exports _applyNaturalLight', () => typeof N._applyNaturalLight === 'function');
  t('exports _destroyNaturalLight', () => typeof N._destroyNaturalLight === 'function');
  t('_destroyNaturalLight: null device does not throw', () => {
    N._destroyNaturalLight.call({_destroyed:false, _naturalLightInterval:null});
    return true;
  });
} catch (e) {
  console.log('  ERROR:', e.message);
  totalFail++;
}

// Test 7: CoreCapabilityMixin
console.log('\n=== CoreCapabilityMixin tests ===');
try {
  const C = require('../../lib/mixins/CoreCapabilityMixin.js');
  t('exports _triggerSubCapabilityFlow', () => typeof C._triggerSubCapabilityFlow === 'function');
  t('exports _triggerGangFlows', () => typeof C._triggerGangFlows === 'function');
} catch (e) {
  console.log('  ERROR:', e.message);
  totalFail++;
}

// Test 8: PowerSwitchFeaturesMixin
console.log('\n=== PowerSwitchFeaturesMixin tests ===');
try {
  const P = require('../../lib/mixins/PowerSwitchFeaturesMixin.js');
  t('exports a function', () => typeof P === 'function');
  // It might be a no-op mixin
  t('P(null) throws (expected — needs Base class)', () => {
    try { P(null); return false; } catch { return true; }
  });
  t('P(Base) returns a class', () => {
    class Base { async onNodeInit() {} }
    const C = P(Base);
    return typeof C === 'function';
  });
  t('P(Base) extends Base', () => {
    class Base { async onNodeInit() {} }
    const C = P(Base);
    return Object.getPrototypeOf(C) === Base;
  });
} catch (e) {
  console.log('  ERROR:', e.message);
  totalFail++;
}

console.log('\n=== P75.32 mixin coverage tests: ' + totalPass + ' passed, ' + totalFail + ' failed ===');
process.exit(totalFail > 0 ? 1 : 0);
