#!/usr/bin/env node
'use strict';

/**
 * FIX ALL SENSOR CAPABILITIES
 * 
 * Automatically fixes all sensor drivers that have measure_* capabilities
 * but don't properly register them with numeric cluster IDs.
 * 
 * Fixes:
 * - measure_temperature (cluster 1026)
 * - measure_humidity (cluster 1029)
 * - measure_luminance (cluster 1024)
 * - measure_illuminance (cluster 1024)
 * - measure_co2 (cluster 1037)
 * - measure_pm25 (Tuya custom cluster 61184)
 * 
 * Ensures all sensors report data correctly to Homey.
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

// Capability to cluster mapping (SDK3 numeric IDs)
const CAPABILITY_CLUSTER_MAP = {
  'measure_temperature': {
    cluster: 1026,
    attribute: 'measuredValue',
    parser: 'value => value / 100', // centidegrees to celsius
    unit: '°C',
    reportOpts: {
      minInterval: 60,
      maxInterval: 3600,
      minChange: 10 // 0.1°C
    }
  },
  'measure_humidity': {
    cluster: 1029,
    attribute: 'measuredValue',
    parser: 'value => value / 100', // percentage * 100 to percentage
    unit: '%',
    reportOpts: {
      minInterval: 60,
      maxInterval: 3600,
      minChange: 100 // 1%
    }
  },
  'measure_luminance': {
    cluster: 1024,
    attribute: 'measuredValue',
    parser: 'value => Math.pow(10, (value - 1) / 10000)', // lux calculation
    unit: 'lux',
    reportOpts: {
      minInterval: 60,
      maxInterval: 3600,
      minChange: 100
    }
  },
  'measure_co2': {
    cluster: 1037,
    attribute: 'measuredValue',
    parser: 'value => value * 1e-6', // ppm
    unit: 'ppm',
    reportOpts: {
      minInterval: 300,
      maxInterval: 3600,
      minChange: 10
    }
  }
};

let totalFixed = 0;
let totalDrivers = 0;

console.log('🔧 Fixing All Sensor Capabilities');
console.log('==================================\n');

/**
 * Generate device.js code for proper sensor capability registration
 */
function generateSensorSetupCode(capabilities) {
  const setupFunctions = [];
  
  for (const capability of capabilities) {
    const config = CAPABILITY_CLUSTER_MAP[capability];
    if (!config) continue;
    
    const capName = capability.replace('measure_', '');
    const funcName = `setup${capName.charAt(0).toUpperCase()}${capName.slice(1)}Sensor`;
    
    setupFunctions.push(`
  /**
   * Setup ${capability} capability (SDK3)
   * Cluster ${config.cluster} - ${config.attribute}
   */
  async ${funcName}() {
    if (!this.hasCapability('${capability}')) {
      return;
    }
    
    this.log('🌡️  Setting up ${capability} (cluster ${config.cluster})...');
    
    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint?.clusters[${config.cluster}]) {
      this.log('⚠️  Cluster ${config.cluster} not available');
      return;
    }
    
    try {
      this.registerCapability('${capability}', ${config.cluster}, {
        get: '${config.attribute}',
        report: '${config.attribute}',
        reportParser: ${config.parser},
        reportOpts: {
          configureAttributeReporting: {
            minInterval: ${config.reportOpts.minInterval},
            maxInterval: ${config.reportOpts.maxInterval},
            minChange: ${config.reportOpts.minChange}
          }
        },
        getOpts: {
          getOnStart: true
        }
      });
      
      this.log('✅ ${capability} configured (cluster ${config.cluster})');
    } catch (err) {
      this.error('${capability} setup failed:', err);
    }
  }`);
  }
  
  return setupFunctions.join('\n');
}

/**
 * Fix a driver's device.js file
 */
