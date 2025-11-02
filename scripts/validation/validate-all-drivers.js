#!/usr/bin/env node

/**
 * VALIDATE ALL DRIVERS
 * Check all driver.compose.json files
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');

console.log('\n🚗 VALIDATING ALL DRIVERS\n');
console.log('═'.repeat(70));

let errors = [];
let warnings = [];
let validated = 0;

// Get all drivers
const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
    return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory();
});

console.log(`\nFound ${drivers.length} drivers\n`);

// Validate each driver
drivers.forEach(driverId => {
    const driverPath = path.join(DRIVERS_DIR, driverId);
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    console.log(`Validating ${driverId}...`);
    
    // Check driver.compose.json exists
    if (!fs.existsSync(composePath)) {
        errors.push(`${driverId}: Missing driver.compose.json`);
        return;
    }
    
    // Validate JSON
    try {
        const content = fs.readFileSync(composePath, 'utf8');
        const compose = JSON.parse(content);
        
        // Validate required fields
        if (!compose.name) {
            errors.push(`${driverId}: Missing name`);
        }
        
        if (!compose.class) {
            errors.push(`${driverId}: Missing class`);
        }
        
        if (!compose.capabilities || compose.capabilities.length === 0) {
            warnings.push(`${driverId}: No capabilities defined`);
        }
        
        // Validate Zigbee configuration
        if (compose.zigbee) {
            if (!compose.zigbee.manufacturerName || compose.zigbee.manufacturerName.length === 0) {
                warnings.push(`${driverId}: No manufacturer IDs`);
            } else {
                // Validate manufacturer ID format
                compose.zigbee.manufacturerName.forEach(id => {
                    if (!id.match(/^_TZ[A-Z0-9]{4}_[a-z0-9]{8}$/)) {
                        warnings.push(`${driverId}: Invalid manufacturer ID format: ${id}`);
                    }
                });
            }
        }
        
        // Check required files
        const requiredFiles = ['device.js', 'driver.js'];
        requiredFiles.forEach(file => {
            if (!fs.existsSync(path.join(driverPath, file))) {
                errors.push(`${driverId}: Missing ${file}`);
            }
        });
        
        // Check assets
        const assetsDir = path.join(driverPath, 'assets');
        if (fs.existsSync(assetsDir)) {
            const imagesDir = path.join(assetsDir, 'images');
            if (fs.existsSync(imagesDir)) {
                const required = ['small.png', 'large.png'];
                required.forEach(img => {
                    if (!fs.existsSync(path.join(imagesDir, img))) {
                        warnings.push(`${driverId}: Missing ${img}`);
                    }
                });
            }
        }
        
        validated++;
        console.log(`   ✅`);
        
    } catch (error) {
        errors.push(`${driverId}: Invalid JSON - ${error.message}`);
        console.log(`   ❌`);
    }
});

// Print results
console.log('\n' + '═'.repeat(70));
console.log('\n📊 VALIDATION RESULTS\n');
console.log(`Validated: ${validated}/${drivers.length}`);

if (errors.length > 0) {
    console.log(`\n❌ ERRORS: ${errors.length}\n`);
    errors.forEach(error => console.log(`   - ${error}`));
}

if (warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS: ${warnings.length}\n`);
    warnings.slice(0, 20).forEach(warning => console.log(`   - ${warning}`));
    if (warnings.length > 20) {
        console.log(`   ... and ${warnings.length - 20} more`);
    }
}

console.log('');

if (errors.length > 0) {
    console.log('❌ VALIDATION FAILED\n');
    process.exit(1);
} else {
    console.log('✅ ALL DRIVERS VALIDATED\n');
    process.exit(0);
}
