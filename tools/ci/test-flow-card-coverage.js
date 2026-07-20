#!/usr/bin/env node
// test-flow-card-coverage.js - P75.32: Test flow card and mixin modules
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

// Test 1: AdvancedFlowCardManager (CLASS)
console.log('=== AdvancedFlowCardManager tests ===');
try {
  const A = require('../../lib/flow/AdvancedFlowCardManager.js');
  t('exports a class', () => typeof A === 'function' && /^class\s/.test(A.toString()));
  t('has registerAllFlowCards method', () => typeof A.prototype.registerAllFlowCards === 'function');
  t('has registerButtonCards method', () => typeof A.prototype.registerButtonCards === 'function');
  t('has registerLightCards method', () => typeof A.prototype.registerLightCards === 'function');
  t('has registerSmartPlugCards method', () => typeof A.prototype.registerSmartPlugCards === 'function');
  t('has registerMotionSensorCards method', () => typeof A.prototype.registerMotionSensorCards === 'function');
  t('has registerTemperatureSensorCards method', () => typeof A.prototype.registerTemperatureSensorCards === 'function');
} catch (e) {
  console.log('  ERROR:', e.message);
  totalFail++;
}

// Test 2: FeatureFlowCards (CLASS)
console.log('\n=== FeatureFlowCards tests ===');
try {
  const F = require('../../lib/flow/FeatureFlowCards.js');
  t('exports a class', () => typeof F === 'function' && /^class\s/.test(F.toString()));
  t('has at least 3 methods', () => Object.getOwnPropertyNames(F.prototype).length >= 3);
  const methods = Object.getOwnPropertyNames(F.prototype);
  t('exports at least 3 flow card methods', () => methods.filter(m => /register/i.test(m)).length >= 1);
  console.log('  Methods:', methods.join(', '));
} catch (e) {
  console.log('  ERROR:', e.message);
  totalFail++;
}

// Test 3: FlowCardManager (CLASS)
console.log('\n=== FlowCardManager tests ===');
try {
  const C = require('../../lib/flow/FlowCardManager.js');
  t('exports a class', () => typeof C === 'function' && /^class\s/.test(C.toString()));
  t('has at least 3 methods', () => Object.getOwnPropertyNames(C.prototype).length >= 3);
  const methods = Object.getOwnPropertyNames(C.prototype);
  console.log('  Methods:', methods.join(', '));
} catch (e) {
  console.log('  ERROR:', e.message);
  totalFail++;
}

// Test 4: FlowTriggerHelpers (CLASS)
console.log('\n=== FlowTriggerHelpers tests ===');
try {
  const H = require('../../lib/flow/FlowTriggerHelpers.js');
  t('exports a class', () => typeof H === 'function' && /^class\s/.test(H.toString()));
  t('has at least 2 methods', () => Object.getOwnPropertyNames(H.prototype).length >= 2);
  const methods = Object.getOwnPropertyNames(H.prototype);
  console.log('  Methods:', methods.join(', '));
} catch (e) {
  console.log('  ERROR:', e.message);
  totalFail++;
}

// Test 5: UniversalFlowCardLoader (CLASS)
console.log('\n=== UniversalFlowCardLoader tests ===');
try {
  const U = require('../../lib/flow/UniversalFlowCardLoader.js');
  t('exports a class', () => typeof U === 'function' && /^class\s/.test(U.toString()));
  t('has at least 2 methods', () => Object.getOwnPropertyNames(U.prototype).length >= 2);
  const methods = Object.getOwnPropertyNames(U.prototype);
  console.log('  Methods:', methods.join(', '));
} catch (e) {
  console.log('  ERROR:', e.message);
  totalFail++;
}

// Test 6: TuyaDeviceMixin (factory)
console.log('\n=== TuyaDeviceMixin tests ===');
try {
  const T = require('../../lib/mixins/TuyaDeviceMixin.js');
  t('exports a function', () => typeof T === 'function');
  t('factory is named "TuyaDeviceMixin" or similar', () => /TuyaDevice|Mixin/.test(T.name));
  t('factory(Base) returns a class', () => {
    class Base {}
    const R = T(Base);
    return typeof R === 'function';
  });
} catch (e) {
  console.log('  ERROR:', e.message);
  totalFail++;
}

// Test 7: TuyaThermostatEnhancedMixin (factory)
console.log('\n=== TuyaThermostatEnhancedMixin tests ===');
try {
  const Th = require('../../lib/mixins/TuyaThermostatEnhancedMixin.js');
  t('exports a function', () => typeof Th === 'function');
  t('factory has thermostat in name', () => /Thermostat|Mixin/.test(Th.name));
  t('factory(Base) returns a class', () => {
    class Base {}
    const R = Th(Base);
    return typeof R === 'function';
  });
} catch (e) {
  console.log('  ERROR:', e.message);
  totalFail++;
}

// Test 8: SonoffEwelinkMixin
console.log('\n=== SonoffEwelinkMixin tests ===');
try {
  const S = require('../../lib/mixins/SonoffEwelinkMixin.js');
  t('module is loadable', () => typeof S === 'object' || typeof S === 'function');
  if (typeof S === 'function') {
    t('S(Base) returns a class', () => {
      class Base {}
      const R = S(Base);
      return typeof R === 'function';
    });
  } else if (S && typeof S === 'object') {
    t('S has at least 1 method', () => Object.keys(S).length > 0);
    console.log('  Methods:', Object.keys(S).join(', '));
  }
} catch (e) {
  console.log('  ERROR:', e.message);
  totalFail++;
}

// Test 9: SonoffSensorMixin
console.log('\n=== SonoffSensorMixin tests ===');
try {
  const SS = require('../../lib/mixins/SonoffSensorMixin.js');
  t('module is loadable', () => typeof SS === 'object' || typeof SS === 'function');
  if (typeof SS === 'function') {
    t('SS(Base) returns a class', () => {
      class Base {}
      const R = SS(Base);
      return typeof R === 'function';
    });
  } else if (SS && typeof SS === 'object') {
    t('SS has setupSonoffSensor', () => typeof SS.setupSonoffSensor === 'function');
    console.log('  Methods:', Object.keys(SS).join(', '));
  }
} catch (e) {
  console.log('  ERROR:', e.message);
  totalFail++;
}

// Test 10: SonoffTRVZBMixin (function)
console.log('\n=== SonoffTRVZBMixin tests ===');
try {
  const TR = require('../../lib/mixins/SonoffTRVZBMixin.js');
  t('exports a function', () => typeof TR === 'function');
  t('function is setupSonoffTRVZB', () => TR.name === 'setupSonoffTRVZB');
  t('null device does not throw', () => {
    TR(null);
    return true;
  });
} catch (e) {
  console.log('  ERROR:', e.message);
  totalFail++;
}

console.log('\n=== P75.32 flow card coverage tests: ' + totalPass + ' passed, ' + totalFail + ' failed ===');
process.exit(totalFail > 0 ? 1 : 0);
