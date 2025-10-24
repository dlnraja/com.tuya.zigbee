#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 COMPREHENSIVE FINAL VALIDATION - Universal Tuya Zigbee\n');
console.log('='.repeat(80));

const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const stats = {
  drivers: {
    total: 0,
    withImages: 0,
    withFlows: 0,
    withEnergy: 0,
    withBattery: 0
  },
  manufacturerIDs: new Set(),
  flowCards: {
    total: 0,
    triggers: 0,
    conditions: 0,
    actions: 0
  },
  validation: {
    errors: [],
    warnings: [],
    passed: []
  }
};

// 1. VALIDATE DRIVERS
console.log('\n📦 VALIDATING DRIVERS...\n');

app.drivers.forEach(driver => {
  stats.drivers.total++;
  
  // Check images
  if (driver.images?.small && driver.images?.large && driver.images?.xlarge) {
    stats.drivers.withImages++;
    stats.validation.passed.push(`✅ ${driver.id}: Images configured`);
  } else {
    stats.validation.errors.push(`❌ ${driver.id}: Missing image configuration`);
  }
  
  // Extract manufacturer IDs
  if (driver.zigbee?.manufacturerName) {
    if (Array.isArray(driver.zigbee.manufacturerName)) {
      driver.zigbee.manufacturerName.forEach(id => stats.manufacturerIDs.add(id));
    } else {
      stats.manufacturerIDs.add(driver.zigbee.manufacturerName);
    }
  }
  
  // Check for energy capabilities
  if (driver.capabilities?.includes('measure_power') || 
      driver.capabilities?.includes('measure_voltage') ||
      driver.capabilities?.includes('measure_current')) {
    stats.drivers.withEnergy++;
  }
  
  // Check for battery
  if (driver.capabilities?.includes('measure_battery') ||
      driver.capabilities?.includes('alarm_battery')) {
    stats.drivers.withBattery++;
  }
});

// 2. VALIDATE FLOW CARDS
console.log('\n🔄 VALIDATING FLOW CARDS...\n');

if (app.flow) {
  ['triggers', 'conditions', 'actions'].forEach(type => {
    if (app.flow[type]) {
      const count = app.flow[type].length;
      stats.flowCards[type] = count;
      stats.flowCards.total += count;
      
      // Validate each flow card
      app.flow[type].forEach(card => {
        if (!card.id) {
          stats.validation.errors.push(`❌ Flow ${type}: Missing ID`);
        }
        if (!card.title) {
          stats.validation.errors.push(`❌ Flow ${type} ${card.id}: Missing title`);
        }
        
        // Check for deprecated IDs
        if (card.id.includes('battery_below_threshold')) {
          stats.validation.errors.push(`❌ CRITICAL: Deprecated flow card ${card.id} found!`);
        }
      });
    }
  });
}

// 3. VALIDATE BUG FIXES
console.log('\n🐛 VALIDATING BUG FIXES...\n');

const bugFixes = {
  'IAS_Zone_Fixed': false,
  'Deprecated_API_Fixed': false,
  'Flow_Cards_Fixed': false,
  'Driver_IDs_Fixed': false,
  'Image_Paths_Fixed': false
};

// Check IAS Zone fix
const iasZonePath = path.join(__dirname, '../../lib/IASZoneEnroller.js');
if (fs.existsSync(iasZonePath)) {
  const content = fs.readFileSync(iasZonePath, 'utf8');
  if (content.includes('retry') && content.includes('setTimeout')) {
    bugFixes.IAS_Zone_Fixed = true;
    stats.validation.passed.push('✅ IAS Zone enrollment retry logic present');
  }
}

// Check deprecated API
let deprecatedAPIFound = false;
app.drivers.forEach(driver => {
  const devicePath = path.join(__dirname, `../../drivers/${driver.id}/device.js`);
  if (fs.existsSync(devicePath)) {
    const content = fs.readFileSync(devicePath, 'utf8');
    if (content.includes("readAttributes('")) {
      deprecatedAPIFound = true;
      stats.validation.errors.push(`❌ ${driver.id}: Deprecated readAttributes API found`);
    }
  }
});
if (!deprecatedAPIFound) {
  bugFixes.Deprecated_API_Fixed = true;
  stats.validation.passed.push('✅ No deprecated readAttributes API found');
}

// Check flow card prefixes
let invalidPrefixes = 0;
['triggers', 'conditions', 'actions'].forEach(type => {
  if (app.flow?.[type]) {
    app.flow[type].forEach(card => {
      if (card.id && !card.id.includes('_')) {
        invalidPrefixes++;
      }
    });
  }
});
if (invalidPrefixes === 0) {
  bugFixes.Flow_Cards_Fixed = true;
  stats.validation.passed.push('✅ All flow cards have proper ID prefixes');
}

// Check driver IDs
let missingIDs = 0;
app.drivers.forEach(driver => {
  if (!driver.id) {
    missingIDs++;
  }
});
if (missingIDs === 0) {
  bugFixes.Driver_IDs_Fixed = true;
  stats.validation.passed.push('✅ All drivers have IDs');
}

// Check image paths
let invalidPaths = 0;
app.drivers.forEach(driver => {
  if (driver.images) {
    ['small', 'large', 'xlarge'].forEach(size => {
      if (driver.images[size]?.startsWith('/')) {
        invalidPaths++;
      }
    });
  }
});
if (invalidPaths === 0) {
  bugFixes.Image_Paths_Fixed = true;
  stats.validation.passed.push('✅ All image paths are relative (no leading /)');
}

// 4. DISPLAY RESULTS
console.log('\n' + '='.repeat(80));
console.log('\n📊 FINAL VALIDATION RESULTS\n');
console.log('='.repeat(80));

console.log('\n### DRIVERS');
console.log(`Total Drivers: ${stats.drivers.total}`);
console.log(`With Images: ${stats.drivers.withImages}/${stats.drivers.total}`);
console.log(`With Energy Management: ${stats.drivers.withEnergy}`);
console.log(`With Battery Support: ${stats.drivers.withBattery}`);
console.log(`Total Manufacturer IDs: ${stats.manufacturerIDs.size}`);

console.log('\n### FLOW CARDS');
console.log(`Total Flow Cards: ${stats.flowCards.total}`);
console.log(`  - Triggers: ${stats.flowCards.triggers}`);
console.log(`  - Conditions: ${stats.flowCards.conditions}`);
console.log(`  - Actions: ${stats.flowCards.actions}`);

console.log('\n### BUG FIXES STATUS');
Object.entries(bugFixes).forEach(([fix, status]) => {
  console.log(`${status ? '✅' : '❌'} ${fix.replace(/_/g, ' ')}`);
});

console.log('\n### VALIDATION SUMMARY');
console.log(`✅ Passed: ${stats.validation.passed.length}`);
console.log(`⚠️  Warnings: ${stats.validation.warnings.length}`);
console.log(`❌ Errors: ${stats.validation.errors.length}`);

if (stats.validation.errors.length > 0) {
  console.log('\n### ERRORS TO FIX:');
  stats.validation.errors.slice(0, 10).forEach(err => console.log(err));
  if (stats.validation.errors.length > 10) {
    console.log(`... and ${stats.validation.errors.length - 10} more`);
  }
}

console.log('\n' + '='.repeat(80));

if (stats.validation.errors.length === 0) {
  console.log('\n🎉 ALL VALIDATIONS PASSED! App is ready for production.\n');
  console.log('='.repeat(80));
  process.exit(0);
} else {
  console.log('\n⚠️  Some issues need attention before release.\n');
  console.log('='.repeat(80));
  process.exit(1);
}
