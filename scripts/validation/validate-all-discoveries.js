#!/usr/bin/env node

/**
 * VALIDATION SCRIPT - ALL DISCOVERIES
 * Validates entire app against discovered best practices
 */

const fs = require('fs');
const path = require('path');
const DriverUtils = require('../../lib/utils/DriverUtils');

// ============================================================
// CONFIGURATION
// ============================================================

const config = {
    driversPath: path.join(__dirname, '..', '..', 'drivers'),
    appJsonPath: path.join(__dirname, '..', '..', 'app.json'),
    reportsDir: path.join(__dirname, '..', '..', 'reports', 'validation')
};

const results = {
    drivers: [],
    summary: {
        total: 0,
        valid: 0,
        warnings: 0,
        errors: 0
    },
    issues: {
        branding: [],
        naming: [],
        translations: [],
        json: [],
        capabilities: [],
        structure: [],
        manufacturerIds: []
    }
};

// ============================================================
// VALIDATION FUNCTIONS
// ============================================================

function validateDriver(driverPath, driverName) {
    const validation = {
        name: driverName,
        valid: true,
        warnings: [],
        errors: []
    };
    
    // 1. Validate naming convention
    const nameValidation = DriverUtils.validateDriverName(driverName);
    if (!nameValidation.valid) {
        validation.errors.push(`Naming violations: ${nameValidation.violations.join(', ')}`);
        results.issues.naming.push({ driver: driverName, violations: nameValidation.violations });
        validation.valid = false;
    }
    
    // 2. Check if unbranded
    if (!DriverUtils.isUnbranded(driverName)) {
        validation.warnings.push('Driver name contains brand terminology');
        results.issues.branding.push(driverName);
    }
    
    // 3. Validate structure
    const structure = DriverUtils.validateDriverStructure(driverPath);
    if (!structure.valid) {
        validation.errors.push(`Missing required: ${structure.missingRequired.join(', ')}`);
        results.issues.structure.push({ driver: driverName, missing: structure.missingRequired });
        validation.valid = false;
    }
    
    // 4. Validate driver.compose.json
    const compose = DriverUtils.getDriverCompose(driverPath);
    if (compose) {
        // Check JSON validity
        const composePath = path.join(driverPath, 'driver.compose.json');
        if (!DriverUtils.isValidJson(composePath)) {
            validation.errors.push('Invalid JSON in driver.compose.json');
            results.issues.json.push(driverName);
            validation.valid = false;
        }
        
        // Check capabilities
        if (compose.capabilities) {
            const capValidation = DriverUtils.validateMultiGang(compose.capabilities);
            if (!capValidation.valid) {
                validation.warnings.push(`Capabilities: ${capValidation.error}`);
                results.issues.capabilities.push({
                    driver: driverName,
                    error: capValidation.error,
                    fix: capValidation.fix
                });
            }
        }
        
        // Check manufacturer IDs
        if (compose.zigbee && compose.zigbee.manufacturerName) {
            const ids = compose.zigbee.manufacturerName;
            const invalidIds = ids.filter(id => !DriverUtils.isValidManufacturerId(id));
            
            if (invalidIds.length > 0) {
                validation.warnings.push(`Invalid manufacturer IDs: ${invalidIds.length}`);
                results.issues.manufacturerIds.push({
                    driver: driverName,
                    invalidIds
                });
            }
        }
        
        // Check translations
        if (compose.name) {
            Object.keys(compose.name).forEach(lang => {
                const name = compose.name[lang];
                const cleaned = DriverUtils.unbrandText(name);
                
                if (name !== cleaned) {
                    validation.warnings.push(`Translation contains brand terms: ${lang}`);
                    results.issues.translations.push({
                        driver: driverName,
                        lang,
                        original: name,
                        cleaned
                    });
                }
            });
        }
        
        // Check settings labels
        if (compose.settings) {
            compose.settings.forEach((setting, index) => {
                if (setting.label) {
                    Object.keys(setting.label).forEach(lang => {
                        const label = setting.label[lang];
                        const cleaned = DriverUtils.cleanLabel(label);
                        
                        if (label !== cleaned) {
                            validation.warnings.push(`Setting ${index} has unclean label: ${lang}`);
                        }
                    });
                }
                
                // Check battery labels
                if (setting.values) {
                    setting.values.forEach(value => {
                        if (value.label) {
                            Object.keys(value.label).forEach(lang => {
                                const label = value.label[lang];
                                const cleaned = DriverUtils.cleanBatteryLabel(label);
                                
                                if (label !== cleaned) {
                                    validation.warnings.push(`Battery label unclean: ${value.id}`);
                                }
                            });
                        }
                    });
                }
            });
        }
    } else {
        validation.errors.push('Cannot read driver.compose.json');
        validation.valid = false;
    }
    
    // Update summary
    if (validation.errors.length > 0) {
        results.summary.errors++;
    } else if (validation.warnings.length > 0) {
        results.summary.warnings++;
    } else {
        results.summary.valid++;
    }
    
    return validation;
}

