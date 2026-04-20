#!/usr/bin/env node
'use strict';
const DriverMappingLoader = require('../../lib/utils/DriverMappingLoader');

async function test() {
    console.log('=== Testing Driver Mapping Database ===');
    
    // Test Case 1: Known complex mapping (Air Purifier)
    const mfr = '_TZE200_7BZTMFM1';
    const pid = 'RH3052';
    const info = DriverMappingLoader.getDeviceInfo(pid, mfr);
    
    console.log(`\nTest 1: ${pid} / ${mfr}`);
    if (info) {
        console.log(`   Found: ${info.name} (Driver: ${info.driver})`);
        console.log(`  Capabilities: ${info.capabilities.join(', ')}`);
    } else {
        console.log('   Not found');
    }

    // Test Case 2: Manufacturer only
    const info2 = DriverMappingLoader.getDeviceInfo('UNKNOWN', '_TZE200_7BZTMFM1');
    console.log(`\nTest 2: UNKNOWN / ${mfr}`);
    if (info2) {
        console.log(`   Found (MFR fallback): ${info2.name} (Driver: ${info2.driver})`);
    } else {
        console.log('   Not found');
    }

    // Test Case 3: Recommended driver
    const rec = DriverMappingLoader.getRecommendedDriver(pid, mfr);
    console.log(`\nTest 3: Recommended Driver for ${pid}/${mfr}`);
    console.log(`  -> ${rec}`);
}

test().catch(console.error);
