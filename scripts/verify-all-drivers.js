#!/usr/bin/env node

/**
 * Script de vérification complète de tous les drivers
 * Version: 1.0.12-20250729-1405
 * Objectif: Vérifier la validité JSON, présence des fichiers requis, structure
 * Spécificités: Ajoute logs, corrige automatiquement si possible
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    driversPath: './drivers',
    logFile: './logs/verify-drivers.log',
    reportFile: './reports/verify-report.json',
    maxErrors: 50, // Limite d'erreurs avant fallback
    autoFix: true,
    createBackup: true
};

// Classes de gestion d'erreurs
class DriverError extends Error {
    constructor(message, driverPath, errorType) {
        super(message);
        this.driverPath = driverPath;
        this.errorType = errorType;
        this.timestamp = new Date().toISOString();
    }
}

class VerificationResult {
    constructor() {
        this.totalDrivers = 0;
        this.validDrivers = 0;
        this.fixedDrivers = 0;
        this.errors = [];
        this.warnings = [];
        this.fixes = [];
        this.timestamp = new Date().toISOString();
    }

    addError(error) {
        this.errors.push(error);
    }

    addWarning(warning) {
        this.warnings.push(warning);
    }

    addFix(fix) {
        this.fixes.push(fix);
    }

    toJSON() {
        return {
            timestamp: this.timestamp,
            statistics: {
                total: this.totalDrivers,
                valid: this.validDrivers,
                fixed: this.fixedDrivers,
                errors: this.errors.length,
                warnings: this.warnings.length,
                fixes: this.fixes.length
            },
            errors: this.errors,
            warnings: this.warnings,
            fixes: this.fixes
        };
    }
}

// Fonctions utilitaires
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    
    // Écriture dans le fichier de log
    fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
}

function createBackup() {
    if (!CONFIG.createBackup) return;
    
    const backupPath = `./backups/drivers-backup-${Date.now()}`;
    try {
        execSync(`cp -r ${CONFIG.driversPath} ${backupPath}`);
        log(`Backup créé: ${backupPath}`);
    } catch (error) {
        log(`Erreur lors de la création du backup: ${error.message}`, 'ERROR');
    }
}

function ensureDirectories() {
    const dirs = ['./logs', './reports', './backups'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

// Fonctions de vérification
function validateJSON(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        JSON.parse(content);
        return true;
    } catch (error) {
        return false;
    }
}

function checkRequiredFiles(driverPath) {
    const requiredFiles = [
        'device.js',
        'driver.compose.json',
        'driver.settings.compose.json'
    ];
    
    const missingFiles = [];
    const invalidFiles = [];
    
    requiredFiles.forEach(file => {
        const filePath = path.join(driverPath, file);
        if (!fs.existsSync(filePath)) {
            missingFiles.push(file);
        } else if (file.endsWith('.json') && !validateJSON(filePath)) {
            invalidFiles.push(file);
        }
    });
    
    return { missingFiles, invalidFiles };
}

function validateDeviceJS(driverPath) {
    const deviceFile = path.join(driverPath, 'device.js');
    if (!fs.existsSync(deviceFile)) return false;
    
    try {
        const content = fs.readFileSync(deviceFile, 'utf8');
        
        // Vérifications SDK3
        const sdk3Checks = [
            content.includes('extends ZigbeeDevice'),
            content.includes('async onInit'),
            content.includes('async onUninit'),
            content.includes('this.startPolling'),
            content.includes('this.stopPolling')
        ];
        
        return sdk3Checks.every(check => check);
    } catch (error) {
        return false;
    }
}

function validateComposeJSON(driverPath) {
    const composeFile = path.join(driverPath, 'driver.compose.json');
    if (!fs.existsSync(composeFile)) return false;
    
    try {
        const content = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
        
        // Vérifications de base
        const requiredFields = ['id', 'title', 'category', 'capabilities'];
        return requiredFields.every(field => content.hasOwnProperty(field));
    } catch (error) {
        return false;
    }
}

// Fonctions de correction automatique
function autoFixDeviceJS(driverPath) {
    const deviceFile = path.join(driverPath, 'device.js');
    const driverName = path.basename(driverPath);
    
    try {
        let content = fs.readFileSync(deviceFile, 'utf8');
        let modified = false;
        
        // Correction SDK3
        if (!content.includes('extends ZigbeeDevice')) {
            content = content.replace(/extends Homey\.Device/g, 'extends ZigbeeDevice');
            modified = true;
        }
        
        if (!content.includes('async onInit')) {
            const onInitMethod = `
    async onInit() {
        await super.onInit();
        this.startPolling();
    }`;
            content = content.replace(/class.*\{/, `class ${driverName}Device extends ZigbeeDevice {${onInitMethod}`);
            modified = true;
        }
        
        if (!content.includes('async onUninit')) {
            const onUninitMethod = `
    async onUninit() {
        this.stopPolling();
        await super.onUninit();
    }`;
            content = content.replace(/module\.exports.*/, `${onUninitMethod}
}

module.exports = ${driverName}Device;`);
            modified = true;
        }
        
        if (modified) {
            fs.writeFileSync(deviceFile, content);
            return true;
        }
        
        return false;
    } catch (error) {
        return false;
    }
}