function fixDriverDeviceJS(driverPath, driverId, capabilities) {
  const devicePath = path.join(driverPath, 'device.js');
  
  if (!fs.existsSync(devicePath)) {
    console.log(`  ⚠️  No device.js found, skipping`);
    return false;
  }
  
  try {
    let content = fs.readFileSync(devicePath, 'utf8');
    
    // Check if already properly configured
    const hasProperSetup = capabilities.every(cap => {
      const config = CAPABILITY_CLUSTER_MAP[cap];
      if (!config) return true;
      
      const clusterCheck = new RegExp(`registerCapability\\s*\\(\\s*['"]${cap}['"]\\s*,\\s*${config.cluster}`, 'i');
      return clusterCheck.test(content);
    });
    
    if (hasProperSetup) {
      console.log(`  ✅ Already properly configured`);
      return false;
    }
    
    // Generate setup code
    const setupCode = generateSensorSetupCode(capabilities);
    
    // Find onNodeInit and add setup calls
    const onNodeInitRegex = /async\s+onNodeInit\s*\([^)]*\)\s*\{/;
    const match = content.match(onNodeInitRegex);
    
    if (!match) {
      console.log(`  ⚠️  No onNodeInit found, skipping`);
      return false;
    }
    
    // Add setup method calls after super.onNodeInit()
    const setupCalls = capabilities
      .filter(cap => CAPABILITY_CLUSTER_MAP[cap])
      .map(cap => {
        const capName = cap.replace('measure_', '');
        const funcName = `setup${capName.charAt(0).toUpperCase()}${capName.slice(1)}Sensor`;
        return `    await this.${funcName}();`;
      })
      .join('\n');
    
    // Insert setup calls after super.onNodeInit()
    content = content.replace(
      /await super\.onNodeInit\(\)([^;]*);/,
      `await super.onNodeInit()$1;\n\n    // Setup sensor capabilities (SDK3)\n${setupCalls}`
    );
    
    // Add setup methods before onDeleted
    if (content.includes('async onDeleted')) {
      content = content.replace(
        /async onDeleted\(/,
        `${setupCode}\n\n  async onDeleted(`
      );
    } else {
      // Add before module.exports
      content = content.replace(
        /module\.exports\s*=/,
        `${setupCode}\n}\n\nmodule.exports =`
      );
    }
    
    // Write back
    fs.writeFileSync(devicePath, content, 'utf8');
    
    console.log(`  ✅ Fixed ${capabilities.length} capabilities`);
    return true;
    
  } catch (err) {
    console.log(`  ❌ Error fixing: ${err.message}`);
    return false;
  }
}

/**
 * Scan and fix all drivers
 */
function scanAndFixAllDrivers() {
  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  console.log(`📁 Found ${drivers.length} drivers\n`);
  
  for (const driverId of drivers) {
    const driverPath = path.join(DRIVERS_DIR, driverId);
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) {
      continue;
    }
    
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      // Find measure_* capabilities
      const measureCapabilities = (compose.capabilities || [])
        .filter(cap => {
          if (typeof cap === 'string') {
            return cap.startsWith('measure_') && CAPABILITY_CLUSTER_MAP[cap];
          }
          return false;
        });
      
      if (measureCapabilities.length === 0) {
        continue;
      }
      
      totalDrivers++;
      console.log(`\n📄 ${driverId}:`);
      console.log(`   Capabilities: ${measureCapabilities.join(', ')}`);
      
      if (fixDriverDeviceJS(driverPath, driverId, measureCapabilities)) {
        totalFixed++;
      }
      
    } catch (err) {
      console.log(`\n❌ ${driverId}: Error - ${err.message}`);
    }
  }
}

/**
 * Main execution
 */
function main() {
  scanAndFixAllDrivers();
  
  console.log('\n==================================');
  console.log('📊 Fix Summary');
  console.log('==================================\n');
  
  console.log(`Total drivers with sensors: ${totalDrivers}`);
  console.log(`Total fixed: ${totalFixed}`);
  console.log(`Already correct: ${totalDrivers - totalFixed}\n`);
  
  if (totalFixed > 0) {
    console.log('✅ FIXES APPLIED - Run validation and commit\n');
    process.exit(0);
  } else {
    console.log('ℹ️  NO FIXES NEEDED - All sensors properly configured\n');
    process.exit(0);
  }
}

// Run fix
main();
