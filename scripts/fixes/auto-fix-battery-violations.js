'use strict';

const fs = require('fs');
const path = require('path');

/**
 * AUTO-FIX BATTERY VIOLATIONS
 * Based on: COMPLETE_SDK_REFERENCE.md
 * 
 * CRITICAL RULE: NEVER use both measure_battery AND alarm_battery
 * 
 * This script automatically fixes drivers that violate this rule by:
 * 1. Keeping measure_battery (more useful)
 * 2. Removing alarm_battery
 * 3. Ensuring energy.batteries array exists
 */

async function autoFixBatteryViolations() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  🔧 AUTO-FIX BATTERY VIOLATIONS                          ║');
  console.log('║  Based on: COMPLETE_SDK_REFERENCE.md                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  const driversDir = path.join(__dirname, '../../drivers');
  const drivers = fs.readdirSync(driversDir);
  
  let fixed = 0;
  let checked = 0;
  
  for (const driverId of drivers) {
    const composePath = path.join(driversDir, driverId, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) continue;
    
    checked++;
    const driver = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    let modified = false;
    
    const caps = driver.capabilities || [];
    const hasMeasureBattery = caps.includes('measure_battery');
    const hasAlarmBattery = caps.includes('alarm_battery');
    
    // FIX 1: Remove alarm_battery if both present
    if (hasMeasureBattery && hasAlarmBattery) {
      console.log(`🔴 VIOLATION: ${driverId}`);
      console.log(`   Both measure_battery AND alarm_battery present`);
      
      // Remove alarm_battery
      driver.capabilities = caps.filter(c => c !== 'alarm_battery');
      modified = true;
      fixed++;
      
      console.log(`   ✅ Fixed: Removed alarm_battery\n`);
    }
    
    // FIX 2: Add energy.batteries if missing
    const hasBattery = driver.capabilities?.includes('measure_battery') || 
                      driver.capabilities?.includes('alarm_battery');
    
    if (hasBattery) {
      if (!driver.energy || !driver.energy.batteries || driver.energy.batteries.length === 0) {
        console.log(`⚠️  Missing energy.batteries: ${driverId}`);
        
        if (!driver.energy) driver.energy = {};
        
        // Smart default based on device class
        let defaultBattery = 'CR2032'; // Default coin cell
        
        if (driver.class === 'sensor') {
          defaultBattery = 'CR2032';
        } else if (driver.class === 'doorbell' || driver.class === 'lock') {
          defaultBattery = 'AA';
        } else if (driver.name?.en?.toLowerCase().includes('temperature')) {
          defaultBattery = 'CR2450';
        }
        
        driver.energy.batteries = [defaultBattery];
        modified = true;
        
        console.log(`   ✅ Added energy.batteries: ["${defaultBattery}"]\n`);
      }
    }
    
    // Save if modified
    if (modified) {
      fs.writeFileSync(composePath, JSON.stringify(driver, null, 2));
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Drivers checked: ${checked}`);
  console.log(`   Violations fixed: ${fixed}\n`);
  
  if (fixed > 0) {
    console.log('✅ All battery violations fixed!');
    console.log('📝 Review changes and commit if satisfied.\n');
  } else {
    console.log('✅ No violations found! Already compliant.\n');
  }
}

// Run if called directly
if (require.main === module) {
  autoFixBatteryViolations().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { autoFixBatteryViolations };
