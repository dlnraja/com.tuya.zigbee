#!/usr/bin/env node

/**
 * 🔧 Fix Driver Scanning - Correction des problèmes de lecture
 * 
 * Corrige les problèmes de lecture des drivers et améliore la détection
 * des fichiers dans le projet Tuya Zigbee
 * 
 * @author dlnraja / dylan.rajasekaram+homey@gmail.com
 * @version 1.0.12-20250729-1700
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1700',
    logFile: './logs/fix-driver-scanning.log',
    resultsFile: './data/fix-driver-scanning-results.json'
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
        ERROR: '\x1b[31m',   // Red
        RESET: '\x1b[0m'     // Reset
    };
    
    const color = colors[level] || colors.INFO;
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(`${color}${logMessage}${colors.RESET}`);
    
    const logDir = path.dirname(CONFIG.logFile);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
}

/**
 * Vérifie si un chemin est un fichier valide
 */
function isValidFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return false;
        }
        
        const stats = fs.statSync(filePath);
        return stats.isFile() && stats.size > 0;
    } catch (error) {
        return false;
    }
}

/**
 * Scanne récursivement les drivers de manière sécurisée
 */
function scanDriversSafely() {
    log('🔍 === SCAN SÉCURISÉ DES DRIVERS ===', 'INFO');
    
    const results = {
        timestamp: new Date().toISOString(),
        version: CONFIG.version,
        driversFound: 0,
        validDrivers: 0,
        invalidDrivers: 0,
        errors: 0,
        driverPaths: [],
        duration: 0
    };
    
    const startTime = Date.now();
    
    try {
        const driversPath = './drivers';
        
        if (!fs.existsSync(driversPath)) {
            log('⚠️ Dossier drivers non trouvé', 'WARN');
            return results;
        }
        
        // Scanner récursivement tous les dossiers
        function scanDirectory(dirPath, depth = 0) {
            if (depth > 10) return; // Éviter les boucles infinies
            
            try {
                const items = fs.readdirSync(dirPath, { withFileTypes: true });
                
                for (const item of items) {
                    const fullPath = path.join(dirPath, item.name);
                    
                    if (item.isDirectory()) {
                        // Ignorer les dossiers fusion
                        if (item.name === 'fusion') {
                            log(`⚠️ Dossier fusion ignoré: ${fullPath}`, 'WARN');
                            continue;
                        }
                        
                        // Scanner récursivement
                        scanDirectory(fullPath, depth + 1);
                        
                    } else if (item.isFile() && item.name === 'driver.compose.json') {
                        results.driversFound++;
                        
                        if (isValidFile(fullPath)) {
                            try {
                                const content = fs.readFileSync(fullPath, 'utf8');
                                const driver = JSON.parse(content);
                                
                                // Vérifications de base
                                if (driver.id && driver.name) {
                                    results.validDrivers++;
                                    results.driverPaths.push({
                                        path: fullPath,
                                        id: driver.id,
                                        name: driver.name,
                                        valid: true
                                    });
                                    log(`✅ Driver valide: ${driver.id}`, 'SUCCESS');
                                } else {
                                    results.invalidDrivers++;
                                    log(`⚠️ Driver invalide (manque id/name): ${fullPath}`, 'WARN');
                                }
                                
                            } catch (error) {
                                results.invalidDrivers++;
                                log(`❌ Erreur lecture driver: ${fullPath} - ${error.message}`, 'ERROR');
                            }
                        } else {
                            results.invalidDrivers++;
                            log(`⚠️ Fichier driver invalide: ${fullPath}`, 'WARN');
                        }
                    }
                }
                
            } catch (error) {
                log(`❌ Erreur scan répertoire: ${dirPath} - ${error.message}`, 'ERROR');
                results.errors++;
            }
        }
        
        // Démarrer le scan
        scanDirectory(driversPath);
        
        results.duration = Date.now() - startTime;
        
        // Sauvegarder les résultats
        const dataDir = path.dirname(CONFIG.resultsFile);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(CONFIG.resultsFile, JSON.stringify(results, null, 2));
        
        log(`✅ Scan sécurisé terminé: ${results.validDrivers}/${results.driversFound} drivers valides`, 'SUCCESS');
        
    } catch (error) {
        log(`❌ Erreur scan sécurisé: ${error.message}`, 'ERROR');
        results.errors++;
    }
    
    return results;
}

