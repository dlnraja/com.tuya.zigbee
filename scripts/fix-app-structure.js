#!/usr/bin/env node
/**
 * Script de correction de la structure app.json et app.js
 * Pour la compatibilité CLI Homey
 * Version: 1.0.12-20250729-1645
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1645',
    logFile: './logs/fix-app-structure.log',
    validationDataFile: './data/app-structure-validation.json'
};

// Schéma JSON requis pour app.json
const REQUIRED_APP_JSON_SCHEMA = {
    id: 'string',
    name: 'object',
    description: 'object',
    version: 'string',
    compatibility: 'string',
    sdk: 'number',
    category: 'array',
    author: 'object',
    main: 'string',
    drivers: 'array'
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

// Fonction pour valider le schéma JSON
function validateJsonSchema(obj, schema, path = '') {
    const errors = [];
    
    Object.entries(schema).forEach(([key, expectedType]) => {
        const value = obj[key];
        const currentPath = path ? `${path}.${key}` : key;
        
        if (value === undefined) {
            errors.push(`Missing required field: ${currentPath}`);
        } else {
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            if (actualType !== expectedType) {
                errors.push(`Invalid type for ${currentPath}: expected ${expectedType}, got ${actualType}`);
            }
        }
    });
    
    return errors;
}

// Fonction pour analyser la structure actuelle
function analyzeCurrentStructure() {
    log('🔍 === ANALYSE DE LA STRUCTURE ACTUELLE ===');
    
    try {
        const analysis = {
            appJsonExists: false,
            appJsonValid: false,
            appJsExists: false,
            driversExist: false,
            driversCount: 0,
            issues: [],
            recommendations: []
        };
        
        // Vérifier app.json
        if (fs.existsSync('./app.json')) {
            analysis.appJsonExists = true;
            
            try {
                const appJsonContent = fs.readFileSync('./app.json', 'utf8');
                const appJson = JSON.parse(appJsonContent);
                
                // Valider le schéma
                const schemaErrors = validateJsonSchema(appJson, REQUIRED_APP_JSON_SCHEMA);
                
                if (schemaErrors.length === 0) {
                    analysis.appJsonValid = true;
                    log('app.json valide');
                } else {
                    analysis.appJsonValid = false;
                    analysis.issues.push(`app.json schema errors: ${schemaErrors.join(', ')}`);
                    log(`app.json invalide: ${schemaErrors.join(', ')}`, 'ERROR');
                }
                
            } catch (error) {
                analysis.appJsonValid = false;
                analysis.issues.push(`app.json parse error: ${error.message}`);
                log(`Erreur parsing app.json: ${error.message}`, 'ERROR');
            }
        } else {
            analysis.issues.push('app.json missing');
            log('app.json manquant', 'ERROR');
        }
        
        // Vérifier app.js
        if (fs.existsSync('./app.js')) {
            analysis.appJsExists = true;
            log('app.js existe');
        } else {
            analysis.issues.push('app.js missing');
            log('app.js manquant', 'ERROR');
        }
        
        // Vérifier les drivers
        if (fs.existsSync('./drivers')) {
            analysis.driversExist = true;
            
            try {
                const driverPaths = execSync('Get-ChildItem -Path ".\\drivers" -Recurse -Include "driver.compose.json"', { shell: 'powershell' }).toString().split('\n').filter(line => line.trim());
                analysis.driversCount = driverPaths.length;
                log(`Drivers trouvés: ${analysis.driversCount}`);
                
            } catch (error) {
                analysis.issues.push(`Error counting drivers: ${error.message}`);
                log(`Erreur comptage drivers: ${error.message}`, 'ERROR');
            }
        } else {
            analysis.issues.push('drivers directory missing');
            log('Dossier drivers manquant', 'ERROR');
        }
        
        // Générer des recommandations
        if (!analysis.appJsonExists) {
            analysis.recommendations.push('Create app.json with required schema');
        }
        
        if (!analysis.appJsonValid) {
            analysis.recommendations.push('Fix app.json schema and required fields');
        }
        
        if (!analysis.appJsExists) {
            analysis.recommendations.push('Create app.js file');
        }
        
        if (!analysis.driversExist) {
            analysis.recommendations.push('Create drivers directory');
        }
        
        log(`Analyse terminée: ${analysis.issues.length} problèmes détectés`);
        return analysis;
        
    } catch (error) {
        log(`Erreur analyse structure: ${error.message}`, 'ERROR');
        return null;
    }
}

// Fonction pour créer un app.json valide
function createValidAppJson() {
    log('📝 === CRÉATION APP.JSON VALIDE ===');
    
    try {
        // Détecter les drivers existants
        let drivers = [];
        if (fs.existsSync('./drivers')) {
            try {
                const driverPaths = execSync('Get-ChildItem -Path ".\\drivers" -Recurse -Include "driver.compose.json"', { shell: 'powershell' }).toString().split('\n').filter(line => line.trim());
                
                drivers = driverPaths.map(driverPath => {
                    try {
                        const composePath = driverPath.trim();
                        const composeContent = fs.readFileSync(composePath, 'utf8');
                        const compose = JSON.parse(composeContent);
                        
                        return {
                            id: compose.id || path.basename(path.dirname(composePath)),
                            name: compose.name || {
                                en: `Driver ${path.basename(path.dirname(composePath))}`
                            }
                        };
                    } catch (error) {
                        log(`Erreur lecture driver ${driverPath}: ${error.message}`, 'ERROR');
                        return null;
                    }
                }).filter(driver => driver !== null);
                
            } catch (error) {
                log(`Erreur détection drivers: ${error.message}`, 'ERROR');
            }
        }
        
        // Créer app.json valide
        const appJson = {
            "id": "com.tuya.zigbee",
            "name": {
                "en": "Tuya Zigbee",
                "fr": "Tuya Zigbee",
                "nl": "Tuya Zigbee",
                "ta": "Tuya Zigbee"
            },
            "description": {
                "en": "Universal Tuya Zigbee driver pack with comprehensive device support",
                "fr": "Pack de drivers Tuya Zigbee universel avec support complet des appareils",
                "nl": "Universeel Tuya Zigbee driver pakket met uitgebreide apparaatondersteuning",
                "ta": "உலகளாவிய Tuya Zigbee driver pack முழுமையான சாதன ஆதரவுடன்"
            },
            "version": "1.0.12",
            "compatibility": ">=5.0.0",
            "sdk": 3,
            "category": ["automation", "utilities"],
            "author": {
                "name": "Dylan Rajasekaram",
                "email": "[redacted-email]"
            },
            "main": "app.js",
            "drivers": drivers.length > 0 ? drivers : [
                {
                    "id": "generic-fallback",
                    "name": {
                        "en": "Generic Fallback Driver"
                    }
                }
            ],
            "images": {
                "small": "./assets/images/small.png",
                "large": "./assets/images/large.png"
            },
            "bugs": "https://github.com/dlnraja/tuya_repair/issues",
            "homepage": "https://github.com/dlnraja/tuya_repair#readme",
            "repository": "https://github.com/dlnraja/tuya_repair",
            "license": "MIT",
            "metadata": {
                "createdBy": "fix-app-structure.js",
                "creationDate": new Date().toISOString(),
                "totalDrivers": drivers.length
            }
        };
        
        fs.writeFileSync('./app.json', JSON.stringify(appJson, null, 2));
        log('app.json créé avec succès');
        
        return appJson;
        
    } catch (error) {
        log(`Erreur création app.json: ${error.message}`, 'ERROR');
        return null;
    }
}

// Fonction pour créer app.js
function createAppJs() {
    log('📝 === CRÉATION APP.JS ===');
    
    try {
        const appJsContent = `'use strict';

const Homey = require('homey');

class TuyaZigbeeApp extends Homey.App {
    async onInit() {
        this.log('Tuya Zigbee App is running...');
        
        // Log des statistiques
        this.log('App initialized with comprehensive Tuya and Zigbee support');
        
        // Émettre un événement pour indiquer que l'app est prête
        this.homey.on('ready', () => {
            this.log('Homey is ready, Tuya Zigbee drivers are available');
        });
    }
    
    async onUninit() {
        this.log('Tuya Zigbee App is shutting down...');
    }
}

module.exports = TuyaZigbeeApp;`;
        
        fs.writeFileSync('./app.js', appJsContent);
        log('app.js créé avec succès');
        
        return true;
        
    } catch (error) {
        log(`Erreur création app.js: ${error.message}`, 'ERROR');
        return false;
    }
}

// Fonction pour créer la structure des dossiers
function createDirectoryStructure() {
    log('📁 === CRÉATION STRUCTURE DES DOSSIERS ===');
    
    try {
        const directories = [
            './drivers',
            './drivers/tuya',
            './drivers/zigbee',
            './drivers/tuya/controllers',
            './drivers/tuya/sensors',
            './drivers/tuya/security',
            './drivers/tuya/climate',
            './drivers/tuya/automation',
            './drivers/tuya/lighting',
            './drivers/tuya/generic',
            './drivers/zigbee/controllers',
            './drivers/zigbee/sensors',
            './drivers/zigbee/security',
            './drivers/zigbee/climate',
            './drivers/zigbee/automation',
            './drivers/zigbee/lighting',
            './drivers/zigbee/generic',
            './assets',
            './assets/images',
            './scripts',
            './logs',
            './data',
            './docs'
        ];
        
        directories.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                log(`Dossier créé: ${dir}`);
            }
        });
        
        log('Structure des dossiers créée avec succès');
        return true;
        
    } catch (error) {
        log(`Erreur création structure: ${error.message}`, 'ERROR');
        return false;
    }
}

// Fonction pour valider avec Homey CLI
function validateWithHomeyCLI() {
    log('🏠 === VALIDATION AVEC HOMEY CLI ===');
    
    try {
        // Vérifier si Homey CLI est installé
        execSync('homey --version', { stdio: 'pipe' });
        log('Homey CLI détecté');
        
        // Valider l'app
        execSync('homey app validate', { stdio: 'inherit' });
        log('Validation Homey CLI réussie');
        return true;
        
    } catch (error) {
        if (error.message.includes('command not found') || error.message.includes('not recognized')) {
            log('Homey CLI non installé', 'WARN');
        } else {
            log(`Validation Homey CLI échouée: ${error.message}`, 'ERROR');
        }
        return false;
    }
}

// Fonction pour corriger les chemins des drivers
function fixDriverPaths() {
    log('🔧 === CORRECTION DES CHEMINS DES DRIVERS ===');
    
    try {
        let fixedPaths = 0;
        
        if (fs.existsSync('./drivers')) {
            const driverPaths = execSync('Get-ChildItem -Path ".\\drivers" -Recurse -Include "driver.compose.json"', { shell: 'powershell' }).toString().split('\n').filter(line => line.trim());
            
            driverPaths.forEach(driverPath => {
                if (driverPath.trim()) {
                    try {
                        const composePath = driverPath.trim();
                        const composeContent = fs.readFileSync(composePath, 'utf8');
                        const compose = JSON.parse(composeContent);
                        
                        let updated = false;
                        
                        // Corriger les chemins d'images
                        if (compose.images) {
                            if (compose.images.small && !compose.images.small.startsWith('./')) {
                                compose.images.small = `./assets/images/small.png`;
                                updated = true;
                            }
                            if (compose.images.large && !compose.images.large.startsWith('./')) {
                                compose.images.large = `./assets/images/large.png`;
                                updated = true;
                            }
                        }
                        
                        // S'assurer que l'ID du driver est défini
                        if (!compose.id) {
                            compose.id = path.basename(path.dirname(composePath));
                            updated = true;
                        }
                        
                        // S'assurer que le nom est défini
                        if (!compose.name) {
                            compose.name = {
                                en: `Driver ${compose.id}`
                            };
                            updated = true;
                        }
                        
                        if (updated) {
                            fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
                            fixedPaths++;
                            log(`Driver corrigé: ${composePath}`);
                        }
                        
                    } catch (error) {
                        log(`Erreur correction driver ${driverPath}: ${error.message}`, 'ERROR');
                    }
                }
            });
        }
        
        log(`Chemins de drivers corrigés: ${fixedPaths}`);
        return fixedPaths;
        
    } catch (error) {
        log(`Erreur correction chemins: ${error.message}`, 'ERROR');
        return 0;
    }
}

// Fonction principale
function fixAppStructure() {
    log('🚀 === DÉMARRAGE CORRECTION STRUCTURE APP ===');
    
    try {
        // 1. Analyser la structure actuelle
        const analysis = analyzeCurrentStructure();
        
        if (!analysis) {
            throw new Error('Échec de l\'analyse de la structure');
        }
        
        // 2. Créer la structure des dossiers
        createDirectoryStructure();
        
        // 3. Créer app.js s'il manque
        if (!analysis.appJsExists) {
            createAppJs();
        }
        
        // 4. Créer/corriger app.json
        if (!analysis.appJsonExists || !analysis.appJsonValid) {
            createValidAppJson();
        }
        
        // 5. Corriger les chemins des drivers
        const fixedPaths = fixDriverPaths();
        
        // 6. Valider avec Homey CLI si disponible
        const cliValidation = validateWithHomeyCLI();
        
        // 7. Rapport final
        log('📊 === RAPPORT FINAL CORRECTION STRUCTURE ===');
        log(`Problèmes détectés: ${analysis.issues.length}`);
        log(`Recommandations: ${analysis.recommendations.length}`);
        log(`Chemins corrigés: ${fixedPaths}`);
        log(`Validation CLI: ${cliValidation ? '✅' : '❌'}`);
        
        // Sauvegarder les résultats
        const validationResults = {
            timestamp: new Date().toISOString(),
            analysis,
            fixedPaths,
            cliValidation,
            recommendations: analysis.recommendations
        };
        
        const dataDir = path.dirname(CONFIG.validationDataFile);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(CONFIG.validationDataFile, JSON.stringify(validationResults, null, 2));
        
        log('✅ Correction de la structure app terminée avec succès');
        
        return {
            analysis,
            fixedPaths,
            cliValidation
        };
        
    } catch (error) {
        log(`Erreur correction structure: ${error.message}`, 'ERROR');
        return null;
    }
}

// Exécution si appelé directement
if (require.main === module) {
    fixAppStructure();
}

module.exports = { fixAppStructure }; 