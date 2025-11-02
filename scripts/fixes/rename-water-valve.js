#!/usr/bin/env node

/**
 * RENAME water_valve_smart_hybrid to water_valve_controller
 * These are different drivers:
 * - water_valve_smart: Sensor only (alarms, temperature, battery)
 * - water_valve_smart_hybrid: Controller (onoff, meter_water, alarms)
 */

const fs = require('fs');
const path = require('path');

const driversPath = path.join(__dirname, '..', '..', 'drivers');
const oldName = 'water_valve_smart_hybrid';
const newName = 'water_valve_controller';
const oldPath = path.join(driversPath, oldName);
const newPath = path.join(driversPath, newName);

console.log('\n🔄 RENAMING WATER VALVE HYBRID\n');
console.log('═'.repeat(60));

if (!fs.existsSync(oldPath)) {
    console.log(`❌ ${oldName} not found!`);
    process.exit(1);
}

if (fs.existsSync(newPath)) {
    console.log(`⚠️  ${newName} already exists!`);
    console.log('Skipping rename to avoid conflict.');
    process.exit(0);
}

try {
    // Rename directory
    fs.renameSync(oldPath, newPath);
    console.log(`✅ Renamed: ${oldName} → ${newName}`);
    
    // Update driver.compose.json paths
    const composeFile = path.join(newPath, 'driver.compose.json');
    if (fs.existsSync(composeFile)) {
        let content = fs.readFileSync(composeFile, 'utf8');
        
        // Update image paths
        content = content.replace(
            new RegExp(`/drivers/${oldName}/`, 'g'),
            `/drivers/${newName}/`
        );
        content = content.replace(
            new RegExp(`drivers/${oldName}/`, 'g'),
            `drivers/${newName}/`
        );
        
        fs.writeFileSync(composeFile, content, 'utf8');
        console.log(`✅ Updated paths in driver.compose.json`);
    }
    
    console.log('\n✅ RENAME COMPLETE!\n');
    
} catch (error) {
    console.log(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
}
