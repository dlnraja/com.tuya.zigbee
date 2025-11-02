#!/usr/bin/env node

/**
 * MASTER SCRIPT - APPLY ALL DISCOVERIES
 * 
 * Applies all patterns and best practices discovered during development:
 * 1. Unbrand terminology (remove "hybrid", brand names)
 * 2. Clean translations (simplify parentheses)
 * 3. Fix JSON formatting (quotes, structure)
 * 4. Harmonize architecture (consistent naming)
 * 5. Validate everything
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================
// CONFIGURATION
// ============================================================

const config = {
    driversPath: path.join(__dirname, '..', '..', 'drivers'),
    appJsonPath: path.join(__dirname, '..', '..', 'app.json'),
    reportsDir: path.join(__dirname, '..', '..', 'reports'),
    dryRun: process.argv.includes('--dry-run'),
    verbose: process.argv.includes('--verbose')
};

const stats = {
    driversProcessed: 0,
    translationsFixed: 0,
    jsonFixed: 0,
    pathsUpdated: 0,
    errors: []
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function log(message, level = 'info') {
    const prefix = {
        info: '   ',
        success: '✅ ',
        warning: '⚠️  ',
        error: '❌ '
    }[level];
    
    console.log(prefix + message);
}

function logVerbose(message) {
    if (config.verbose) {
        console.log('   → ' + message);
    }
}

// ============================================================
// DISCOVERY 1: UNBRAND TERMINOLOGY
// ============================================================

function unbrandTerminology(driverPath, driverName) {
    const composeFile = path.join(driverPath, 'driver.compose.json');
    if (!fs.existsSync(composeFile)) return false;
    
    try {
        let content = fs.readFileSync(composeFile, 'utf8');
        let obj = JSON.parse(content);
        let modified = false;
        
        // Remove "Hybrid", "MOES", "Nedis", etc. from names
        const brandTerms = [
            /\s*\(Hybrid\)/gi,
            /\s*Hybrid\s*/gi,
            /\s*\(MOES\)/gi,
            /\s*MOES\s*/gi,
            /\s*\(Nedis\)/gi,
            /\s*Nedis\s*/gi,
            /\s*\(Ewelink\)/gi,
            /\s*\(Immax\)/gi,
            /\s*\(Lidl\)/gi
        ];
        
        if (obj.name) {
            Object.keys(obj.name).forEach(lang => {
                const original = obj.name[lang];
                let cleaned = original;
                
                brandTerms.forEach(term => {
                    cleaned = cleaned.replace(term, '');
                });
                
                // Clean up double spaces
                cleaned = cleaned.replace(/\s+/g, ' ').trim();
                
                if (cleaned !== original) {
                    obj.name[lang] = cleaned;
                    modified = true;
                    logVerbose(`Unbranded: "${original}" → "${cleaned}"`);
                }
            });
        }
        
        if (modified && !config.dryRun) {
            fs.writeFileSync(composeFile, JSON.stringify(obj, null, 2), 'utf8');
        }
        
        return modified;
    } catch (error) {
        stats.errors.push(`Unbrand ${driverName}: ${error.message}`);
        return false;
    }
}

// ============================================================
// DISCOVERY 2: CLEAN TRANSLATIONS
// ============================================================

