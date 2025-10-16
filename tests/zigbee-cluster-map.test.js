/**
 * TESTS UNITAIRES - ZIGBEE CLUSTER MAP
 * 
 * Run with: node tests/zigbee-cluster-map.test.js
 */

const ClusterMap = require('../lib/zigbee-cluster-map');

// Test utilities
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

function assertEquals(actual, expected, message) {
  if (actual === expected) {
    console.log(`✅ PASS: ${message} (${actual})`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    console.error(`   Expected: ${expected}`);
    console.error(`   Actual: ${actual}`);
    failed++;
  }
}

console.log('\n=== ZIGBEE CLUSTER MAP TESTS ===\n');

// ============================================
// TEST 1: get() method
// ============================================
console.log('TEST 1: get() method');

assertEquals(ClusterMap.get('POWER_CONFIGURATION'), 1, 'POWER_CONFIGURATION');
assertEquals(ClusterMap.get('ON_OFF'), 6, 'ON_OFF');
assertEquals(ClusterMap.get('TEMPERATURE_MEASUREMENT'), 1026, 'TEMPERATURE_MEASUREMENT');
assertEquals(ClusterMap.get('IAS_ZONE'), 1280, 'IAS_ZONE');
assertEquals(ClusterMap.get('TUYA_PROPRIETARY'), 61184, 'TUYA_PROPRIETARY');

// Case insensitive
assertEquals(ClusterMap.get('power_configuration'), 1, 'lowercase power_configuration');
assertEquals(ClusterMap.get('PowerConfiguration'), 1, 'PascalCase PowerConfiguration');

// Aliases
assertEquals(ClusterMap.get('genPowerCfg'), 1, 'genPowerCfg alias');
assertEquals(ClusterMap.get('genOnOff'), 6, 'genOnOff alias');
assertEquals(ClusterMap.get('msTemperatureMeasurement'), 1026, 'msTemperatureMeasurement alias');

// Number passthrough
assertEquals(ClusterMap.get(1), 1, 'Number passthrough 1');
assertEquals(ClusterMap.get(1026), 1026, 'Number passthrough 1026');

// Unknown cluster
assertEquals(ClusterMap.get('UNKNOWN_CLUSTER'), null, 'Unknown cluster returns null');

// ============================================
// TEST 2: resolve() method
// ============================================
console.log('\nTEST 2: resolve() method');

// String
assertEquals(ClusterMap.resolve('POWER_CONFIGURATION'), 1, 'resolve() with string');

// Number
assertEquals(ClusterMap.resolve(1026), 1026, 'resolve() with number');

// Object with ID property
assertEquals(ClusterMap.resolve({ ID: 1280 }), 1280, 'resolve() with CLUSTER object');

// null/undefined
assertEquals(ClusterMap.resolve(null), null, 'resolve() with null');
assertEquals(ClusterMap.resolve(undefined), null, 'resolve() with undefined');

// Unknown
assertEquals(ClusterMap.resolve('FAKE'), null, 'resolve() with unknown string');

// ============================================
// TEST 3: safeGet() method
// ============================================
console.log('\nTEST 3: safeGet() method');

assertEquals(ClusterMap.safeGet('ON_OFF', 999), 6, 'safeGet() with valid cluster');
assertEquals(ClusterMap.safeGet('UNKNOWN', 999), 999, 'safeGet() with fallback');
assertEquals(ClusterMap.safeGet(null, 0), 0, 'safeGet() null with fallback');
assertEquals(ClusterMap.safeGet(1026, 999), 1026, 'safeGet() with number');

// ============================================
// TEST 4: getName() method
// ============================================
console.log('\nTEST 4: getName() method');

assertEquals(ClusterMap.getName(0), 'BASIC', 'getName(0)');
assertEquals(ClusterMap.getName(1), 'POWER_CONFIGURATION', 'getName(1)');
assertEquals(ClusterMap.getName(1026), 'TEMPERATURE_MEASUREMENT', 'getName(1026)');
assertEquals(ClusterMap.getName(1280), 'IAS_ZONE', 'getName(1280)');
assertEquals(ClusterMap.getName(61184), 'TUYA_PROPRIETARY', 'getName(61184)');
assertEquals(ClusterMap.getName(99999), null, 'getName() unknown ID');

// ============================================
// TEST 5: has() method
// ============================================
console.log('\nTEST 5: has() method');

assert(ClusterMap.has('POWER_CONFIGURATION'), 'has() POWER_CONFIGURATION');
assert(ClusterMap.has('ON_OFF'), 'has() ON_OFF');
assert(ClusterMap.has(1), 'has() with number 1');
assert(ClusterMap.has(1026), 'has() with number 1026');
assert(!ClusterMap.has('FAKE_CLUSTER'), 'has() returns false for unknown');
assert(!ClusterMap.has(99999), 'has() returns false for unknown number');

// ============================================
// TEST 6: Direct property access
// ============================================
console.log('\nTEST 6: Direct property access');

assertEquals(ClusterMap.BASIC, 0, 'ClusterMap.BASIC');
assertEquals(ClusterMap.POWER_CONFIGURATION, 1, 'ClusterMap.POWER_CONFIGURATION');
assertEquals(ClusterMap.ON_OFF, 6, 'ClusterMap.ON_OFF');
assertEquals(ClusterMap.LEVEL_CONTROL, 8, 'ClusterMap.LEVEL_CONTROL');
assertEquals(ClusterMap.TEMPERATURE_MEASUREMENT, 1026, 'ClusterMap.TEMPERATURE_MEASUREMENT');
assertEquals(ClusterMap.RELATIVE_HUMIDITY, 1029, 'ClusterMap.RELATIVE_HUMIDITY');
assertEquals(ClusterMap.IAS_ZONE, 1280, 'ClusterMap.IAS_ZONE');
assertEquals(ClusterMap.TUYA_PROPRIETARY, 61184, 'ClusterMap.TUYA_PROPRIETARY');

// ============================================
// TEST 7: CLUSTER_IDS export
// ============================================
console.log('\nTEST 7: CLUSTER_IDS export');

assert(ClusterMap.CLUSTER_IDS, 'CLUSTER_IDS is exported');
assertEquals(ClusterMap.CLUSTER_IDS.POWER_CONFIGURATION, 1, 'CLUSTER_IDS.POWER_CONFIGURATION');
assertEquals(ClusterMap.CLUSTER_IDS.ON_OFF, 6, 'CLUSTER_IDS.ON_OFF');

// ============================================
// TEST 8: CLUSTER_NAMES export
// ============================================
console.log('\nTEST 8: CLUSTER_NAMES export');

assert(ClusterMap.CLUSTER_NAMES, 'CLUSTER_NAMES is exported');
assertEquals(ClusterMap.CLUSTER_NAMES[1], 'POWER_CONFIGURATION', 'CLUSTER_NAMES[1]');
assertEquals(ClusterMap.CLUSTER_NAMES[6], 'ON_OFF', 'CLUSTER_NAMES[6]');

// ============================================
// TEST 9: getAll() method
// ============================================
console.log('\nTEST 9: getAll() method');

const allClusters = ClusterMap.getAll();
assert(allClusters, 'getAll() returns object');
assert(Object.keys(allClusters).length > 50, 'getAll() returns many clusters');
assertEquals(allClusters.POWER_CONFIGURATION, 1, 'getAll() contains POWER_CONFIGURATION');

// ============================================
// TEST 10: Special characters handling
// ============================================
console.log('\nTEST 10: Special characters handling');

assertEquals(ClusterMap.get('CLUSTER.POWER_CONFIGURATION'), 1, 'Handles CLUSTER. prefix');
assertEquals(ClusterMap.get('CLUSTER_POWER_CONFIGURATION'), 1, 'Handles CLUSTER_ prefix');

// ============================================
// TEST 11: Real-world use cases
// ============================================
console.log('\nTEST 11: Real-world use cases');

// Simulate registerCapability usage
function testRegisterCapability(capability, clusterIdentifier) {
  const clusterId = ClusterMap.resolve(clusterIdentifier);
  return clusterId !== null && typeof clusterId === 'number' && !isNaN(clusterId);
}

assert(testRegisterCapability('measure_battery', 'POWER_CONFIGURATION'), 'registerCapability with string');
assert(testRegisterCapability('measure_battery', 1), 'registerCapability with number');
assert(testRegisterCapability('measure_battery', { ID: 1 }), 'registerCapability with CLUSTER object');
assert(!testRegisterCapability('measure_battery', 'UNKNOWN'), 'registerCapability rejects unknown');

// ============================================
// TEST 12: Performance test
// ============================================
console.log('\nTEST 12: Performance test');

const start = Date.now();
for (let i = 0; i < 10000; i++) {
  ClusterMap.get('POWER_CONFIGURATION');
  ClusterMap.get('ON_OFF');
  ClusterMap.get('TEMPERATURE_MEASUREMENT');
  ClusterMap.resolve(1026);
  ClusterMap.safeGet('IAS_ZONE', 0);
}
const duration = Date.now() - start;

assert(duration < 1000, `Performance test (${duration}ms for 50k operations)`);

// ============================================
// RESULTS
// ============================================
console.log('\n=== TEST RESULTS ===');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total: ${passed + failed}`);

if (failed === 0) {
  console.log('\n🎉 ALL TESTS PASSED! 🎉\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failed} TEST(S) FAILED\n`);
  process.exit(1);
}
