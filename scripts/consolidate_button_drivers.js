#!/usr/bin/env node
'use strict';

/**
 * Script to consolidate button drivers
 * Merges multiple button drivers with different power sources into unified drivers
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const OUTPUT_FILE = path.join(__dirname, '..', 'button_consolidation_report.json');

// Button patterns to consolidate
const BUTTON_PATTERNS = [
  { count: 1, patterns: ['1button', '1gang', 'single'] },
  { count: 2, patterns: ['2button', '2gang', 'dual'] },
  { count: 3, patterns: ['3button', '3gang', 'triple'] },
  { count: 4, patterns: ['4button', '4gang', 'quad'] },
  { count: 5, patterns: ['5button', '5gang'] },
  { count: 6, patterns: ['6button', '6gang'] },
  { count: 8, patterns: ['8button', '8gang'] }
];

// Power source patterns
const POWER_PATTERNS = {
  battery: ['cr2032', 'cr2450', 'cr2477', 'cr123a', 'aaa', 'aa', 'battery', '_bat'],
  ac: ['_ac', 'mains', 'powered'],
  dc: ['_dc', '12v', '24v']
};

async function consolidateButtonDrivers() {
  console.log('🔍 Scanning button drivers...\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR)
    .filter(name => fs.statSync(path.join(DRIVERS_DIR, name)).isDirectory());
  
  const buttonDrivers = drivers.filter(name => 
    name.includes('button') || 
    name.includes('switch') || 
    name.includes('scene') ||
    name.includes('wireless')
  );
  
  console.log(`Found ${buttonDrivers.length} potential button drivers\n`);
  
  const consolidationMap = {};
  const manufacturerIds = {};
  
  for (const buttonCount of BUTTON_PATTERNS) {
    consolidationMap[buttonCount.count] = {
      targetDriver: `button_${buttonCount.count}gang`,
      sourceDrivers: [],
      manufacturerIds: new Set(),
      productIds: new Set(),
      totalDevices: 0
    };
  }
  
  // Analyze each driver
  for (const driverName of buttonDrivers) {
    const driverPath = path.join(DRIVERS_DIR, driverName);
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) continue;
    
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      // Detect button count
      let buttonCount = 0;
      for (const pattern of BUTTON_PATTERNS) {
        if (pattern.patterns.some(p => driverName.toLowerCase().includes(p))) {
          buttonCount = pattern.count;
          break;
        }
      }
      
      if (buttonCount === 0) continue;
      
      // Detect power source
      let powerSource = 'battery'; // Default
      for (const [type, patterns] of Object.entries(POWER_PATTERNS)) {
        if (patterns.some(p => driverName.toLowerCase().includes(p))) {
          powerSource = type;
          break;
        }
      }
      
      // Extract manufacturer IDs
      const mfgIds = compose.zigbee?.manufacturerName || [];
      const prodIds = compose.zigbee?.productId || [];
      
      consolidationMap[buttonCount].sourceDrivers.push({
        name: driverName,
        powerSource,
        manufacturerIds: mfgIds.length,
        productIds: prodIds.length,
        class: compose.class,
        capabilities: compose.capabilities
      });
      
      // Add to consolidated list
      mfgIds.forEach(id => consolidationMap[buttonCount].manufacturerIds.add(id));
      prodIds.forEach(id => consolidationMap[buttonCount].productIds.add(id));
      consolidationMap[buttonCount].totalDevices += mfgIds.length;
      
    } catch (err) {
      console.error(`Error processing ${driverName}:`, err.message);
    }
  }
  
  // Generate report
  console.log('\n📊 CONSOLIDATION REPORT\n');
  console.log('═'.repeat(80) + '\n');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalButtonDrivers: 0,
      targetDrivers: 0,
      totalManufacturerIds: 0,
      totalProductIds: 0,
      estimatedReduction: 0
    },
    consolidation: {}
  };
  
  for (const [count, data] of Object.entries(consolidationMap)) {
    if (data.sourceDrivers.length === 0) continue;
    
    console.log(`\n🔘 ${count}-BUTTON CONTROLLERS`);
    console.log('─'.repeat(80));
    console.log(`Target Driver: ${data.targetDriver}`);
    console.log(`Source Drivers: ${data.sourceDrivers.length}`);
    console.log(`Manufacturer IDs: ${data.manufacturerIds.size}`);
    console.log(`Product IDs: ${data.productIds.size}`);
    console.log(`Total Devices: ${data.totalDevices}`);
    
    // Group by power source
    const byPower = {};
    data.sourceDrivers.forEach(driver => {
      if (!byPower[driver.powerSource]) byPower[driver.powerSource] = [];
      byPower[driver.powerSource].push(driver.name);
    });
    
    console.log('\nBy Power Source:');
    for (const [power, drivers] of Object.entries(byPower)) {
      console.log(`  ${power.toUpperCase()}: ${drivers.length} drivers`);
      drivers.forEach(d => console.log(`    - ${d}`));
    }
    
    report.consolidation[count] = {
      targetDriver: data.targetDriver,
      sourceCount: data.sourceDrivers.length,
      manufacturerIds: Array.from(data.manufacturerIds),
      productIds: Array.from(data.productIds),
      sourceDrivers: data.sourceDrivers
    };
    
    report.summary.totalButtonDrivers += data.sourceDrivers.length;
    report.summary.targetDrivers++;
    report.summary.totalManufacturerIds += data.manufacturerIds.size;
    report.summary.totalProductIds += data.productIds.size;
  }
  
  report.summary.estimatedReduction = Math.round(
    (1 - report.summary.targetDrivers / report.summary.totalButtonDrivers) * 100
  );
  
  console.log('\n\n📈 SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Current Button Drivers: ${report.summary.totalButtonDrivers}`);
  console.log(`Target Unified Drivers: ${report.summary.targetDrivers}`);
  console.log(`Reduction: ${report.summary.estimatedReduction}%`);
  console.log(`Total Manufacturer IDs: ${report.summary.totalManufacturerIds}`);
  console.log(`Total Product IDs: ${report.summary.totalProductIds}`);
  
  // Save report
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
  console.log(`\n✅ Report saved to: ${OUTPUT_FILE}\n`);
  
  return report;
}

// Run if called directly
if (require.main === module) {
  consolidateButtonDrivers()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

module.exports = { consolidateButtonDrivers };