function cleanTranslations(driverPath, driverName) {
    const composeFile = path.join(driverPath, 'driver.compose.json');
    if (!fs.existsSync(composeFile)) return false;
    
    try {
        let content = fs.readFileSync(composeFile, 'utf8');
        let obj = JSON.parse(content);
        let modified = false;
        
        // Process settings
        if (obj.settings && Array.isArray(obj.settings)) {
            obj.settings.forEach(setting => {
                // Clean battery type labels
                if (setting.values && Array.isArray(setting.values)) {
                    setting.values.forEach(value => {
                        if (value.label) {
                            Object.keys(value.label).forEach(lang => {
                                const original = value.label[lang];
                                let cleaned = original;
                                
                                // Remove voltage info: "CR2032 (3V)" → "CR2032"
                                cleaned = cleaned.replace(/\s*\([0-9.]+V[^\)]*\)/g, '');
                                
                                if (cleaned !== original) {
                                    value.label[lang] = cleaned;
                                    modified = true;
                                }
                            });
                        }
                    });
                }
                
                // Clean setting labels
                if (setting.label) {
                    Object.keys(setting.label).forEach(lang => {
                        const original = setting.label[lang];
                        let cleaned = original;
                        
                        // Remove unit parentheses (but keep descriptive ones)
                        if (!cleaned.includes('More') && !cleaned.includes('Longer') && 
                            !cleaned.includes('Plus') && !cleaned.includes('économie')) {
                            cleaned = cleaned.replace(/\s*\(%\)/g, '');
                            cleaned = cleaned.replace(/\s*\(hours?\)/gi, '');
                            cleaned = cleaned.replace(/\s*\(heures?\)/gi, '');
                            cleaned = cleaned.replace(/\s*\(minutes?\)/gi, '');
                            cleaned = cleaned.replace(/\s*\(seconds?\)/gi, '');
                        }
                        
                        if (cleaned !== original) {
                            setting.label[lang] = cleaned;
                            modified = true;
                        }
                    });
                }
                
                // Clean hints
                if (setting.hint) {
                    Object.keys(setting.hint).forEach(lang => {
                        const original = setting.hint[lang];
                        let cleaned = original;
                        
                        // Remove "AC/DC devices only" redundancy
                        cleaned = cleaned.replace(/\(AC\/DC devices only\)/g, '');
                        cleaned = cleaned.replace(/\(appareils AC\/DC seulement\)/g, '');
                        cleaned = cleaned.replace(/\s+/g, ' ').trim();
                        
                        if (cleaned !== original) {
                            setting.hint[lang] = cleaned;
                            modified = true;
                        }
                    });
                }
            });
        }
        
        if (modified && !config.dryRun) {
            fs.writeFileSync(composeFile, JSON.stringify(obj, null, 2), 'utf8');
            stats.translationsFixed++;
        }
        
        return modified;
    } catch (error) {
        stats.errors.push(`Clean translations ${driverName}: ${error.message}`);
        return false;
    }
}

// ============================================================
// DISCOVERY 3: FIX JSON FORMATTING
// ============================================================

function fixJsonFormatting(driverPath, driverName) {
    const composeFile = path.join(driverPath, 'driver.compose.json');
    if (!fs.existsSync(composeFile)) return false;
    
    try {
        let content = fs.readFileSync(composeFile, 'utf8');
        let modified = false;
        
        // Fix single quotes in manufacturerName arrays
        const singleQuotePattern = /'(_TZ[^']+)'/g;
        if (content.match(singleQuotePattern)) {
            content = content.replace(singleQuotePattern, '"$1"');
            modified = true;
            logVerbose(`Fixed quotes in ${driverName}`);
        }
        
        // Validate JSON
        try {
            JSON.parse(content);
            
            if (modified && !config.dryRun) {
                fs.writeFileSync(composeFile, content, 'utf8');
                stats.jsonFixed++;
            }
            
            return modified;
        } catch (parseError) {
            stats.errors.push(`JSON invalid after fix ${driverName}: ${parseError.message}`);
            return false;
        }
    } catch (error) {
        stats.errors.push(`Fix JSON ${driverName}: ${error.message}`);
        return false;
    }
}

// ============================================================
// DISCOVERY 4: HARMONIZE CAPABILITIES
// ============================================================

function harmonizeCapabilities(driverPath, driverName) {
    const composeFile = path.join(driverPath, 'driver.compose.json');
    if (!fs.existsSync(composeFile)) return false;
    
    try {
        let content = fs.readFileSync(composeFile, 'utf8');
        let obj = JSON.parse(content);
        let modified = false;
        
        // Fix onoff.buttonX → onoff.gangX
        if (obj.capabilities && Array.isArray(obj.capabilities)) {
            obj.capabilities = obj.capabilities.map(cap => {
                if (typeof cap === 'string' && cap.startsWith('onoff.button')) {
                    const gangNum = cap.replace('onoff.button', '');
                    const newCap = `onoff.gang${gangNum}`;
                    logVerbose(`Capability: ${cap} → ${newCap}`);
                    modified = true;
                    return newCap;
                }
                return cap;
            });
        }
        
        if (modified && !config.dryRun) {
            fs.writeFileSync(composeFile, JSON.stringify(obj, null, 2), 'utf8');
        }
        
        return modified;
    } catch (error) {
        stats.errors.push(`Harmonize capabilities ${driverName}: ${error.message}`);
        return false;
    }
}

// ============================================================
// DISCOVERY 5: VALIDATE ARCHITECTURE
// ============================================================