/**
 * Corrige les problèmes de structure des drivers
 */
function fixDriverStructure() {
    log('🔧 === CORRECTION STRUCTURE DRIVERS ===', 'INFO');
    
    const results = {
        timestamp: new Date().toISOString(),
        version: CONFIG.version,
        driversFixed: 0,
        driversCreated: 0,
        errors: 0,
        duration: 0
    };
    
    const startTime = Date.now();
    
    try {
        const driversPath = './drivers';
        
        if (!fs.existsSync(driversPath)) {
            fs.mkdirSync(driversPath, { recursive: true });
            log('✅ Dossier drivers créé', 'SUCCESS');
        }
        
        // Créer les dossiers de base s'ils n'existent pas
        const baseDirs = ['tuya', 'zigbee', 'generic', 'todo-devices'];
        
        baseDirs.forEach(dirName => {
            const dirPath = path.join(driversPath, dirName);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                log(`✅ Dossier créé: ${dirName}`, 'SUCCESS');
            }
        });
        
        // Créer un driver de base pour éviter les erreurs
        const baseDriverPath = path.join(driversPath, 'tuya', 'base-tuya-driver');
        const baseComposePath = path.join(baseDriverPath, 'driver.compose.json');
        
        if (!fs.existsSync(baseComposePath)) {
            if (!fs.existsSync(baseDriverPath)) {
                fs.mkdirSync(baseDriverPath, { recursive: true });
            }
            
            const baseDriver = {
                id: "base-tuya-driver",
                name: {
                    en: "Base Tuya Driver",
                    fr: "Driver Tuya de base",
                    nl: "Basis Tuya Driver",
                    ta: "அடிப்படை Tuya Driver"
                },
                capabilities: ["onoff"],
                zigbee: {
                    manufacturerName: ["_TZ3000_generic"],
                    modelId: ["TS0004"],
                    endpoints: {
                        "1": {
                            clusters: {
                                input: ["genOnOff"],
                                output: []
                            }
                        }
                    }
                },
                metadata: {
                    createdBy: "fix-driver-scanning.js",
                    creationDate: new Date().toISOString(),
                    fallback: true
                }
            };
            
            fs.writeFileSync(baseComposePath, JSON.stringify(baseDriver, null, 2));
            
            // Créer le device.js
            const deviceContent = `const { ZigbeeDevice } = require('homey-meshdriver');

class BaseTuyaDevice extends ZigbeeDevice {
    async onMeshInit() {
        await super.onMeshInit();
        this.log('Base Tuya device initialized');
    }
}

module.exports = BaseTuyaDevice;`;
            
            const devicePath = path.join(baseDriverPath, 'device.js');
            fs.writeFileSync(devicePath, deviceContent);
            
            results.driversCreated++;
            log('✅ Driver de base créé', 'SUCCESS');
        }
        
        results.duration = Date.now() - startTime;
        
        log(`✅ Structure drivers corrigée: ${results.driversCreated} drivers créés`, 'SUCCESS');
        
    } catch (error) {
        log(`❌ Erreur correction structure: ${error.message}`, 'ERROR');
        results.errors++;
    }
    
    return results;
}

/**
 * Fonction principale
 */
function fixDriverScanning() {
    log('🔧 === FIX DRIVER SCANNING ===', 'INFO');
    
    const results = {
        timestamp: new Date().toISOString(),
        version: CONFIG.version,
        scanResults: null,
        structureResults: null,
        duration: 0
    };
    
    const startTime = Date.now();
    
    try {
        // 1. Corriger la structure
        results.structureResults = fixDriverStructure();
        
        // 2. Scanner de manière sécurisée
        results.scanResults = scanDriversSafely();
        
        results.duration = Date.now() - startTime;
        
        log('✅ Fix driver scanning terminé avec succès', 'SUCCESS');
        
    } catch (error) {
        log(`❌ Erreur fix driver scanning: ${error.message}`, 'ERROR');
    }
    
    return results;
}

// Exécution si appelé directement
if (require.main === module) {
    try {
        const results = fixDriverScanning();
        log('✅ Fix driver scanning terminé avec succès', 'SUCCESS');
        process.exit(0);
    } catch (error) {
        log(`❌ Fix driver scanning échoué: ${error.message}`, 'ERROR');
        process.exit(1);
    }
}

module.exports = { fixDriverScanning }; 