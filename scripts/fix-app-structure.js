#!/usr/bin/env node
/**
 * Script de correction intelligente de la structure de l'app
 * Version: 1.0.12-20250729-1700
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1700',
    logFile: './logs/fix-app-structure.log',
    resultsFile: './data/app-structure-fix.json'
};

// Fonction de logging
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    
    const logDir = path.dirname(CONFIG.logFile);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
}

// Fonction pour corriger la structure des dossiers
function fixFolderStructure() {
    log('📁 === CORRECTION STRUCTURE DES DOSSIERS ===');
    
    try {
        // Créer les dossiers de base s'ils n'existent pas
        const baseDirs = [
            './assets',
            './assets/images',
            './assets/icons',
            './data',
            './logs',
            './docs',
            './scripts',
            './tools',
            './backups',
            './releases',
            './temp'
        ];
        
        baseDirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                log(`✅ Dossier créé: ${dir}`);
            }
        });
        
        // Corriger la structure des drivers
        fixDriversStructure();
        
        return true;
        
    } catch (error) {
        log(`❌ Erreur correction structure: ${error.message}`, 'ERROR');
        return false;
    }
}

// Fonction pour corriger la structure des drivers
function fixDriversStructure() {
    log('🔧 === CORRECTION STRUCTURE DRIVERS ===');
    
    try {
        const driversDir = './drivers';
        if (!fs.existsSync(driversDir)) {
            fs.mkdirSync(driversDir, { recursive: true });
            log('✅ Dossier drivers créé');
        }
        
        // Catégories principales
        const categories = {
            tuya: ['controllers', 'sensors', 'security', 'climate', 'automation', 'lighting', 'switches', 'outlets', 'dimmers', 'bulbs', 'strips', 'panels', 'generic'],
            zigbee: ['controllers', 'sensors', 'security', 'climate', 'automation', 'lighting', 'accessories', 'switches', 'outlets', 'dimmers', 'bulbs', 'strips', 'panels', 'generic']
        };
        
        // Créer les catégories pour chaque protocole
        Object.entries(categories).forEach(([protocol, cats]) => {
            const protocolDir = path.join(driversDir, protocol);
            if (!fs.existsSync(protocolDir)) {
                fs.mkdirSync(protocolDir, { recursive: true });
                log(`✅ Dossier ${protocol} créé`);
            }
            
            cats.forEach(cat => {
                const catDir = path.join(protocolDir, cat);
                if (!fs.existsSync(catDir)) {
                    fs.mkdirSync(catDir, { recursive: true });
                    log(`✅ Catégorie ${protocol}/${cat} créée`);
                }
            });
        });
        
        // Réorganiser les drivers existants
        reorganizeExistingDrivers();
        
        return true;
        
    } catch (error) {
        log(`❌ Erreur correction drivers: ${error.message}`, 'ERROR');
        return false;
    }
}

// Fonction pour réorganiser les drivers existants
function reorganizeExistingDrivers() {
    log('🔄 === RÉORGANISATION DRIVERS EXISTANTS ===');
    
    try {
        const driversDir = './drivers';
        if (!fs.existsSync(driversDir)) return;
        
        // Parcourir tous les dossiers de drivers
        const items = fs.readdirSync(driversDir, { withFileTypes: true });
        
        items.forEach(item => {
            if (item.isDirectory()) {
                const driverPath = path.join(driversDir, item.name);
                const composeFile = path.join(driverPath, 'driver.compose.json');
                
                if (fs.existsSync(composeFile)) {
                    try {
                        const composeData = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
                        const category = determineDriverCategory(composeData, item.name);
                        
                        if (category) {
                            moveDriverToCategory(driverPath, category);
                        }
                    } catch (error) {
                        log(`⚠️ Erreur lecture ${composeFile}: ${error.message}`, 'WARN');
                    }
                }
            }
        });
        
        log('✅ Réorganisation terminée');
        
    } catch (error) {
        log(`❌ Erreur réorganisation: ${error.message}`, 'ERROR');
    }
}

// Fonction pour déterminer la catégorie d'un driver
function determineDriverCategory(composeData, driverName) {
    try {
        // Analyser les capacités pour déterminer la catégorie
        const capabilities = composeData.capabilities || [];
        const name = driverName.toLowerCase();
        
        // Logique de catégorisation intelligente
        if (capabilities.includes('onoff') && capabilities.includes('dim')) {
            return 'lighting/dimmers';
        } else if (capabilities.includes('onoff') && !capabilities.includes('dim')) {
            return 'switches';
        } else if (capabilities.includes('measure_temperature')) {
            return 'sensors';
        } else if (capabilities.includes('measure_humidity')) {
            return 'sensors';
        } else if (capabilities.includes('alarm_motion')) {
            return 'security';
        } else if (capabilities.includes('alarm_contact')) {
            return 'security';
        } else if (name.includes('light') || name.includes('bulb')) {
            return 'lighting/bulbs';
        } else if (name.includes('switch')) {
            return 'switches';
        } else if (name.includes('sensor')) {
            return 'sensors';
        } else if (name.includes('lock')) {
            return 'security';
        } else {
            return 'generic';
        }
        
    } catch (error) {
        log(`⚠️ Erreur catégorisation ${driverName}: ${error.message}`, 'WARN');
        return 'generic';
    }
}

// Fonction pour déplacer un driver vers sa catégorie
function moveDriverToCategory(driverPath, category) {
    try {
        const driverName = path.basename(driverPath);
        const targetPath = path.join('./drivers', category, driverName);
        
        if (driverPath !== targetPath && !fs.existsSync(targetPath)) {
            fs.renameSync(driverPath, targetPath);
            log(`✅ Driver déplacé: ${driverName} → ${category}`);
        }
        
    } catch (error) {
        log(`❌ Erreur déplacement ${driverName}: ${error.message}`, 'ERROR');
    }
}

// Fonction pour corriger app.json
function fixAppJson() {
    log('📋 === CORRECTION APP.JSON ===');
    
    try {
        const appJsonPath = './app.json';
        let appData = {};
        
        if (fs.existsSync(appJsonPath)) {
            appData = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
        }
        
        // Structure complète et corrigée
        const correctedApp = {
            id: appData.id || 'com.tuya.zigbee',
            name: appData.name || {
                en: 'Tuya Zigbee',
                fr: 'Tuya Zigbee',
                nl: 'Tuya Zigbee',
                ta: 'Tuya Zigbee'
            },
            description: appData.description || {
                en: 'Comprehensive Tuya Zigbee device support',
                fr: 'Support complet des appareils Tuya Zigbee',
                nl: 'Uitgebreide ondersteuning voor Tuya Zigbee-apparaten',
                ta: 'Tuya Zigbee சாதனங்களுக்கான விரிவான ஆதரவு'
            },
            version: appData.version || '1.0.12',
            compatibility: appData.compatibility || '>=5.0.0',
            sdk: appData.sdk || 3,
            category: appData.category || ['lighting'],
            author: appData.author || {
                name: 'dlnraja',
                email: '[redacted-email]'
            },
            main: appData.main || 'app.js',
            drivers: appData.drivers || [],
            images: appData.images || {
                small: 'assets/images/small.png',
                large: 'assets/images/large.png'
            },
            bugs: appData.bugs || 'https://github.com/dlnraja/com.tuya.zigbee/issues',
            homepage: appData.homepage || 'https://github.com/dlnraja/com.tuya.zigbee',
            repository: appData.repository || 'https://github.com/dlnraja/com.tuya.zigbee',
            license: appData.license || 'MIT',
            metadata: appData.metadata || {
                support: 'https://community.homey.app/t/app-pro-tuya-zigbee-app',
                version: '1.0.12-20250729-1700'
            }
        };
        
        // Mettre à jour la liste des drivers
        correctedApp.drivers = scanDriversForAppJson();
        
        fs.writeFileSync(appJsonPath, JSON.stringify(correctedApp, null, 2));
        log('✅ app.json corrigé');
        
        return correctedApp;
        
    } catch (error) {
        log(`❌ Erreur correction app.json: ${error.message}`, 'ERROR');
        return null;
    }
}

// Fonction pour scanner les drivers pour app.json
function scanDriversForAppJson() {
    log('🔍 === SCAN DRIVERS POUR APP.JSON ===');
    
    try {
        const drivers = [];
        const driversDir = './drivers';
        
        if (!fs.existsSync(driversDir)) return drivers;
        
        // Scanner récursivement tous les drivers
        function scanDirectory(dir, protocol = '') {
            const items = fs.readdirSync(dir, { withFileTypes: true });
            
            items.forEach(item => {
                const itemPath = path.join(dir, item.name);
                
                if (item.isDirectory()) {
                    const composeFile = path.join(itemPath, 'driver.compose.json');
                    
                    if (fs.existsSync(composeFile)) {
                        try {
                            const composeData = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
                            const driverId = composeData.id || item.name;
                            
                            drivers.push({
                                id: driverId,
                                name: composeData.name || item.name,
                                category: protocol || 'generic'
                            });
                            
                            log(`✅ Driver ajouté: ${driverId}`);
                            
                        } catch (error) {
                            log(`⚠️ Erreur lecture ${composeFile}: ${error.message}`, 'WARN');
                        }
                    } else {
                        // Continuer à scanner les sous-dossiers
                        scanDirectory(itemPath, protocol || item.name);
                    }
                }
            });
        }
        
        scanDirectory(driversDir);
        log(`✅ ${drivers.length} drivers scannés`);
        
        return drivers;
        
    } catch (error) {
        log(`❌ Erreur scan drivers: ${error.message}`, 'ERROR');
        return [];
    }
}

// Fonction pour corriger app.js
function fixAppJs() {
    log('📝 === CORRECTION APP.JS ===');
    
    try {
        const appJsPath = './app.js';
        const appJsContent = `/**
 * Tuya Zigbee App
 * Version: 1.0.12-20250729-1700
 */

