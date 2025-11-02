#!/usr/bin/env node

/**
 * UNBRAND + HARMONIZATION FIX
 * 
 * Actions:
 * 1. Remove "hybrid" from driver folder names
 * 2. Remove "Hybrid" from all translations
 * 3. Clean up unnecessary parentheses in technical labels
 * 4. Harmonize naming conventions
 */

const fs = require('fs');
const path = require('path');

const driversPath = path.join(__dirname, '..', '..', 'drivers');
const fixes = [];
let errors = [];

console.log('\n🔍 UNBRAND + HARMONIZATION ANALYSIS\n');
console.log('═'.repeat(60));

// ============================================================
// STEP 1: Find "hybrid" in folder names
// ============================================================

const hybridDrivers = [
    'switch_hybrid_1gang',
    'switch_hybrid_2gang',
    'switch_hybrid_2gang_alt',
    'switch_hybrid_3gang',
    'switch_hybrid_4gang',
    'water_valve_smart_hybrid'
];

console.log('\n📁 HYBRID DRIVERS TO RENAME:\n');

hybridDrivers.forEach(driver => {
    const oldPath = path.join(driversPath, driver);
    const newName = driver.replace('_hybrid', '');
    const newPath = path.join(driversPath, newName);
    
    if (fs.existsSync(oldPath)) {
        console.log(`   ❌ ${driver} → ${newName}`);
        fixes.push({
            type: 'renameDriver',
            oldPath,
            newPath,
            oldName: driver,
            newName
        });
    }
});

// ============================================================
// STEP 2: Remove "Hybrid" from translations
// ============================================================

console.log('\n📝 REMOVING "HYBRID" FROM TRANSLATIONS:\n');

function processDriverTranslations(driverPath, driverName) {
    const composeFile = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composeFile)) return;
    
    try {
        let content = fs.readFileSync(composeFile, 'utf8');
        let modified = false;
        
        // Remove (Hybrid) and "Hybrid" from translations
        const replacements = [
            { from: / \(Hybrid\)/g, to: '' },
            { from: /\(Hybrid\) /g, to: '' },
            { from: / Hybrid /g, to: ' ' },
            { from: /"Hybrid /g, to: '"' },
            { from: / Hybrid"/g, to: '"' }
        ];
        
        replacements.forEach(({ from, to }) => {
            if (content.match(from)) {
                content = content.replace(from, to);
                modified = true;
            }
        });
        
        if (modified) {
            console.log(`   ✅ ${driverName}`);
            fixes.push({
                type: 'removeHybrid',
                file: composeFile,
                driver: driverName
            });
            fs.writeFileSync(composeFile, content, 'utf8');
        }
    } catch (error) {
        errors.push(`Error processing ${driverName}: ${error.message}`);
    }
}

// ============================================================
// STEP 3: Simplify technical parentheses
// ============================================================

console.log('\n🔧 SIMPLIFYING TECHNICAL PARENTHESES:\n');

function simplifyParentheses(driverPath, driverName) {
    const composeFile = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composeFile)) return;
    
    try {
        let content = fs.readFileSync(composeFile, 'utf8');
        let obj = JSON.parse(content);
        let modified = false;
        
        // Process settings if they exist
        if (obj.settings && Array.isArray(obj.settings)) {
            obj.settings.forEach(setting => {
                // Battery type labels - simplify but keep info
                if (setting.values && Array.isArray(setting.values)) {
                    setting.values.forEach(value => {
                        if (value.label) {
                            // CR2032 (3V Button Cell) → CR2032
                            // AAA (1.5V) → AAA
                            Object.keys(value.label).forEach(lang => {
                                const original = value.label[lang];
                                let newLabel = original;
                                
                                // Remove voltage info from battery labels
                                newLabel = newLabel.replace(/ \([0-9.]+V[^\)]*\)/g, '');
                                
                                if (newLabel !== original) {
                                    value.label[lang] = newLabel;
                                    modified = true;
                                }
                            });
                        }
                    });
                }
                
                // Setting labels - keep useful parentheses, remove redundant ones
                if (setting.label) {
                    Object.keys(setting.label).forEach(lang => {
                        const original = setting.label[lang];
                        let newLabel = original;
                        
                        // Remove (%) from "Low Battery Threshold (%)"
                        // Remove (hours) from "Battery Report Interval (hours)"
                        // But KEEP (More responsive), (Longer battery), etc.
                        
                        // Only remove unit parentheses, not descriptive ones
                        if (newLabel.match(/Threshold \(%\)/)) {
                            newLabel = newLabel.replace(/ \(%\)/g, '');
                            modified = true;
                        }
                        if (newLabel.match(/Interval \(hours?\)/i)) {
                            newLabel = newLabel.replace(/ \(hours?\)/i, '');
                            modified = true;
                        }
                        if (newLabel.match(/Interval \(heures?\)/i)) {
                            newLabel = newLabel.replace(/ \(heures?\)/i, '');
                            modified = true;
                        }
                        
                        if (newLabel !== original) {
                            setting.label[lang] = newLabel;
                        }
                    });
                }
            });
        }
        
        if (modified) {
            console.log(`   ✅ ${driverName}`);
            const newContent = JSON.stringify(obj, null, 2);
            fs.writeFileSync(composeFile, newContent, 'utf8');
            fixes.push({
                type: 'simplifyParentheses',
                file: composeFile,
                driver: driverName
            });
        }
    } catch (error) {
        errors.push(`Error simplifying ${driverName}: ${error.message}`);
    }
}