function autoFixComposeJSON(driverPath) {
    const composeFile = path.join(driverPath, 'driver.compose.json');
    const driverName = path.basename(driverPath);
    
    try {
        let content = {};
        if (fs.existsSync(composeFile)) {
            content = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
        }
        
        // Correction des champs manquants
        if (!content.id) content.id = driverName;
        if (!content.title) content.title = `${driverName} Device`;
        if (!content.category) content.category = 'controllers';
        if (!content.capabilities) content.capabilities = ['onoff'];
        if (!content.images) {
            content.images = {
                small: 'assets/images/small.png',
                large: 'assets/images/large.png'
            };
        }
        
        fs.writeFileSync(composeFile, JSON.stringify(content, null, 2));
        return true;
    } catch (error) {
        return false;
    }
}

function autoFixSettingsJSON(driverPath) {
    const settingsFile = path.join(driverPath, 'driver.settings.compose.json');
    const driverName = path.basename(driverPath);
    
    try {
        let content = {};
        if (fs.existsSync(settingsFile)) {
            content = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
        }
        
        // Correction des champs manquants
        if (!content.id) content.id = `${driverName}_settings`;
        if (!content.title) content.title = `${driverName} Settings`;
        if (!content.category) content.category = 'settings';
        
        fs.writeFileSync(settingsFile, JSON.stringify(content, null, 2));
        return true;
    } catch (error) {
        return false;
    }
}

// Fonction principale de vérification
function verifyDriver(driverPath, result) {
    const driverName = path.basename(driverPath);
    result.totalDrivers++;
    
    try {
        // Vérification des fichiers requis
        const { missingFiles, invalidFiles } = checkRequiredFiles(driverPath);
        
        if (missingFiles.length > 0) {
            result.addError(new DriverError(
                `Fichiers manquants: ${missingFiles.join(', ')}`,
                driverPath,
                'MISSING_FILES'
            ));
        }
        
        if (invalidFiles.length > 0) {
            result.addError(new DriverError(
                `Fichiers JSON invalides: ${invalidFiles.join(', ')}`,
                driverPath,
                'INVALID_JSON'
            ));
        }
        
        // Vérification du contenu
        if (!validateDeviceJS(driverPath)) {
            result.addWarning(new DriverError(
                'device.js non conforme SDK3',
                driverPath,
                'SDK3_NON_COMPLIANT'
            ));
        }
        
        if (!validateComposeJSON(driverPath)) {
            result.addWarning(new DriverError(
                'driver.compose.json invalide',
                driverPath,
                'INVALID_COMPOSE'
            ));
        }
        
        // Correction automatique si activée
        if (CONFIG.autoFix) {
            let fixed = false;
            
            if (autoFixDeviceJS(driverPath)) {
                result.addFix({
                    driver: driverName,
                    fix: 'device.js corrigé pour SDK3',
                    timestamp: new Date().toISOString()
                });
                fixed = true;
            }
            
            if (autoFixComposeJSON(driverPath)) {
                result.addFix({
                    driver: driverName,
                    fix: 'driver.compose.json corrigé',
                    timestamp: new Date().toISOString()
                });
                fixed = true;
            }
            
            if (autoFixSettingsJSON(driverPath)) {
                result.addFix({
                    driver: driverName,
                    fix: 'driver.settings.compose.json corrigé',
                    timestamp: new Date().toISOString()
                });
                fixed = true;
            }
            
            if (fixed) {
                result.fixedDrivers++;
            }
        }
        
        // Si aucune erreur critique, le driver est valide
        if (missingFiles.length === 0 && invalidFiles.length === 0) {
            result.validDrivers++;
        }
        
    } catch (error) {
        result.addError(new DriverError(
            `Erreur lors de la vérification: ${error.message}`,
            driverPath,
            'VERIFICATION_ERROR'
        ));
    }
}