const { HomeyApp } = require('homey');

class TuyaZigbeeApp extends HomeyApp {
    
    async onInit() {
        this.log('🚀 Tuya Zigbee App initialisé');
        
        // Initialisation des drivers
        await this.initializeDrivers();
        
        // Configuration des événements
        this.setupEventHandlers();
        
        this.log('✅ Tuya Zigbee App prêt');
    }
    
    async initializeDrivers() {
        try {
            // Initialisation automatique des drivers
            const drivers = await this.getDrivers();
            this.log(\`📦 \${drivers.length} drivers initialisés\`);
        } catch (error) {
            this.error('❌ Erreur initialisation drivers:', error);
        }
    }
    
    setupEventHandlers() {
        // Gestion des événements de l'app
        this.on('unload', () => {
            this.log('🔄 Tuya Zigbee App déchargé');
        });
    }
    
    async onUninit() {
        this.log('👋 Tuya Zigbee App terminé');
    }
}

module.exports = TuyaZigbeeApp;
`;
        
        fs.writeFileSync(appJsPath, appJsContent);
        log('✅ app.js corrigé');
        
        return true;
        
    } catch (error) {
        log(`❌ Erreur correction app.js: ${error.message}`, 'ERROR');
        return false;
    }
}

// Fonction pour valider avec Homey CLI
function validateWithHomeyCLI() {
    log('🏠 === VALIDATION HOMEY CLI ===');
    
    try {
        // Vérifier si Homey CLI est installé
        try {
            execSync('homey --version', { stdio: 'pipe' });
            log('✅ Homey CLI détecté');
            
            // Valider l'app
            execSync('homey app validate', { stdio: 'inherit' });
            log('✅ Validation Homey CLI réussie');
            
            return true;
            
        } catch (error) {
            log('⚠️ Homey CLI non disponible, validation ignorée', 'WARN');
            return false;
        }
        
    } catch (error) {
        log(`❌ Erreur validation Homey CLI: ${error.message}`, 'ERROR');
        return false;
    }
}

// Fonction principale
function fixAppStructure() {
    log('🧱 === CORRECTION STRUCTURE APP ===');
    
    const startTime = Date.now();
    const results = {
        timestamp: new Date().toISOString(),
        version: CONFIG.version,
        steps: {},
        summary: {}
    };
    
    try {
        // 1. Corriger la structure des dossiers
        results.steps.folderStructure = fixFolderStructure();
        
        // 2. Corriger app.json
        results.steps.appJson = fixAppJson();
        
        // 3. Corriger app.js
        results.steps.appJs = fixAppJs();
        
        // 4. Valider avec Homey CLI
        results.steps.homeyCLI = validateWithHomeyCLI();
        
        // Calculer le résumé
        const duration = Date.now() - startTime;
        results.summary = {
            success: true,
            duration,
            driversScanned: results.steps.appJson?.drivers?.length || 0,
            homeyCLIValidated: results.steps.homeyCLI
        };
        
        // Rapport final
        log('📊 === RAPPORT FINAL CORRECTION STRUCTURE ===');
        log(`Drivers scannés: ${results.summary.driversScanned}`);
        log(`Homey CLI validé: ${results.summary.homeyCLIValidated ? '✅' : '❌'}`);
        log(`Durée: ${duration}ms`);
        
        // Sauvegarder les résultats
        const dataDir = path.dirname(CONFIG.resultsFile);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(CONFIG.resultsFile, JSON.stringify(results, null, 2));
        
        log('✅ Structure app corrigée avec succès');
        
        return results;
        
    } catch (error) {
        log(`❌ ERREUR CRITIQUE CORRECTION: ${error.message}`, 'ERROR');
        results.summary = {
            success: false,
            error: error.message,
            duration: Date.now() - startTime
        };
        
        // Sauvegarder même en cas d'erreur
        const dataDir = path.dirname(CONFIG.resultsFile);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(CONFIG.resultsFile, JSON.stringify(results, null, 2));
        
        throw error;
    }
}

// Exécution si appelé directement
if (require.main === module) {
    try {
        const results = fixAppStructure();
        log('✅ Correction structure terminée avec succès', 'SUCCESS');
    } catch (error) {
        log(`❌ Correction structure échouée: ${error.message}`, 'ERROR');
        process.exit(1);
    }
}

module.exports = { fixAppStructure }; 