// ============================================================
// STEP 4: Process all drivers
// ============================================================

const allDrivers = fs.readdirSync(driversPath).filter(file => {
    return fs.statSync(path.join(driversPath, file)).isDirectory();
});

allDrivers.forEach(driver => {
    const driverPath = path.join(driversPath, driver);
    processDriverTranslations(driverPath, driver);
    simplifyParentheses(driverPath, driver);
});

// ============================================================
// STEP 5: Rename "hybrid" drivers
// ============================================================

console.log('\n📁 RENAMING HYBRID DRIVERS:\n');

fixes.filter(f => f.type === 'renameDriver').forEach(fix => {
    try {
        // Check if target already exists
        if (fs.existsSync(fix.newPath)) {
            console.log(`   ⚠️  ${fix.newName} already exists - merging needed`);
            errors.push(`Driver ${fix.newName} already exists`);
            return;
        }
        
        // Rename directory
        fs.renameSync(fix.oldPath, fix.newPath);
        console.log(`   ✅ ${fix.oldName} → ${fix.newName}`);
        
        // Update internal references in driver.compose.json
        const composeFile = path.join(fix.newPath, 'driver.compose.json');
        if (fs.existsSync(composeFile)) {
            let content = fs.readFileSync(composeFile, 'utf8');
            // Update paths
            content = content.replace(
                new RegExp(`/drivers/${fix.oldName}/`, 'g'),
                `/drivers/${fix.newName}/`
            );
            fs.writeFileSync(composeFile, content, 'utf8');
        }
        
    } catch (error) {
        errors.push(`Error renaming ${fix.oldName}: ${error.message}`);
    }
});

// ============================================================
// RESULTS
// ============================================================

console.log('\n' + '═'.repeat(60));
console.log('📊 RESULTS\n');

console.log(`✅ Total fixes applied: ${fixes.length}`);
console.log(`   - Renamed drivers: ${fixes.filter(f => f.type === 'renameDriver').length}`);
console.log(`   - Removed "Hybrid": ${fixes.filter(f => f.type === 'removeHybrid').length}`);
console.log(`   - Simplified labels: ${fixes.filter(f => f.type === 'simplifyParentheses').length}`);

if (errors.length > 0) {
    console.log(`\n⚠️  Errors: ${errors.length}`);
    errors.forEach(err => console.log(`   - ${err}`));
}

console.log('\n✅ UNBRAND + HARMONIZATION COMPLETE!\n');

// Save report
const report = {
    date: new Date().toISOString(),
    fixes: fixes.length,
    errors: errors.length,
    details: fixes,
    errorMessages: errors
};

const reportsDir = path.join(__dirname, '..', '..', 'reports');
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
}

fs.writeFileSync(
    path.join(reportsDir, 'unbrand-fixes.json'),
    JSON.stringify(report, null, 2)
);

console.log('📄 Report saved: reports/unbrand-fixes.json\n');

process.exit(errors.length > 0 ? 1 : 0);
