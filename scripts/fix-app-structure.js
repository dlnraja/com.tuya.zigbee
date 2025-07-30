#!/usr/bin/env node
/**
 * Script de correction intelligente de la structure de l'app
 * Version: 2.0.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '2.0.0',
    logFile: './logs/fix-app-structure.log',
    resultsFile: './data/fix-app-structure-results.json'
};

// Fonction de logging
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    
    // Sauvegarde dans le fichier de log
    const logDir = path.dirname(CONFIG.logFile);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
}

// Analyse intelligente du type de produit
function analyzeProductType(driverName, capabilities = []) {
    // Validation et conversion en string
    const name = (driverName && typeof driverName === 'string') ? driverName.toLowerCase() : '';
    const caps = capabilities.map(c => (c && typeof c === 'string') ? c.toLowerCase() : '');
    
    // Catégories principales
    const categories = {
        lighting: {
            keywords: ['light', 'bulb', 'lamp', 'strip', 'panel', 'dimmer', 'switch'],
            capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature']
        },
        sensors: {
            keywords: ['sensor', 'motion', 'contact', 'temperature', 'humidity', 'pressure', 'air_quality'],
            capabilities: ['measure_temperature', 'measure_humidity', 'measure_pressure', 'alarm_motion', 'alarm_contact']
        },
        security: {
            keywords: ['lock', 'doorbell', 'camera', 'alarm', 'smoke', 'gas', 'water'],
            capabilities: ['alarm_contact', 'alarm_motion', 'alarm_smoke', 'alarm_gas', 'lock']
        },
        climate: {
            keywords: ['thermostat', 'valve', 'fan', 'heater', 'ac', 'climate'],
            capabilities: ['measure_temperature', 'target_temperature', 'measure_humidity']
        },
        automation: {
            keywords: ['switch', 'relay', 'outlet', 'plug', 'socket'],
            capabilities: ['onoff', 'measure_power', 'measure_current', 'measure_voltage']
        },
        controllers: {
            keywords: ['gateway', 'bridge', 'repeater', 'router', 'hub'],
            capabilities: ['gateway', 'bridge']
        }
    };
    
    // Analyse par nom (seulement si name n'est pas vide)
    if (name) {
        for (const [category, config] of Object.entries(categories)) {
            if (config.keywords.some(keyword => name.includes(keyword))) {
                return category;
            }
        }
    }
    
    // Analyse par capacités
    for (const [category, config] of Object.entries(categories)) {
        if (config.capabilities.some(cap => caps.includes(cap))) {
            return category;
        }
    }
    
    return 'generic';
}

// Réorganisation intelligente des drivers
function reorganizeDriversIntelligently() {
    log('🔄 === RÉORGANISATION INTELLIGENTE DES DRIVERS ===');
    
    const driversPath = './drivers';
    if (!fs.existsSync(driversPath)) {
        log('❌ Dossier drivers non trouvé', 'ERROR');
        return false;
    }
    
    let reorganizedCount = 0;
    let errors = 0;
    
    try {
        // Scanner tous les drivers
        const driverDirs = fs.readdirSync(driversPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        log(`📁 ${driverDirs.length} drivers trouvés`);
        
        for (const driverDir of driverDirs) {
            const driverPath = path.join(driversPath, driverDir);
            const composePath = path.join(driverPath, 'driver.compose.json');
            
            if (!fs.existsSync(composePath)) {
                log(`⚠️ Pas de driver.compose.json dans ${driverDir}`, 'WARN');
                continue;
            }
            
            try {
                const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                const driverName = composeData.name || driverDir;
                const capabilities = composeData.capabilities || [];
                
                // Analyser le type de produit
                const productType = analyzeProductType(driverName, capabilities);
                log(`🔍 ${driverDir} → ${productType}`);
                
                // Déterminer le protocole (Tuya ou Zigbee)
                const protocol = determineProtocol(composeData);
                
                // Créer la structure de destination
                const destPath = path.join(driversPath, protocol, productType, driverDir);
                
                // Vérifier si le déplacement est nécessaire
                if (path.resolve(driverPath) !== path.resolve(destPath)) {
                    // Créer les dossiers parents
                    const destParent = path.dirname(destPath);
                    if (!fs.existsSync(destParent)) {
                        fs.mkdirSync(destParent, { recursive: true });
                    }
                    
                    // Déplacer le driver
                    if (fs.existsSync(destPath)) {
                        // Si le dossier existe, fusionner
                        mergeDriverDirectories(driverPath, destPath);
                        fs.rmSync(driverPath, { recursive: true, force: true });
                    } else {
                        fs.renameSync(driverPath, destPath);
                    }
                    
                    reorganizedCount++;
                    log(`✅ ${driverDir} déplacé vers ${protocol}/${productType}/`);
                }
                
            } catch (error) {
                log(`❌ Erreur traitement ${driverDir}: ${error.message}`, 'ERROR');
                errors++;
            }
        }
        
        log(`✅ Réorganisation terminée: ${reorganizedCount} drivers réorganisés, ${errors} erreurs`);
        return reorganizedCount > 0;
        
    } catch (error) {
        log(`❌ Erreur réorganisation: ${error.message}`, 'ERROR');
        return false;
    }
}

// Déterminer le protocole (Tuya ou Zigbee)
function determineProtocol(composeData) {
    if (composeData.tuya && Object.keys(composeData.tuya).length > 0) {
        return 'tuya';
    }
    if (composeData.zigbee && Object.keys(composeData.zigbee).length > 0) {
        return 'zigbee';
    }
    
    // Heuristique basée sur les capacités
    const capabilities = composeData.capabilities || [];
    const tuyaCapabilities = ['tuya_switch', 'tuya_dimmer', 'tuya_light'];
    const zigbeeCapabilities = ['onoff', 'dim', 'measure_temperature'];
    
    const tuyaCount = tuyaCapabilities.filter(cap => capabilities.includes(cap)).length;
    const zigbeeCount = zigbeeCapabilities.filter(cap => capabilities.includes(cap)).length;
    
    return tuyaCount > zigbeeCount ? 'tuya' : 'zigbee';
}

// Fusionner deux dossiers de drivers
function mergeDriverDirectories(sourcePath, destPath) {
    const sourceFiles = fs.readdirSync(sourcePath);
    
    for (const file of sourceFiles) {
        const sourceFile = path.join(sourcePath, file);
        const destFile = path.join(destPath, file);
        
        if (fs.existsSync(destFile)) {
            // Si le fichier existe, comparer et fusionner si nécessaire
            if (file === 'driver.compose.json') {
                mergeComposeFiles(sourceFile, destFile);
            }
        } else {
            // Déplacer le fichier
            fs.renameSync(sourceFile, destFile);
        }
    }
}

// Fusionner les fichiers driver.compose.json
function mergeComposeFiles(sourceFile, destFile) {
    try {
        const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
        const destData = JSON.parse(fs.readFileSync(destFile, 'utf8'));
        
        // Fusionner les capacités
        if (sourceData.capabilities && destData.capabilities) {
            destData.capabilities = [...new Set([...destData.capabilities, ...sourceData.capabilities])];
        }
        
        // Fusionner les métadonnées Tuya
        if (sourceData.tuya && destData.tuya) {
            destData.tuya = { ...destData.tuya, ...sourceData.tuya };
        }
        
        // Fusionner les métadonnées Zigbee
        if (sourceData.zigbee && destData.zigbee) {
            if (sourceData.zigbee.manufacturerName && destData.zigbee.manufacturerName) {
                destData.zigbee.manufacturerName = [...new Set([...destData.zigbee.manufacturerName, ...sourceData.zigbee.manufacturerName])];
            }
            if (sourceData.zigbee.modelId && destData.zigbee.modelId) {
                destData.zigbee.modelId = [...new Set([...destData.zigbee.modelId, ...sourceData.zigbee.modelId])];
            }
        }
        
        // Sauvegarder le fichier fusionné
        fs.writeFileSync(destFile, JSON.stringify(destData, null, 2));
        log(`✅ Fusion réussie: ${path.basename(destFile)}`);
        
    } catch (error) {
        log(`❌ Erreur fusion ${path.basename(sourceFile)}: ${error.message}`, 'ERROR');
    }
}

// Corriger app.json de manière intelligente
function fixAppJsonIntelligently() {
    log('📋 === CORRECTION INTELLIGENTE APP.JSON ===');
    
    try {
        const appJsonPath = './app.json';
        let appData = {};
        
        if (fs.existsSync(appJsonPath)) {
            appData = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
        }
        
        // Structure de base SDK3
        const baseAppData = {
            id: appData.id || 'com.tuya.zigbee',
            name: appData.name || 'Tuya Zigbee',
            description: appData.description || 'Universal Tuya Zigbee Device Support',
            version: appData.version || '1.0.0',
            compatibility: appData.compatibility || '>=5.0.0',
            sdk: appData.sdk || 3,
            category: appData.category || 'light',
            author: appData.author || 'dlnraja',
            main: appData.main || 'app.js',
            drivers: appData.drivers || [],
            images: appData.images || {},
            bugs: appData.bugs || 'https://github.com/dlnraja/com.tuya.zigbee/issues',
            homepage: appData.homepage || 'https://github.com/dlnraja/com.tuya.zigbee',
            repository: appData.repository || 'https://github.com/dlnraja/com.tuya.zigbee.git',
            license: appData.license || 'MIT',
            metadata: appData.metadata || {}
        };
        
        // Scanner et ajouter tous les drivers
        log('🔍 === SCAN DRIVERS POUR APP.JSON ===');
        const drivers = scanAllDrivers();
        
        // Ajouter les drivers manquants
        for (const driver of drivers) {
            const existingDriver = baseAppData.drivers.find(d => d.id === driver.id);
            if (!existingDriver) {
                baseAppData.drivers.push({
                    id: driver.id,
                    name: driver.name,
                    category: driver.category || 'generic'
                });
                log(`✅ Driver ajouté: ${driver.id}`);
            }
        }
        
        // Sauvegarder app.json
        fs.writeFileSync(appJsonPath, JSON.stringify(baseAppData, null, 2));
        log(`✅ app.json corrigé avec ${baseAppData.drivers.length} drivers`);
        
        return baseAppData.drivers.length;
        
    } catch (error) {
        log(`❌ Erreur correction app.json: ${error.message}`, 'ERROR');
        return 0;
    }
}

// Scanner tous les drivers
function scanAllDrivers() {
    const drivers = [];
    const driversPath = './drivers';
    
    if (!fs.existsSync(driversPath)) {
        return drivers;
    }
    
    function scanDirectory(dirPath) {
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dirPath, item.name);
            
            if (item.isDirectory()) {
                const composePath = path.join(fullPath, 'driver.compose.json');
                
                if (fs.existsSync(composePath)) {
                    try {
                        const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                        // Validation du nom du driver
                        const driverName = composeData.name || item.name;
                        const capabilities = composeData.capabilities || [];
                        const productType = analyzeProductType(driverName, capabilities);
                        
                        drivers.push({
                            id: item.name,
                            name: driverName,
                            category: productType,
                            path: fullPath
                        });
                    } catch (error) {
                        log(`⚠️ Erreur lecture ${item.name}/driver.compose.json: ${error.message}`, 'WARN');
                    }
                } else {
                    // Récursif pour les sous-dossiers
                    scanDirectory(fullPath);
                }
            }
        }
    }
    
    scanDirectory(driversPath);
    return drivers;
}

// Corriger app.js
function fixAppJs() {
    log('📝 === CORRECTION APP.JS ===');
    
    const appJsPath = './app.js';
    const appJsContent = `const { HomeyApp } = require('homey');

class TuyaZigbeeApp extends HomeyApp {
    async onInit() {
        this.log('Tuya Zigbee App is running...');
        
        // Initialisation des drivers
        await this.initializeDrivers();
        
        // Configuration des événements
        this.homey.on('unload', () => {
            this.log('Tuya Zigbee App is unloading...');
        });
    }
    
    async initializeDrivers() {
        try {
            // Initialisation automatique des drivers
            this.log('Initializing drivers...');
            
            // Chargement des drivers disponibles
            const drivers = this.homey.drivers.getDrivers();
            this.log(\`Loaded \${drivers.length} drivers\`);
            
        } catch (error) {
            this.log('Error initializing drivers:', error);
        }
    }
}

module.exports = TuyaZigbeeApp;
`;
    
    try {
        fs.writeFileSync(appJsPath, appJsContent);
        log('✅ app.js corrigé');
        return true;
    } catch (error) {
        log(`❌ Erreur correction app.js: ${error.message}`, 'ERROR');
        return false;
    }
}

// Validation avec Homey CLI
function validateWithHomeyCLI() {
    log('🏠 === VALIDATION HOMEY CLI ===');
    
    try {
        // Vérifier si Homey CLI est installé
        execSync('homey --version', { stdio: 'pipe' });
        log('✅ Homey CLI détecté');
        
        // Valider l'app
        try {
            execSync('homey app validate', { stdio: 'pipe' });
            log('✅ App validée avec Homey CLI');
            return true;
        } catch (error) {
            log(`⚠️ Validation échouée: ${error.message}`, 'WARN');
            return false;
        }
        
    } catch (error) {
        log('⚠️ Homey CLI non disponible, validation ignorée', 'WARN');
        return false;
    }
}

// Fonction principale
function fixAppStructure() {
    log('🧱 === CORRECTION STRUCTURE APP ===');
    const startTime = Date.now();
    
    try {
        // 1. Créer les dossiers de base
        log('📁 === CRÉATION DOSSIERS DE BASE ===');
        const baseDirs = [
            './drivers/tuya/lighting',
            './drivers/tuya/sensors',
            './drivers/tuya/security',
            './drivers/tuya/climate',
            './drivers/tuya/automation',
            './drivers/tuya/controllers',
            './drivers/zigbee/lighting',
            './drivers/zigbee/sensors',
            './drivers/zigbee/security',
            './drivers/zigbee/climate',
            './drivers/zigbee/automation',
            './drivers/zigbee/controllers',
            './drivers/generic'
        ];
        
        for (const dir of baseDirs) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                log(`✅ Dossier créé: ${dir}`);
            }
        }
        
        // 2. Réorganisation intelligente
        const reorganized = reorganizeDriversIntelligently();
        
        // 3. Correction app.json
        const driversCount = fixAppJsonIntelligently();
        
        // 4. Correction app.js
        const appJsFixed = fixAppJs();
        
        // 5. Validation Homey CLI
        const cliValidated = validateWithHomeyCLI();
        
        // 6. Rapport final
        const duration = Date.now() - startTime;
        log('📊 === RAPPORT FINAL CORRECTION STRUCTURE ===');
        log(`Drivers réorganisés: ${reorganized ? 'Oui' : 'Non'}`);
        log(`Drivers scannés: ${driversCount}`);
        log(`App.js corrigé: ${appJsFixed ? 'Oui' : 'Non'}`);
        log(`Homey CLI validé: ${cliValidated ? 'Oui' : 'Non'}`);
        log(`Durée: ${duration}ms`);
        
        // Sauvegarder les résultats
        const results = {
            success: true,
            summary: {
                reorganized: reorganized,
                driversScanned: driversCount,
                appJsFixed: appJsFixed,
                cliValidated: cliValidated,
                duration: duration
            },
            timestamp: new Date().toISOString()
        };
        
        const resultsDir = path.dirname(CONFIG.resultsFile);
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }
        fs.writeFileSync(CONFIG.resultsFile, JSON.stringify(results, null, 2));
        
        log('✅ Structure app corrigée avec succès', 'SUCCESS');
        return results;
        
    } catch (error) {
        log(`❌ Erreur correction structure: ${error.message}`, 'ERROR');
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// Exécution si appelé directement
if (require.main === module) {
    try {
        const results = fixAppStructure();
        if (results.success) {
            log('✅ Correction structure terminée avec succès', 'SUCCESS');
        } else {
            log('❌ Correction structure échouée', 'ERROR');
            process.exit(1);
        }
    } catch (error) {
        log(`❌ Erreur fatale: ${error.message}`, 'ERROR');
        process.exit(1);
    }
}

module.exports = { fixAppStructure }; 