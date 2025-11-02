#!/usr/bin/env node

/**
 * FIX JSON QUOTES
 * Corrects single quotes to double quotes in JSON files
 */

const fs = require('fs');
const path = require('path');

const driversPath = path.join(__dirname, '..', '..', 'drivers');
const errors = [
    'curtain_motor',
    'switch_generic_3gang',
    'switch_smart_3gang',
    'switch_smart_4gang',
    'switch_touch_2gang',
    'switch_touch_4gang',
    'switch_wall_2gang_basic',
    'switch_wall_2gang_smart',
    'switch_wireless_2gang',
    'switch_wireless_4gang',
    'switch_wireless_6gang'
];

console.log('\n🔧 FIXING JSON QUOTE ERRORS\n');
console.log('═'.repeat(60));

let fixed = 0;

errors.forEach(driver => {
    const composeFile = path.join(driversPath, driver, 'driver.compose.json');
    
    if (!fs.existsSync(composeFile)) {
        console.log(`   ⚠️  ${driver} - file not found`);
        return;
    }
    
    try {
        let content = fs.readFileSync(composeFile, 'utf8');
        let modified = false;
        
        // Fix single quotes in arrays (manufacturerName)
        // '_TZE200_xxx' → "_TZE200_xxx"
        const singleQuotePattern = /'(_TZ[^']+)'/g;
        if (content.match(singleQuotePattern)) {
            content = content.replace(singleQuotePattern, '"$1"');
            modified = true;
        }
        
        if (modified) {
            // Validate JSON before saving
            try {
                JSON.parse(content);
                fs.writeFileSync(composeFile, content, 'utf8');
                console.log(`   ✅ ${driver}`);
                fixed++;
            } catch (parseError) {
                console.log(`   ❌ ${driver} - Still invalid JSON: ${parseError.message}`);
            }
        } else {
            console.log(`   ℹ️  ${driver} - No single quotes found`);
        }
        
    } catch (error) {
        console.log(`   ❌ ${driver} - Error: ${error.message}`);
    }
});

console.log('\n' + '═'.repeat(60));
console.log(`✅ Fixed: ${fixed}/${errors.length} files\n`);

process.exit(0);
