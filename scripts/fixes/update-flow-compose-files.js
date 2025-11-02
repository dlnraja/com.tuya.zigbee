#!/usr/bin/env node

/**
 * UPDATE FLOW COMPOSE FILES
 * Fix references to renamed drivers in driver.flow.compose.json files
 */

const fs = require('fs');
const path = require('path');

const driversPath = path.join(__dirname, '..', '..', 'drivers');

const replacements = [
    { from: 'switch_hybrid_1gang', to: 'switch_1gang' },
    { from: 'switch_hybrid_2gang_alt', to: 'switch_2gang_alt' },
    { from: 'switch_hybrid_2gang', to: 'switch_2gang' },
    { from: 'switch_hybrid_3gang', to: 'switch_3gang' },
    { from: 'switch_hybrid_4gang', to: 'switch_4gang' },
    { from: 'water_valve_smart_hybrid', to: 'water_valve_controller' }
];

console.log('\n🔄 UPDATING FLOW COMPOSE FILES\n');
console.log('═'.repeat(60));

let fixed = 0;

// Process all driver.flow.compose.json files
function processDirectory(dirPath) {
    const flowComposeFile = path.join(dirPath, 'driver.flow.compose.json');
    
    if (!fs.existsSync(flowComposeFile)) return;
    
    try {
        let content = fs.readFileSync(flowComposeFile, 'utf8');
        let modified = false;
        
        replacements.forEach(({ from, to }) => {
            const regex = new RegExp(from, 'g');
            if (content.match(regex)) {
                content = content.replace(regex, to);
                modified = true;
            }
        });
        
        if (modified) {
            const driverName = path.basename(dirPath);
            fs.writeFileSync(flowComposeFile, content, 'utf8');
            console.log(`   ✅ ${driverName}`);
            fixed++;
        }
        
    } catch (error) {
        console.log(`   ❌ ${path.basename(dirPath)}: ${error.message}`);
    }
}

// Get all driver directories
const allDrivers = fs.readdirSync(driversPath).filter(file => {
    return fs.statSync(path.join(driversPath, file)).isDirectory();
});

allDrivers.forEach(driver => {
    processDirectory(path.join(driversPath, driver));
});

console.log('\n' + '═'.repeat(60));
console.log(`✅ Updated: ${fixed} flow compose files\n`);

process.exit(0);
