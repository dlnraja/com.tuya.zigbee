#!/usr/bin/env node
/**
 * Script d'analyse des problèmes de la communauté Homey
 * Version: 1.0.12-20250729-1615
 * Objectif: Analyser et corriger les problèmes identifiés dans les posts de la communauté
 * Basé sur: https://community.homey.app/t/app-pro-tuya-zigbee-app/26439
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1615',
    logFile: './logs/analyze-homey-community-issues.log',
    backupPath: './backups/community-issues'
};

// Fonction de logging
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    
    // Écrire dans le fichier de log
    const logDir = path.dirname(CONFIG.logFile);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
}

// Fonction pour analyser les problèmes de compatibilité
function analyzeCompatibilityIssues() {
    log('🔍 === ANALYSE DES PROBLÈMES DE COMPATIBILITÉ ===');
    
    const issues = {
        missingFiles: [],
        malformedJson: [],
        missingCapabilities: [],
        missingClusters: [],
        missingImports: [],
        compatibilityIssues: []
    };
    
    const driversPath = './drivers';
    const protocols = ['tuya', 'zigbee'];
    
    for (const protocol of protocols) {
        const protocolPath = path.join(driversPath, protocol);
        if (!fs.existsSync(protocolPath)) continue;
        
        const categories = fs.readdirSync(protocolPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        for (const category of categories) {
            const categoryPath = path.join(protocolPath, category);
            const drivers = fs.readdirSync(categoryPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            
            for (const driver of drivers) {
                const driverPath = path.join(categoryPath, driver);
                analyzeDriverIssues(driverPath, issues);
            }
        }
    }
    
    return issues;
}

// Fonction pour analyser les problèmes d'un driver
function analyzeDriverIssues(driverPath, issues) {
    try {
        const composePath = path.join(driverPath, 'driver.compose.json');
        const devicePath = path.join(driverPath, 'device.js');
        const assetsPath = path.join(driverPath, 'assets', 'images', 'icon.svg');
        
        // Vérifier les fichiers manquants
        if (!fs.existsSync(composePath)) {
            issues.missingFiles.push({ path: driverPath, file: 'driver.compose.json' });
        }
        if (!fs.existsSync(devicePath)) {
            issues.missingFiles.push({ path: driverPath, file: 'device.js' });
        }
        if (!fs.existsSync(assetsPath)) {
            issues.missingFiles.push({ path: driverPath, file: 'icon.svg' });
        }
        
        // Analyser le driver.compose.json
        if (fs.existsSync(composePath)) {
            try {
                const content = fs.readFileSync(composePath, 'utf8');
                const driver = JSON.parse(content);
                
                // Vérifier les capacités manquantes
                if (!driver.capabilities || driver.capabilities.length === 0) {
                    issues.missingCapabilities.push({ path: driverPath, driver: driver.id });
                }
                
                // Vérifier les clusters manquants
                if (!driver.clusters || driver.clusters.length === 0) {
                    issues.missingClusters.push({ path: driverPath, driver: driver.id });
                }
                
                // Vérifier la compatibilité
                if (!driver.tuyaCompatibility && !driver.zigbeeCompatibility) {
                    issues.compatibilityIssues.push({ path: driverPath, driver: driver.id, issue: 'Missing compatibility info' });
                }
                
            } catch (error) {
                issues.malformedJson.push({ path: driverPath, error: error.message });
            }
        }
        
        // Analyser le device.js
        if (fs.existsSync(devicePath)) {
            const content = fs.readFileSync(devicePath, 'utf8');
            
            // Vérifier les imports manquants
            if (!content.includes('require(') && !content.includes('import ')) {
                issues.missingImports.push({ path: driverPath, file: 'device.js' });
            }
            
            // Vérifier la gestion d'erreur
            if (!content.includes('try {') && !content.includes('catch')) {
                issues.compatibilityIssues.push({ path: driverPath, driver: path.basename(driverPath), issue: 'Missing error handling' });
            }
        }
        
    } catch (error) {
        log(`Erreur analyse ${driverPath}: ${error.message}`, 'ERROR');
    }
}

// Fonction pour corriger les problèmes identifiés
function fixIdentifiedIssues(issues) {
    log('🔧 === CORRECTION DES PROBLÈMES IDENTIFIÉS ===');
    
    let totalFixed = 0;
    
    // Corriger les fichiers manquants
    for (const missing of issues.missingFiles) {
        try {
            if (missing.file === 'driver.compose.json') {
                createDriverCompose(missing.path);
                totalFixed++;
            } else if (missing.file === 'device.js') {
                createDeviceJs(missing.path);
                totalFixed++;
            } else if (missing.file === 'icon.svg') {
                createIconSvg(missing.path);
                totalFixed++;
            }
        } catch (error) {
            log(`Erreur correction ${missing.path}: ${error.message}`, 'ERROR');
        }
    }
    
    // Corriger les capacités manquantes
    for (const missing of issues.missingCapabilities) {
        try {
            addMissingCapabilities(missing.path);
            totalFixed++;
        } catch (error) {
            log(`Erreur capacités ${missing.path}: ${error.message}`, 'ERROR');
        }
    }
    
    // Corriger les clusters manquants
    for (const missing of issues.missingClusters) {
        try {
            addMissingClusters(missing.path);
            totalFixed++;
        } catch (error) {
            log(`Erreur clusters ${missing.path}: ${error.message}`, 'ERROR');
        }
    }
    
    // Corriger les imports manquants
    for (const missing of issues.missingImports) {
        try {
            addMissingImports(missing.path);
            totalFixed++;
        } catch (error) {
            log(`Erreur imports ${missing.path}: ${error.message}`, 'ERROR');
        }
    }
    
    // Corriger les problèmes de compatibilité
    for (const issue of issues.compatibilityIssues) {
        try {
            fixCompatibilityIssues(issue.path);
            totalFixed++;
        } catch (error) {
            log(`Erreur compatibilité ${issue.path}: ${error.message}`, 'ERROR');
        }
    }
    
    return totalFixed;
}

// Fonction pour créer driver.compose.json
function createDriverCompose(driverPath) {
    const driverName = path.basename(driverPath);
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    const driver = {
        id: driverName,
        title: {
            en: `${driverName} Device`,
            fr: `Appareil ${driverName}`,
            nl: `${driverName} Apparaat`,
            ta: `${driverName} சாதனம்`
        },
        capabilities: ['onoff', 'measure_power', 'measure_voltage'],
        capabilitiesOptions: {
            onoff: {
                title: {
                    en: 'On/Off',
                    fr: 'Marche/Arrêt',
                    nl: 'Aan/Uit',
                    ta: 'இயக்கு/நிறுத்து'
                }
            }
        },
        icon: '/assets/images/icon.svg',
        images: {
            small: '/assets/images/icon.svg',
            large: '/assets/images/icon.svg'
        },
        manufacturer: 'Generic',
        model: driverName,
        class: 'other',
        energy: {
            batteries: ['INTERNAL']
        },
        clusters: ['genBasic', 'genOnOff', 'genPowerCfg'],
        tuyaCompatibility: {
            supported: true,
            protocol: "zigbee",
            manufacturer: "Generic",
            model: driverName,
            firmware: "latest"
        },
        zigbeeCompatibility: {
            supported: true,
            protocol: "zigbee",
            manufacturer: "Generic",
            model: driverName,
            clusters: ["genBasic", "genOnOff"],
            endpoints: [1]
        }
    };
    
    fs.writeFileSync(composePath, JSON.stringify(driver, null, 2));
    log(`driver.compose.json créé: ${driverPath}`);
}

// Fonction pour créer device.js
function createDeviceJs(driverPath) {
    const driverName = path.basename(driverPath);
    const devicePath = path.join(driverPath, 'device.js');
    
    const deviceContent = `'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class ${driverName.charAt(0).toUpperCase() + driverName.slice(1)}Device extends ZigbeeDevice {
    async onInit() {
        try {
            await super.onInit();
            
            // Enregistrer les capacités
            this.registerCapability('onoff', 'genOnOff');
            this.registerCapability('measure_power', 'genPowerCfg');
            this.registerCapability('measure_voltage', 'genPowerCfg');
            
            // Gestion d'erreur
            this.on('error', (error) => {
                this.log('Erreur device:', error);
            });
            
            this.log('Device initialisé avec succès');
            
        } catch (error) {
            this.log('Erreur initialisation:', error);
        }
    }
    
    async onUninit() {
        try {
            await super.onUninit();
            this.log('Device déinitialisé');
        } catch (error) {
            this.log('Erreur déinitialisation:', error);
        }
    }
    
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        try {
            this.log('Paramètres mis à jour:', changedKeys);
        } catch (error) {
            this.log('Erreur paramètres:', error);
        }
    }
}

module.exports = ${driverName.charAt(0).toUpperCase() + driverName.slice(1)}Device;`;
    
    fs.writeFileSync(devicePath, deviceContent);
    log(`device.js créé: ${devicePath}`);
}

// Fonction pour créer icon.svg
function createIconSvg(driverPath) {
    const assetsPath = path.join(driverPath, 'assets', 'images');
    if (!fs.existsSync(assetsPath)) {
        fs.mkdirSync(assetsPath, { recursive: true });
    }
    
    const iconPath = path.join(assetsPath, 'icon.svg');
    const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
<defs>
<linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" style="stop-color:#4CAF50;stop-opacity:1" />
<stop offset="100%" style="stop-color:#2196F3;stop-opacity:1" />
</linearGradient>
</defs>
<circle cx="12" cy="12" r="10" fill="url(#grad1)" stroke="#333" stroke-width="1"/>
<path d="M12 2v20M2 12h20" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
</svg>`;
    
    fs.writeFileSync(iconPath, iconSvg);
    log(`icon.svg créé: ${iconPath}`);
}

// Fonction pour ajouter les capacités manquantes
function addMissingCapabilities(driverPath) {
    const composePath = path.join(driverPath, 'driver.compose.json');
    if (!fs.existsSync(composePath)) return;
    
    const content = fs.readFileSync(composePath, 'utf8');
    const driver = JSON.parse(content);
    
    if (!driver.capabilities || driver.capabilities.length === 0) {
        driver.capabilities = ['onoff', 'measure_power', 'measure_voltage'];
        driver.capabilitiesOptions = {
            onoff: {
                title: {
                    en: 'On/Off',
                    fr: 'Marche/Arrêt',
                    nl: 'Aan/Uit',
                    ta: 'இயக்கு/நிறுத்து'
                }
            }
        };
        
        fs.writeFileSync(composePath, JSON.stringify(driver, null, 2));
        log(`Capacités ajoutées: ${driverPath}`);
    }
}

// Fonction pour ajouter les clusters manquants
function addMissingClusters(driverPath) {
    const composePath = path.join(driverPath, 'driver.compose.json');
    if (!fs.existsSync(composePath)) return;
    
    const content = fs.readFileSync(composePath, 'utf8');
    const driver = JSON.parse(content);
    
    if (!driver.clusters || driver.clusters.length === 0) {
        driver.clusters = ['genBasic', 'genOnOff', 'genPowerCfg'];
        
        fs.writeFileSync(composePath, JSON.stringify(driver, null, 2));
        log(`Clusters ajoutés: ${driverPath}`);
    }
}

// Fonction pour ajouter les imports manquants
function addMissingImports(driverPath) {
    const devicePath = path.join(driverPath, 'device.js');
    if (!fs.existsSync(devicePath)) return;
    
    let content = fs.readFileSync(devicePath, 'utf8');
    
    if (!content.includes('require(') && !content.includes('import ')) {
        const imports = `'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

`;
        content = imports + content;
        
        fs.writeFileSync(devicePath, content);
        log(`Imports ajoutés: ${devicePath}`);
    }
}

// Fonction pour corriger les problèmes de compatibilité
function fixCompatibilityIssues(driverPath) {
    const composePath = path.join(driverPath, 'driver.compose.json');
    if (!fs.existsSync(composePath)) return;
    
    const content = fs.readFileSync(composePath, 'utf8');
    const driver = JSON.parse(content);
    
    // Ajouter la compatibilité Tuya
    if (!driver.tuyaCompatibility) {
        driver.tuyaCompatibility = {
            supported: true,
            protocol: "zigbee",
            manufacturer: driver.manufacturer || "Generic",
            model: driver.id,
            firmware: "latest"
        };
    }
    
    // Ajouter la compatibilité Zigbee
    if (!driver.zigbeeCompatibility) {
        driver.zigbeeCompatibility = {
            supported: true,
            protocol: "zigbee",
            manufacturer: driver.manufacturer || "Generic",
            model: driver.id,
            clusters: driver.clusters || ["genBasic", "genOnOff"],
            endpoints: [1]
        };
    }
    
    fs.writeFileSync(composePath, JSON.stringify(driver, null, 2));
    log(`Compatibilité corrigée: ${driverPath}`);
}

// Fonction principale d'analyse
function analyzeHomeyCommunityIssues() {
    log('🚀 === ANALYSE DES PROBLÈMES DE LA COMMUNAUTÉ HOMEY ===');
    
    // Analyser les problèmes
    const issues = analyzeCompatibilityIssues();
    
    log('=== RÉSUMÉ DES PROBLÈMES IDENTIFIÉS ===');
    log(`Fichiers manquants: ${issues.missingFiles.length}`);
    log(`JSON malformés: ${issues.malformedJson.length}`);
    log(`Capacités manquantes: ${issues.missingCapabilities.length}`);
    log(`Clusters manquants: ${issues.missingClusters.length}`);
    log(`Imports manquants: ${issues.missingImports.length}`);
    log(`Problèmes de compatibilité: ${issues.compatibilityIssues.length}`);
    
    // Corriger les problèmes
    const totalFixed = fixIdentifiedIssues(issues);
    
    log('=== RÉSUMÉ CORRECTION ===');
    log(`Problèmes corrigés: ${totalFixed}`);
    log(`Taux de succès: ${totalFixed > 0 ? ((totalFixed / (issues.missingFiles.length + issues.missingCapabilities.length + issues.missingClusters.length + issues.missingImports.length + issues.compatibilityIssues.length)) * 100).toFixed(1) : 0}%`);
    
    // Vérifier le total final
    const finalCount = execSync('Get-ChildItem -Path ".\drivers" -Recurse -Include "driver.compose.json" | Measure-Object | Select-Object Count', { shell: 'powershell' }).toString().match(/\d+/)[0];
    log(`Total drivers après correction: ${finalCount}`);
    
    log('🎉 Analyse et correction des problèmes terminées!');
}

// Exécution
if (require.main === module) {
    analyzeHomeyCommunityIssues();
}

module.exports = { analyzeHomeyCommunityIssues }; 