function validateArchitecture(driverPath, driverName) {
    const checks = {
        hasCompose: fs.existsSync(path.join(driverPath, 'driver.compose.json')),
        hasDevice: fs.existsSync(path.join(driverPath, 'device.js')),
        hasDriver: fs.existsSync(path.join(driverPath, 'driver.js')),
        hasImages: fs.existsSync(path.join(driverPath, 'assets', 'images')),
        hasPair: fs.existsSync(path.join(driverPath, 'pair'))
    };
    
    const warnings = [];
    
    if (!checks.hasCompose) warnings.push('Missing driver.compose.json');
    if (!checks.hasDevice) warnings.push('Missing device.js');
    if (!checks.hasImages) warnings.push('Missing assets/images');
    
    if (warnings.length > 0) {
        logVerbose(`${driverName}: ${warnings.join(', ')}`);
    }
    
    return warnings.length === 0;
}

// ============================================================
// MAIN EXECUTION
// ============================================================

console.log('\n🚀 MASTER SCRIPT - APPLYING ALL DISCOVERIES\n');
console.log('═'.repeat(70));

if (config.dryRun) {
    log('DRY RUN MODE - No changes will be saved', 'warning');
}

console.log('\n📁 Processing drivers...\n');

const drivers = fs.readdirSync(config.driversPath).filter(file => {
    return fs.statSync(path.join(config.driversPath, file)).isDirectory();
});

drivers.forEach(driver => {
    const driverPath = path.join(config.driversPath, driver);
    stats.driversProcessed++;
    
    if (config.verbose) {
        console.log(`\n📦 ${driver}`);
    }
    
    // Apply all discoveries
    const results = {
        unbranded: unbrandTerminology(driverPath, driver),
        translationsCleaned: cleanTranslations(driverPath, driver),
        jsonFixed: fixJsonFormatting(driverPath, driver),
        capabilitiesHarmonized: harmonizeCapabilities(driverPath, driver),
        architectureValid: validateArchitecture(driverPath, driver)
    };
    
    // Log if any changes
    if (Object.values(results).some(r => r === true)) {
        const changes = Object.keys(results).filter(k => results[k] === true);
        if (!config.verbose) {
            log(`${driver}: ${changes.join(', ')}`, 'success');
        }
    }
});

// ============================================================
// VALIDATION
// ============================================================

console.log('\n' + '═'.repeat(70));
console.log('\n🔍 Running validation...\n');

if (!config.dryRun) {
    try {
        // Clean cache
        const cacheDirs = ['.homeycompose', '.homeybuild', 'assets/drivers.json'];
        cacheDirs.forEach(dir => {
            const fullPath = path.join(__dirname, '..', '..', dir);
            if (fs.existsSync(fullPath)) {
                fs.rmSync(fullPath, { recursive: true, force: true });
                log(`Cleaned: ${dir}`, 'success');
            }
        });
        
        // Run Homey validation
        log('Running: homey app validate --level publish', 'info');
        const output = execSync('homey app validate --level publish', {
            cwd: path.join(__dirname, '..', '..'),
            encoding: 'utf8'
        });
        
        if (output.includes('validated successfully')) {
            log('Validation PASSED!', 'success');
        } else {
            log('Validation completed (check output)', 'warning');
        }
    } catch (error) {
        log('Validation failed', 'error');
        if (config.verbose) {
            console.log(error.stdout || error.message);
        }
    }
}

// ============================================================
// REPORT
// ============================================================

console.log('\n' + '═'.repeat(70));
console.log('\n📊 RESULTS\n');

console.log(`Drivers processed:      ${stats.driversProcessed}`);
console.log(`Translations fixed:     ${stats.translationsFixed}`);
console.log(`JSON fixed:             ${stats.jsonFixed}`);

if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
    if (config.verbose) {
        stats.errors.forEach(err => console.log(`   - ${err}`));
    }
}

// Save report
if (!config.dryRun) {
    const report = {
        date: new Date().toISOString(),
        stats,
        config: {
            dryRun: config.dryRun,
            verbose: config.verbose
        }
    };
    
    if (!fs.existsSync(config.reportsDir)) {
        fs.mkdirSync(config.reportsDir, { recursive: true });
    }
    
    const reportPath = path.join(config.reportsDir, 'master-script-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved: ${reportPath}`);
}

console.log('\n✅ MASTER SCRIPT COMPLETE!\n');

process.exit(stats.errors.length > 0 ? 1 : 0);
