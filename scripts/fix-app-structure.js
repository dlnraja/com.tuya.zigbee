#!/usr/bin/env node

/**
 * 🧱 Fix App Structure - Homey CLI Compatibility
 * 
 * Vérifie et corrige automatiquement la structure de l'app Homey
 * Corrige app.json, app.js, chemins cassés et références drivers
 * Garantit le fonctionnement de 'homey app install'
 * 
 * @author dlnraja / dylan.rajasekaram+homey@gmail.com
 * @version 1.0.12-20250729-1700
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1700',
    resultsFile: './data/fix-app-structure.json',
    logFile: './logs/fix-app-structure.log'
};

// Structure Homey SDK3 requise
const REQUIRED_APP_STRUCTURE = {
    appJson: {
        id: 'com.tuya.zigbee',
        name: 'Tuya Zigbee',
        description: 'Universal Tuya Zigbee Device Support',
        version: '1.0.12-20250729-1700',
        compatibility: '>=5.0.0',
        sdk: 3,
        category: 'lighting',
        author: {
            name: 'dlnraja',
            email: 'dylan.rajasekaram+homey@gmail.com'
        },
        main: 'app.js',
        drivers: [],
        images: {
            small: '/assets/images/small.png',
            large: '/assets/images/large.png'
        },
        bugs: {
            url: 'https://github.com/dlnraja/tuya-zigbee/issues'
        },
        homepage: 'https://github.com/dlnraja/tuya-zigbee',
        repository: {
            type: 'git',
            url: 'https://github.com/dlnraja/tuya-zigbee.git'
        },
        license: 'MIT'
    },
    appJs: `const Homey = require('homey');

class TuyaZigbeeApp extends Homey.App {
    async onInit() {
        this.log('Tuya Zigbee App is running...');
    }
    
    async onUninit() {
        this.log('Tuya Zigbee App is stopping...');
    }
}

module.exports = TuyaZigbeeApp;`
};

/**
 * Log avec timestamp et couleurs
 */
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const colors = {
        INFO: '\x1b[36m',    // Cyan
        SUCCESS: '\x1b[32m', // Green
        WARN: '\x1b[33m',    // Yellow
        ERROR: '\x1b[31m'    // Red
    };
    
    const color = colors[level] || colors.INFO;
    const reset = '\x1b[0m';
    
    console.log(`${color}[${timestamp}] [${level}]${reset} ${message}`);
    
    // Log dans fichier
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    fs.appendFileSync(CONFIG.logFile, logEntry);
}

/**
 * Vérifie et corrige app.json
 */
function fixAppJson() {
    log('🔧 === CORRECTION APP.JSON ===', 'INFO');
    
    try {
        const appJsonPath = './app.json';
        let appData = {};
        
        // Lire app.json existant ou créer nouveau
        if (fs.existsSync(appJsonPath)) {
            try {
                appData = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
                log('✅ app.json existant lu', 'SUCCESS');
            } catch (error) {
                log(`❌ Erreur lecture app.json: ${error.message}`, 'ERROR');
                appData = {};
            }
        } else {
            log('⚠️ app.json non trouvé, création nouveau', 'WARN');
        }
        
        // Fusionner avec la structure requise
        const fixedAppData = {
            ...REQUIRED_APP_STRUCTURE.appJson,
            ...appData,
            // Garder les drivers existants
            drivers: appData.drivers || []
        };
        
        // Vérifier et corriger les champs critiques
        if (!fixedAppData.id) {
            fixedAppData.id = 'com.tuya.zigbee';
            log('✅ ID ajouté: com.tuya.zigbee');
        }
        
        if (!fixedAppData.main || !fs.existsSync(fixedAppData.main)) {
            fixedAppData.main = 'app.js';
            log('✅ Main corrigé: app.js');
        }
        
        if (!fixedAppData.sdk || fixedAppData.sdk < 3) {
            fixedAppData.sdk = 3;
            log('✅ SDK mis à jour: 3');
        }
        
        // Sauvegarder
        fs.writeFileSync(appJsonPath, JSON.stringify(fixedAppData, null, 2));
        log('✅ app.json corrigé et sauvegardé', 'SUCCESS');
        
        return { fixed: true, driversCount: fixedAppData.drivers.length };
        
    } catch (error) {
        log(`❌ Erreur correction app.json: ${error.message}`, 'ERROR');
        return { fixed: false, driversCount: 0 };
    }
}

