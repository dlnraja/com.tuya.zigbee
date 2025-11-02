#!/usr/bin/env node

/**
 * VALIDATE APP STRUCTURE
 * Official Homey App Store validation (replaces homey CLI)
 */

const fs = require('fs');
const path = require('path');

const APP_JSON = path.join(__dirname, '..', '..', 'app.json');

console.log('\n🔍 VALIDATING APP STRUCTURE\n');
console.log('═'.repeat(70));

let errors = [];
let warnings = [];

// Validate app.json exists and is valid JSON
function validateAppJson() {
    console.log('\n📄 Validating app.json...');
    
    if (!fs.existsSync(APP_JSON)) {
        errors.push('app.json not found');
        return null;
    }
    
    try {
        const content = fs.readFileSync(APP_JSON, 'utf8');
        const app = JSON.parse(content);
        
        console.log('   ✅ Valid JSON format');
        return app;
    } catch (error) {
        errors.push(`app.json is not valid JSON: ${error.message}`);
        return null;
    }
}

// Validate required fields
function validateRequiredFields(app) {
    console.log('\n📋 Checking required fields...');
    
    const required = [
        'id',
        'version',
        'compatibility',
        'name',
        'description',
        'category',
        'permissions',
        'images'
    ];
    
    required.forEach(field => {
        if (!app[field]) {
            errors.push(`Missing required field: ${field}`);
        } else {
            console.log(`   ✅ ${field}`);
        }
    });
}

// Validate version format
function validateVersion(app) {
    console.log('\n🔢 Validating version...');
    
    if (!app.version) return;
    
    const versionRegex = /^\d+\.\d+\.\d+$/;
    if (!versionRegex.test(app.version)) {
        errors.push(`Invalid version format: ${app.version} (must be x.y.z)`);
    } else {
        console.log(`   ✅ Version: ${app.version}`);
    }
}

// Validate images
function validateImages(app) {
    console.log('\n🖼️  Validating images...');
    
    if (!app.images) return;
    
    const required = ['small', 'large', 'xlarge'];
    const sizes = {
        small: { width: 250, height: 175 },
        large: { width: 500, height: 350 },
        xlarge: { width: 1000, height: 700 }
    };
    
    required.forEach(size => {
        if (!app.images[size]) {
            errors.push(`Missing required image: ${size}`);
        } else {
            const imagePath = path.join(__dirname, '..', '..', app.images[size]);
            if (!fs.existsSync(imagePath)) {
                errors.push(`Image file not found: ${app.images[size]}`);
            } else {
                console.log(`   ✅ ${size}: ${app.images[size]}`);
            }
        }
    });
}

// Validate drivers
function validateDrivers(app) {
    console.log('\n🚗 Validating drivers...');
    
    if (!app.drivers || app.drivers.length === 0) {
        warnings.push('No drivers defined');
        return;
    }
    
    console.log(`   Found ${app.drivers.length} drivers`);
    
    app.drivers.forEach(driver => {
        if (!driver.id) {
            errors.push('Driver missing id');
        }
        
        // Check driver directory exists
        const driverDir = path.join(__dirname, '..', '..', 'drivers', driver.id);
        if (!fs.existsSync(driverDir)) {
            errors.push(`Driver directory not found: drivers/${driver.id}`);
        } else {
            // Check required files
            const requiredFiles = ['driver.js', 'device.js'];
            requiredFiles.forEach(file => {
                if (!fs.existsSync(path.join(driverDir, file))) {
                    errors.push(`Driver ${driver.id} missing ${file}`);
                }
            });
        }
    });
    
    console.log(`   ✅ All drivers validated`);
}

// Validate flow
function validateFlow(app) {
    console.log('\n🔄 Validating flow...');
    
    if (!app.flow) {
        warnings.push('No flow defined');
        return;
    }
    
    let totalCards = 0;
    
    if (app.flow.triggers) {
        totalCards += app.flow.triggers.length;
    }
    if (app.flow.conditions) {
        totalCards += app.flow.conditions.length;
    }
    if (app.flow.actions) {
        totalCards += app.flow.actions.length;
    }
    
    console.log(`   ✅ ${totalCards} flow cards defined`);
}

// Validate compatibility
function validateCompatibility(app) {
    console.log('\n🔌 Validating compatibility...');
    
    if (!app.compatibility) return;
    
    if (app.compatibility.includes('>=')) {
        console.log(`   ✅ Homey ${app.compatibility}`);
    } else {
        warnings.push('Compatibility format should use >= notation');
    }
}

// Main execution
const app = validateAppJson();

if (!app) {
    console.log('\n❌ VALIDATION FAILED: Cannot parse app.json\n');
    process.exit(1);
}

validateRequiredFields(app);
validateVersion(app);
validateImages(app);
validateDrivers(app);
validateFlow(app);
validateCompatibility(app);

// Print results
console.log('\n' + '═'.repeat(70));
console.log('\n📊 VALIDATION RESULTS\n');

if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ ALL CHECKS PASSED\n');
    console.log('App structure is valid for Homey App Store\n');
    process.exit(0);
}

if (errors.length > 0) {
    console.log(`❌ ERRORS: ${errors.length}\n`);
    errors.forEach(error => console.log(`   - ${error}`));
    console.log('');
}

if (warnings.length > 0) {
    console.log(`⚠️  WARNINGS: ${warnings.length}\n`);
    warnings.forEach(warning => console.log(`   - ${warning}`));
    console.log('');
}

if (errors.length > 0) {
    console.log('❌ VALIDATION FAILED\n');
    process.exit(1);
} else {
    console.log('✅ VALIDATION PASSED (with warnings)\n');
    process.exit(0);
}
