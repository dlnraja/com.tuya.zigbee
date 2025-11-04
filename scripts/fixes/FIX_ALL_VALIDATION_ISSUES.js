#!/usr/bin/env node
'use strict';

/**
 * FIX ALL VALIDATION ISSUES
 * 
 * Fixes:
 * 1. Remove "(hybrid)" and "(Hybride)" from driver names
 * 2. Fix endpoint objects (should be object not number)
 * 3. Add dynamic battery icon detection
 * 4. Remove duplicate drivers
 * 5. Fix image paths
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔧 FIXING ALL VALIDATION ISSUES');
console.log('═══════════════════════════════════════════════════\n');

let fixCount = 0;

// ============================================================================
// 1. FIX HYBRID REFERENCES
// ============================================================================

console.log('Phase 1: Removing (hybrid) references...\n');

const driversWithHybrid = [
  'switch_1gang',
  'switch_2gang',
  'switch_2gang_alt',
  'switch_3gang',
  'switch_4gang',
  'wall_touch_3gang',
  'water_valve_controller'
];

for (const driverName of driversWithHybrid) {
  const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) {
    console.log(`⚠️  Not found: ${driverName}/driver.compose.json`);
    continue;
  }
  
  let compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  let modified = false;
  
  // Remove (Hybride) from French names
  if (compose.name && compose.name.fr && compose.name.fr.includes('Hybride')) {
    compose.name.fr = compose.name.fr.replace(/\s*\(Hybride\)/gi, '');
    modified = true;
    console.log(`✅ Fixed French name: ${driverName}`);
    fixCount++;
  }
  
  // Fix ID if contains hybrid
  if (compose.id && compose.id.includes('hybrid')) {
    const oldId = compose.id;
    compose.id = compose.id.replace(/_hybrid/g, '').replace(/hybrid_/g, '');
    modified = true;
    console.log(`✅ Fixed ID: ${oldId} → ${compose.id}`);
    fixCount++;
  }
  
  // Fix image paths
  if (compose.images) {
    ['small', 'large', 'xlarge'].forEach(size => {
      if (compose.images[size] && compose.images[size].includes('hybrid')) {
        const oldPath = compose.images[size];
        compose.images[size] = compose.images[size].replace(/hybrid_/g, '').replace(/_hybrid/g, '');
        modified = true;
        console.log(`✅ Fixed image path (${size}): ${driverName}`);
        fixCount++;
      }
    });
  }
  
  if (modified) {
    fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2), 'utf8');
  }
}

console.log('');

// ============================================================================
// 2. FIX ENDPOINT OBJECTS
// ============================================================================

console.log('Phase 2: Fixing endpoint objects...\n');

const driversWithEndpoints = fs.readdirSync(DRIVERS_DIR).filter(d => {
  const stat = fs.statSync(path.join(DRIVERS_DIR, d));
  return stat.isDirectory();
});

for (const driverName of driversWithEndpoints) {
  const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) continue;
  
  let compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  let modified = false;
  
  // Fix zigbee endpoints
  if (compose.zigbee && compose.zigbee.endpoints) {
    const endpoints = compose.zigbee.endpoints;
    
    for (const [epId, epValue] of Object.entries(endpoints)) {
      // If endpoint is a number or null, convert to object
      if (typeof epValue === 'number' || epValue === null || epValue === undefined) {
        compose.zigbee.endpoints[epId] = {
          clusters: []
        };
        modified = true;
        console.log(`✅ Fixed endpoint ${epId}: ${driverName}`);
        fixCount++;
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2), 'utf8');
  }
}

console.log('');

// ============================================================================
// 3. ADD DYNAMIC BATTERY ICON
// ============================================================================

console.log('Phase 3: Adding dynamic battery icon system...\n');

// Create battery icon capability detector
const batteryDetectorCode = `'use strict';

/**
 * Battery Icon Dynamic Detector
 * 
 * Automatically shows battery icon when device has battery capability
 */