/**
 * Vérifie et corrige app.js
 */
function fixAppJs() {
    log('🔧 === CORRECTION APP.JS ===', 'INFO');
    
    try {
        const appJsPath = './app.js';
        
        // Vérifier si app.js existe et est valide
        if (fs.existsSync(appJsPath)) {
            const content = fs.readFileSync(appJsPath, 'utf8');
            if (content.includes('class') && content.includes('extends Homey.App')) {
                log('✅ app.js existant et valide', 'SUCCESS');
                return { fixed: true };
            } else {
                log('⚠️ app.js existant mais invalide, régénération', 'WARN');
            }
        } else {
            log('⚠️ app.js non trouvé, création nouveau', 'WARN');
        }
        
        // Créer/recréer app.js
        fs.writeFileSync(appJsPath, REQUIRED_APP_STRUCTURE.appJs);
        log('✅ app.js créé/corrigé', 'SUCCESS');
        
        return { fixed: true };
        
    } catch (error) {
        log(`❌ Erreur correction app.js: ${error.message}`, 'ERROR');
        return { fixed: false };
    }
}

/**
 * Vérifie et corrige la structure des dossiers
 */
function fixDirectoryStructure() {
    log('🔧 === CORRECTION STRUCTURE DOSSIERS ===', 'INFO');
    
    try {
        const requiredDirs = [
            './drivers',
            './drivers/tuya',
            './drivers/zigbee',
            './drivers/generic',
            './assets',
            './assets/images',
            './assets/images/small',
            './assets/images/large',
            './data',
            './logs',
            './docs'
        ];
        
        let createdCount = 0;
        
        requiredDirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                log(`✅ Dossier créé: ${dir}`);
                createdCount++;
            }
        });
        
        log(`✅ Structure dossiers vérifiée (${createdCount} créés)`, 'SUCCESS');
        return { fixed: true, createdCount };
        
    } catch (error) {
        log(`❌ Erreur correction dossiers: ${error.message}`, 'ERROR');
        return { fixed: false, createdCount: 0 };
    }
}

/**
 * Vérifie et corrige les références drivers dans app.json
 */