// Fonction principale
function main() {
    log('Démarrage de la vérification des drivers...');
    
    // Initialisation
    ensureDirectories();
    createBackup();
    
    const result = new VerificationResult();
    
    try {
        // Récupération de tous les drivers
        const drivers = [];
        function scanDrivers(dir) {
            const items = fs.readdirSync(dir);
            items.forEach(item => {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    // Vérifier si c'est un driver (contient device.js)
                    if (fs.existsSync(path.join(fullPath, 'device.js'))) {
                        drivers.push(fullPath);
                    } else {
                        // Récursif pour les sous-dossiers
                        scanDrivers(fullPath);
                    }
                }
            });
        }
        
        scanDrivers(CONFIG.driversPath);
        log(`Trouvé ${drivers.length} drivers à vérifier`);
        
        // Vérification de chaque driver
        drivers.forEach(driverPath => {
            verifyDriver(driverPath, result);
            
            // Vérification de la limite d'erreurs
            if (result.errors.length >= CONFIG.maxErrors) {
                log(`Limite d'erreurs atteinte (${CONFIG.maxErrors}), arrêt de la vérification`, 'WARNING');
                return;
            }
        });
        
        // Génération du rapport
        fs.writeFileSync(CONFIG.reportFile, JSON.stringify(result.toJSON(), null, 2));
        
        // Affichage des résultats
        log('=== RÉSULTATS DE LA VÉRIFICATION ===');
        log(`Drivers totaux: ${result.totalDrivers}`);
        log(`Drivers valides: ${result.validDrivers}`);
        log(`Drivers corrigés: ${result.fixedDrivers}`);
        log(`Erreurs: ${result.errors.length}`);
        log(`Avertissements: ${result.warnings.length}`);
        log(`Corrections: ${result.fixes.length}`);
        
        if (result.errors.length > 0) {
            log('=== ERREURS DÉTECTÉES ===');
            result.errors.forEach(error => {
                log(`- ${error.driverPath}: ${error.message}`, 'ERROR');
            });
        }
        
        if (result.fixes.length > 0) {
            log('=== CORRECTIONS APPLIQUÉES ===');
            result.fixes.forEach(fix => {
                log(`- ${fix.driver}: ${fix.fix}`, 'INFO');
            });
        }
        
        // Décision de fallback si trop d'erreurs
        if (result.errors.length >= CONFIG.maxErrors) {
            log('Trop d\'erreurs détectées, activation du mode fallback', 'ERROR');
            process.exit(1); // Signal pour déclencher le fallback
        }
        
        log('Vérification terminée avec succès');
        
    } catch (error) {
        log(`Erreur critique: ${error.message}`, 'ERROR');
        process.exit(1);
    }
}

// Gestion des signaux pour arrêt propre
process.on('SIGINT', () => {
    log('Arrêt demandé par l\'utilisateur');
    process.exit(0);
});

process.on('SIGTERM', () => {
    log('Arrêt demandé par le système');
    process.exit(0);
});

// Exécution
if (require.main === module) {
    main();
}

module.exports = {
    verifyDriver,
    validateDeviceJS,
    validateComposeJSON,
    autoFixDeviceJS,
    autoFixComposeJSON,
    autoFixSettingsJSON,
    VerificationResult,
    DriverError
};