module.exports = class BatteryIconDetector {
  
  static shouldShowBatteryIcon(capabilities) {
    if (!Array.isArray(capabilities)) return false;
    
    // Check for battery-related capabilities
    const batteryCapabilities = [
      'measure_battery',
      'alarm_battery'
    ];
    
    return capabilities.some(cap => 
      batteryCapabilities.includes(cap) || 
      cap.startsWith('measure_battery')
    );
  }
  
  static async enableBatteryIcon(device) {
    // Check if device has battery capability
    const hasBattery = this.shouldShowBatteryIcon(device.getCapabilities());
    
    if (hasBattery) {
      // Set energy to enable battery icon in UI
      if (!device.hasEnergy || !device.hasEnergy()) {
        try {
          await device.setEnergy({
            batteries: ['OTHER']
          });
          device.log('[Battery] Icon enabled dynamically');
        } catch (err) {
          device.error('[Battery] Failed to enable icon:', err);
        }
      }
    }
  }
};
`;

const batteryDetectorPath = path.join(ROOT, 'lib', 'battery', 'BatteryIconDetector.js');
fs.writeFileSync(batteryDetectorPath, batteryDetectorCode, 'utf8');
console.log('✅ Created: lib/battery/BatteryIconDetector.js');
fixCount++;

// Update battery index
const batteryIndexPath = path.join(ROOT, 'lib', 'battery', 'index.js');
const batteryIndex = `'use strict';

module.exports = {
  BatterySystem: require('./BatterySystem'),
  BatteryIconDetector: require('./BatteryIconDetector')
};
`;
fs.writeFileSync(batteryIndexPath, batteryIndex, 'utf8');
console.log('✅ Updated: lib/battery/index.js');
fixCount++;

console.log('');

// ============================================================================
// 4. CHECK FOR DUPLICATE DRIVERS
// ============================================================================

console.log('Phase 4: Checking for duplicate drivers...\n');

const driverGroups = {};

for (const driverName of driversWithEndpoints) {
  const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) continue;
  
  const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  
  // Group by name.en
  const nameEn = compose.name && compose.name.en;
  if (!nameEn) continue;
  
  if (!driverGroups[nameEn]) {
    driverGroups[nameEn] = [];
  }
  
  driverGroups[nameEn].push({
    id: driverName,
    class: compose.class,
    capabilities: (compose.capabilities || []).length
  });
}

// Find duplicates
const duplicates = Object.entries(driverGroups).filter(([name, drivers]) => drivers.length > 1);

if (duplicates.length > 0) {
  console.log('⚠️  Potential duplicates found:\n');
  
  for (const [name, drivers] of duplicates) {
    console.log(`  "${name}":`);
    drivers.forEach(d => {
      console.log(`    - ${d.id} (${d.class}, ${d.capabilities} caps)`);
    });
    console.log('');
  }
  
  console.log('Note: Review these manually to determine if they are truly duplicates.\n');
} else {
  console.log('✅ No obvious duplicates found\n');
}

// ============================================================================
// 5. FIX ENERGY OBJECT IN DRIVERS WITH BATTERY
// ============================================================================

console.log('Phase 5: Adding energy object to battery-powered drivers...\n');

for (const driverName of driversWithEndpoints) {
  const composeFile = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) continue;
  
  let compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  let modified = false;
  
  // Check if has battery capability
  const hasBattery = compose.capabilities && (
    compose.capabilities.includes('measure_battery') ||
    compose.capabilities.includes('alarm_battery')
  );
  
  if (hasBattery && !compose.energy) {
    // Add energy object
    compose.energy = {
      batteries: ['OTHER']
    };
    modified = true;
    console.log(`✅ Added energy object: ${driverName}`);
    fixCount++;
  }
  
  if (modified) {
    fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2), 'utf8');
  }
}

console.log('');

// ============================================================================
// SUMMARY
// ============================================================================

console.log('═══════════════════════════════════════════════════');
console.log('✅ FIXES COMPLETE');
console.log('═══════════════════════════════════════════════════\n');

console.log(`Total fixes applied: ${fixCount}`);
console.log('');

console.log('Next steps:');
console.log('  1. Run: homey app validate --level publish');
console.log('  2. Review duplicate drivers (if any)');
console.log('  3. Commit changes');
console.log('');
