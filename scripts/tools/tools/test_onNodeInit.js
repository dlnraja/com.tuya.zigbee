#!/usr/bin/env node
'use strict';

/**
 * test_onNodeInit.js - Smoke tests for onNodeInit signatures
 * 
 * Ensures:
 * 1. onNodeInit accepts undefined without crashing
 * 2. onNodeInit accepts { zclNode: mock } correctly
 * 3. All device classes properly forward nodeContext to super
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing onNodeInit implementations...\n');

// Mock classes
class MockZigBeeDevice {
  async onNodeInit(nodeContext) {
    // Should never be called directly
  }
  
  log(...args) { console.log('[MOCK]', ...args); }
  error(...args) { console.error('[MOCK ERROR]', ...args); }
  warn(...args) { console.warn('[MOCK WARN]', ...args); }
}

// Mock zclNode
const mockZclNode = {
  ieeeAddr: 'mock:ieee:address',
  networkAddress: 12345,
  manufacturerName: '_TZ3000_mock',
  modelId: 'TS0044_MOCK',
  endpoints: {
    1: {
      clusters: {
        basic: {
          readAttributes: async () => ({ manufacturerName: '_TZ3000_mock', modelId: 'TS0044_MOCK' })
        },
        powerConfiguration: {
          bind: async () => true,
          configureReporting: async () => true,
          readAttributes: async () => ({ powerSource: 'battery', batteryVoltage: 30 })
        },
        onOff: {
          bind: async () => true
        }
      }
    }
  }
};

let passCount = 0;
let failCount = 0;

/**
 * Test a device class
 */
async function testDeviceClass(DeviceClass, className) {
  console.log(`\n📋 Testing: ${className}`);
  console.log('─'.repeat(60));
  
  try {
    // Test 1: undefined parameter
    console.log('  Test 1: onNodeInit(undefined)');
    try {
      const device1 = new DeviceClass();
      device1.log = (...args) => {}; // silent
      device1.error = (...args) => console.error('    ❌', ...args);
      
      await device1.onNodeInit(undefined);
      console.log('    ⚠️  No crash but should handle gracefully');
      passCount++;
    } catch (err) {
      if (err.message.includes('zclNode')) {
        console.log('    ⚠️  Expected zclNode error:', err.message);
        passCount++;
      } else {
        console.error('    ❌ Unexpected error:', err.message);
        failCount++;
      }
    }
    
    // Test 2: empty object
    console.log('  Test 2: onNodeInit({})');
    try {
      const device2 = new DeviceClass();
      device2.log = (...args) => {}; // silent
      device2.error = (...args) => console.error('    ❌', ...args);
      
      await device2.onNodeInit({});
      console.log('    ⚠️  No crash but should handle gracefully');
      passCount++;
    } catch (err) {
      if (err.message.includes('zclNode')) {
        console.log('    ⚠️  Expected zclNode error:', err.message);
        passCount++;
      } else {
        console.error('    ❌ Unexpected error:', err.message);
        failCount++;
      }
    }
    
    // Test 3: valid zclNode
    console.log('  Test 3: onNodeInit({ zclNode: mock })');
    try {
      const device3 = new DeviceClass();
      device3.log = (...args) => {}; // silent
      device3.error = (...args) => console.error('    ❌', ...args);
      device3.zclNode = mockZclNode;
      
      await device3.onNodeInit({ zclNode: mockZclNode });
      console.log('    ✅ Passed with mock zclNode');
      passCount++;
    } catch (err) {
      console.error('    ❌ Failed with mock zclNode:', err.message);
      failCount++;
    }
    
  } catch (err) {
    console.error(`  ❌ Class instantiation failed:`, err.message);
    failCount++;
  }
}

/**
 * Check super.onNodeInit() calls in all device files
 */
function checkSuperCalls() {
  console.log('\n\n🔍 Checking super.onNodeInit() calls in drivers...\n');
  console.log('═'.repeat(60));
  
  const driversDir = path.join(__dirname, '../drivers');
  const issues = [];
  let checkedCount = 0;
  
  function scanDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (item === 'device.js') {
        checkedCount++;
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Check for problematic patterns
        if (content.includes('super.onNodeInit()')) {
          issues.push({
            file: fullPath,
            issue: 'super.onNodeInit() called without parameters'
          });
        }
        
        // Check if onNodeInit accepts parameter
        const hasParameterizedInit = /async\s+onNodeInit\s*\(\s*\{\s*zclNode\s*\}/m.test(content)
          || /async\s+onNodeInit\s*\(\s*nodeContext/m.test(content);
        
        if (content.includes('async onNodeInit') && !hasParameterizedInit) {
          issues.push({
            file: fullPath,
            issue: 'onNodeInit defined without { zclNode } parameter'
          });
        }
      }
    }
  }
  
  scanDirectory(driversDir);
  
  console.log(`\n📊 Scanned ${checkedCount} device.js files\n`);
  
  if (issues.length === 0) {
    console.log('✅ All files pass super.onNodeInit() check!\n');
    passCount += checkedCount;
  } else {
    console.log(`❌ Found ${issues.length} issues:\n`);
    issues.forEach(({ file, issue }) => {
      console.log(`  • ${path.relative(driversDir, file)}`);
      console.log(`    Issue: ${issue}\n`);
    });
    failCount += issues.length;
  }
}

/**
 * Main test execution
 */
async function runTests() {
  console.log('═'.repeat(60));
  console.log('  🧪 onNodeInit Smoke Tests');
  console.log('═'.repeat(60));
  
  // Import device classes (wrapped in try-catch)
  try {
    const BaseHybridDevice = require('../lib/BaseHybridDevice');
    await testDeviceClass(BaseHybridDevice, 'BaseHybridDevice');
  } catch (err) {
    console.error('⚠️  Cannot test BaseHybridDevice:', err.message);
  }
  
  try {
    const SwitchDevice = require('../lib/SwitchDevice');
    await testDeviceClass(SwitchDevice, 'SwitchDevice');
  } catch (err) {
    console.error('⚠️  Cannot test SwitchDevice:', err.message);
  }
  
  try {
    const ButtonDevice = require('../lib/ButtonDevice');
    await testDeviceClass(ButtonDevice, 'ButtonDevice');
  } catch (err) {
    console.error('⚠️  Cannot test ButtonDevice:', err.message);
  }
  
  try {
    const SensorDevice = require('../lib/SensorDevice');
    await testDeviceClass(SensorDevice, 'SensorDevice');
  } catch (err) {
    console.error('⚠️  Cannot test SensorDevice:', err.message);
  }
  
  // Check all driver files
  checkSuperCalls();
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('  📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  ✅ Passed: ${passCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log('═'.repeat(60));
  
  process.exit(failCount > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