// ============================================================
// MAIN EXECUTION
// ============================================================

console.log('\n🔍 VALIDATION - ALL DISCOVERIES\n');
console.log('═'.repeat(70));

console.log('\n📁 Validating drivers...\n');

const drivers = fs.readdirSync(config.driversPath).filter(file => {
    return fs.statSync(path.join(config.driversPath, file)).isDirectory();
});

results.summary.total = drivers.length;

drivers.forEach(driver => {
    const driverPath = path.join(config.driversPath, driver);
    const validation = validateDriver(driverPath, driver);
    results.drivers.push(validation);
    
    // Log issues
    if (validation.errors.length > 0) {
        console.log(`❌ ${driver}`);
        validation.errors.forEach(err => console.log(`   - ${err}`));
    } else if (validation.warnings.length > 0) {
        console.log(`⚠️  ${driver}`);
        validation.warnings.forEach(warn => console.log(`   - ${warn}`));
    }
});

// ============================================================
// SUMMARY
// ============================================================

console.log('\n' + '═'.repeat(70));
console.log('\n📊 VALIDATION SUMMARY\n');

console.log(`Total drivers:          ${results.summary.total}`);
console.log(`✅ Valid:               ${results.summary.valid}`);
console.log(`⚠️  Warnings:           ${results.summary.warnings}`);
console.log(`❌ Errors:              ${results.summary.errors}`);

// Issue breakdown
console.log('\n📋 ISSUES BREAKDOWN\n');

const issueTypes = Object.keys(results.issues);
issueTypes.forEach(type => {
    const count = results.issues[type].length;
    if (count > 0) {
        console.log(`   ${type}: ${count}`);
    }
});

// ============================================================
// RECOMMENDATIONS
// ============================================================

console.log('\n💡 RECOMMENDATIONS\n');

if (results.issues.branding.length > 0) {
    console.log(`✓ Fix ${results.issues.branding.length} drivers with brand terminology`);
    console.log(`  Run: node scripts/master/apply-all-discoveries.js`);
}

if (results.issues.capabilities.length > 0) {
    console.log(`✓ Fix ${results.issues.capabilities.length} drivers with capability issues`);
    results.issues.capabilities.forEach(issue => {
        if (issue.fix) {
            console.log(`  ${issue.driver}: ${issue.fix}`);
        }
    });
}

if (results.issues.translations.length > 0) {
    console.log(`✓ Clean ${results.issues.translations.length} translation issues`);
    console.log(`  Run: node scripts/master/apply-all-discoveries.js`);
}

if (results.issues.json.length > 0) {
    console.log(`✓ Fix ${results.issues.json.length} JSON formatting issues`);
    console.log(`  Run: node scripts/fixes/fix-json-quotes.js`);
}

// ============================================================
// SAVE REPORT
// ============================================================

if (!fs.existsSync(config.reportsDir)) {
    fs.mkdirSync(config.reportsDir, { recursive: true });
}

const reportPath = path.join(config.reportsDir, `validation-report-${Date.now()}.json`);
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

console.log(`\n📄 Report saved: ${reportPath}\n`);

// Exit code
const exitCode = results.summary.errors > 0 ? 1 : 0;
process.exit(exitCode);