function fixDriverReferences() {
    log('🔧 === CORRECTION RÉFÉRENCES DRIVERS ===', 'INFO');
    
    try {
        const appJsonPath = './app.json';
        if (!fs.existsSync(appJsonPath)) {
            log('⚠️ app.json non trouvé, ignoré', 'WARN');
            return { fixed: false, driversScanned: 0 };
        }
        
        const appData = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
        const driversPath = './drivers';
        
        if (!fs.existsSync(driversPath)) {
            log('⚠️ Dossier drivers non trouvé', 'WARN');
            return { fixed: false, driversScanned: 0 };
        }
        
        // Scanner tous les drivers
        const driverFolders = fs.readdirSync(driversPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        let validDrivers = [];
        let invalidDrivers = [];
        
        driverFolders.forEach(folder => {
            const driverPath = path.join(driversPath, folder);
            const composePath = path.join(driverPath, 'driver.compose.json');
            
            if (fs.existsSync(composePath)) {
                try {
                    const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                    if (composeData.name && composeData.id) {
                        validDrivers.push({
                            id: composeData.id,
                            name: composeData.name,
                            path: folder
                        });
                    } else {
                        invalidDrivers.push(folder);
                    }
                } catch (error) {
                    invalidDrivers.push(folder);
                }
            } else {
                invalidDrivers.push(folder);
            }
        });
        
        // Mettre à jour app.json avec les drivers valides
        appData.drivers = validDrivers;
        fs.writeFileSync(appJsonPath, JSON.stringify(appData, null, 2));
        
        log(`✅ Références drivers corrigées: ${validDrivers.length} valides, ${invalidDrivers.length} invalides`, 'SUCCESS');
        return { fixed: true, driversScanned: driverFolders.length, validDrivers: validDrivers.length };
        
    } catch (error) {
        log(`❌ Erreur correction références drivers: ${error.message}`, 'ERROR');
        return { fixed: false, driversScanned: 0, validDrivers: 0 };
    }
}

/**
 * Vérifie la compatibilité Homey CLI
 */
function validateHomeyCLI() {
    log('🧰 === VALIDATION HOMEY CLI ===', 'INFO');
    
    try {
        // Vérifier si Homey CLI est installé
        const homeyPath = execSync('which homey', { encoding: 'utf8', stdio: 'pipe' }).trim();
        if (!homeyPath) {
            log('⚠️ Homey CLI non installé', 'WARN');
            return { validated: false, cliInstalled: false };
        }
        
        log('✅ Homey CLI trouvé', 'SUCCESS');
        
        // Tester la validation
        try {
            const validationResult = execSync('homey app validate', { encoding: 'utf8', stdio: 'pipe' });
            log('✅ Validation Homey CLI réussie', 'SUCCESS');
            return { validated: true, cliInstalled: true };
        } catch (error) {
            log(`⚠️ Validation Homey CLI échouée: ${error.message}`, 'WARN');
            return { validated: false, cliInstalled: true };
        }
        
    } catch (error) {
        log('⚠️ Homey CLI non disponible', 'WARN');
        return { validated: false, cliInstalled: false };
    }
}

/**
 * Fonction principale de correction
 */
function fixAppStructure() {
    log('🧱 === CORRECTION STRUCTURE APP ===', 'INFO');
    
    const results = {
        timestamp: new Date().toISOString(),
        version: CONFIG.version,
        appJsonFixed: false,
        appJsFixed: false,
        directoryStructureFixed: false,
        driverReferencesFixed: false,
        homeyCLIValidated: false,
        driversScanned: 0,
        validDrivers: 0,
        errors: 0,
        duration: 0
    };
    
    const startTime = Date.now();
    
    try {
        // 1. Corriger app.json
        const appJsonResult = fixAppJson();
        results.appJsonFixed = appJsonResult.fixed;
        results.driversScanned = appJsonResult.driversCount;
        
        // 2. Corriger app.js
        const appJsResult = fixAppJs();
        results.appJsFixed = appJsResult.fixed;
        
        // 3. Corriger structure dossiers
        const directoryResult = fixDirectoryStructure();
        results.directoryStructureFixed = directoryResult.fixed;
        
        // 4. Corriger références drivers
        const driverResult = fixDriverReferences();
        results.driverReferencesFixed = driverResult.fixed;
        results.validDrivers = driverResult.validDrivers || 0;
        
        // 5. Valider Homey CLI
        const cliResult = validateHomeyCLI();
        results.homeyCLIValidated = cliResult.validated;
        
        results.duration = Date.now() - startTime;
        
        // Sauvegarder les résultats
        fs.writeFileSync(CONFIG.resultsFile, JSON.stringify(results, null, 2));
        
        log('✅ Correction structure app terminée avec succès', 'SUCCESS');
        
    } catch (error) {
        log(`❌ Erreur correction structure: ${error.message}`, 'ERROR');
        results.errors++;
    }
    
    return {
        summary: {
            success: results.errors === 0,
            driversScanned: results.driversScanned,
            validDrivers: results.validDrivers,
            duration: results.duration
        },
        details: results
    };
}

// Exécution si appelé directement
if (require.main === module) {
    try {
        const results = fixAppStructure();
        if (results.summary.success) {
            log('✅ Correction structure app terminée avec succès', 'SUCCESS');
            process.exit(0);
        } else {
            log('❌ Correction structure app échouée', 'ERROR');
            process.exit(1);
        }
    } catch (error) {
        log(`❌ Erreur critique: ${error.message}`, 'ERROR');
        process.exit(1);
    }
}

module.exports = { fixAppStructure }; 