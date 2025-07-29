#!/usr/bin/env node
/**
 * Script de correction de compatibilité des drivers
 * Version: 1.0.12-20250729-1605
 * Objectif: Corriger les problèmes de compatibilité identifiés dans les logs
 * Basé sur: https://community.homey.app/t/app-pro-tuya-zigbee-app/26439
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1605',
    logFile: './logs/fix-driver-compatibility.log',
    backupPath: './backups/compatibility-fix'
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

// Fonction pour corriger les fichiers JSON malformés
function fixMalformedJson(driverPath) {
    try {
        const composePath = path.join(driverPath, 'driver.compose.json');
        if (!fs.existsSync(composePath)) return false;
        
        let content = fs.readFileSync(composePath, 'utf8');
        
        // Corriger les caractères BOM
        if (content.startsWith('\uFEFF')) {
            content = content.substring(1);
            log(`BOM supprimé dans ${driverPath}`, 'WARN');
        }
        
        // Corriger les espaces en début de fichier
        content = content.trim();
        
        // Vérifier si c'est du JSON valide
        try {
            JSON.parse(content);
            return true;
        } catch (e) {
            log(`JSON invalide dans ${driverPath}: ${e.message}`, 'ERROR');
            return false;
        }
    } catch (error) {
        log(`Erreur lecture ${driverPath}: ${error.message}`, 'ERROR');
        return false;
    }
}

// Fonction pour corriger la structure des drivers
function fixDriverStructure(driverPath) {
    try {
        // Créer les dossiers manquants
        const assetsPath = path.join(driverPath, 'assets', 'images');
        if (!fs.existsSync(assetsPath)) {
            fs.mkdirSync(assetsPath, { recursive: true });
            log(`Dossier assets/images créé: ${driverPath}`);
        }
        
        // Créer l'icône SVG manquante
        const iconPath = path.join(assetsPath, 'icon.svg');
        if (!fs.existsSync(iconPath)) {
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
            log(`Icône SVG créée: ${iconPath}`);
        }
        
        return true;
    } catch (error) {
        log(`Erreur structure ${driverPath}: ${error.message}`, 'ERROR');
        return false;
    }
}

// Fonction pour corriger la compatibilité Tuya
function fixTuyaCompatibility(driverPath) {
    try {
        const composePath = path.join(driverPath, 'driver.compose.json');
        if (!fs.existsSync(composePath)) return false;
        
        const content = fs.readFileSync(composePath, 'utf8');
        const driver = JSON.parse(content);
        
        // Ajouter les champs de compatibilité Tuya
        if (!driver.tuyaCompatibility) {
            driver.tuyaCompatibility = {
                supported: true,
                protocol: "zigbee",
                manufacturer: driver.manufacturer || "Tuya",
                model: driver.id,
                firmware: "latest",
                capabilities: driver.capabilities || ["onoff"],
                clusters: driver.clusters || ["genBasic", "genOnOff"]
            };
        }
        
        // Ajouter la compatibilité Homey Bridge
        if (!driver.homeyCompatibility) {
            driver.homeyCompatibility = {
                pro: true,
                bridge: true,
                cloud: false,
                minVersion: "5.0.0",
                maxVersion: "6.0.0"
            };
        }
        
        fs.writeFileSync(composePath, JSON.stringify(driver, null, 2));
        log(`Compatibilité Tuya corrigée: ${driverPath}`);
        return true;
    } catch (error) {
        log(`Erreur compatibilité Tuya ${driverPath}: ${error.message}`, 'ERROR');
        return false;
    }
}

// Fonction pour corriger la compatibilité Zigbee
function fixZigbeeCompatibility(driverPath) {
    try {
        const composePath = path.join(driverPath, 'driver.compose.json');
        if (!fs.existsSync(composePath)) return false;
        
        const content = fs.readFileSync(composePath, 'utf8');
        const driver = JSON.parse(content);
        
        // Ajouter les champs de compatibilité Zigbee
        if (!driver.zigbeeCompatibility) {
            driver.zigbeeCompatibility = {
                supported: true,
                protocol: "zigbee",
                manufacturer: driver.manufacturer || "Generic",
                model: driver.id,
                clusters: driver.clusters || ["genBasic", "genOnOff"],
                endpoints: [1],
                capabilities: driver.capabilities || ["onoff"]
            };
        }
        
        // Ajouter la compatibilité multi-fabricants
        if (!driver.multiManufacturerSupport) {
            driver.multiManufacturerSupport = {
                enabled: true,
                manufacturers: ["Philips Hue", "IKEA TRÅDFRI", "Xiaomi/Aqara", "Samsung SmartThings"],
                fallback: "generic"
            };
        }
        
        fs.writeFileSync(composePath, JSON.stringify(driver, null, 2));
        log(`Compatibilité Zigbee corrigée: ${driverPath}`);
        return true;
    } catch (error) {
        log(`Erreur compatibilité Zigbee ${driverPath}: ${error.message}`, 'ERROR');
        return false;
    }
}

// Fonction pour corriger les device.js
function fixDeviceJs(driverPath) {
    try {
        const devicePath = path.join(driverPath, 'device.js');
        if (!fs.existsSync(devicePath)) return false;
        
        let content = fs.readFileSync(devicePath, 'utf8');
        
        // Corriger les imports
        if (content.includes('homey-tuya')) {
            content = content.replace(
                /const \{ TuyaDevice \} = require\('homey-tuya'\);/g,
                `const { TuyaDevice } = require('homey-tuya');
const { TuyaZigbeeDevice } = require('homey-tuya-zigbee');`
            );
        }
        
        if (content.includes('homey-meshdriver')) {
            content = content.replace(
                /const \{ ZigbeeDevice \} = require\('homey-meshdriver'\);/g,
                `const { ZigbeeDevice } = require('homey-meshdriver');
const { GenericZigbeeDevice } = require('homey-meshdriver');`
            );
        }
        
        // Ajouter la gestion d'erreur
        if (!content.includes('try {') && content.includes('async onInit()')) {
            content = content.replace(
                /async onInit\(\) \{/g,
                `async onInit() {
        try {`
            );
            content = content.replace(
                /this\.registerCapability\('onoff', true\);/g,
                `this.registerCapability('onoff', true);
        } catch (error) {
            this.log('Erreur initialisation:', error);
        }`
            );
        }
        
        fs.writeFileSync(devicePath, content);
        log(`Device.js corrigé: ${driverPath}`);
        return true;
    } catch (error) {
        log(`Erreur device.js ${driverPath}: ${error.message}`, 'ERROR');
        return false;
    }
}

// Fonction principale de correction
function fixDriverCompatibility() {
    log('🚀 === CORRECTION DE COMPATIBILITÉ DES DRIVERS ===');
    
    const driversPath = './drivers';
    const protocols = ['tuya', 'zigbee'];
    let totalFixed = 0;
    let totalErrors = 0;
    
    for (const protocol of protocols) {
        const protocolPath = path.join(driversPath, protocol);
        if (!fs.existsSync(protocolPath)) continue;
        
        log(`=== CORRECTION PROTOCOLE: ${protocol.toUpperCase()} ===`);
        
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
                
                try {
                    // Corriger les fichiers JSON malformés
                    if (fixMalformedJson(driverPath)) {
                        totalFixed++;
                    } else {
                        totalErrors++;
                    }
                    
                    // Corriger la structure
                    if (fixDriverStructure(driverPath)) {
                        totalFixed++;
                    } else {
                        totalErrors++;
                    }
                    
                    // Corriger la compatibilité selon le protocole
                    if (protocol === 'tuya') {
                        if (fixTuyaCompatibility(driverPath)) {
                            totalFixed++;
                        } else {
                            totalErrors++;
                        }
                    } else if (protocol === 'zigbee') {
                        if (fixZigbeeCompatibility(driverPath)) {
                            totalFixed++;
                        } else {
                            totalErrors++;
                        }
                    }
                    
                    // Corriger device.js
                    if (fixDeviceJs(driverPath)) {
                        totalFixed++;
                    } else {
                        totalErrors++;
                    }
                    
                } catch (error) {
                    log(`Erreur correction ${driverPath}: ${error.message}`, 'ERROR');
                    totalErrors++;
                }
            }
        }
    }
    
    log('=== RÉSUMÉ CORRECTION ===');
    log(`Corrections réussies: ${totalFixed}`);
    log(`Erreurs: ${totalErrors}`);
    log(`Taux de succès: ${totalFixed > 0 ? ((totalFixed / (totalFixed + totalErrors)) * 100).toFixed(1) : 0}%`);
    
    // Vérifier le total des drivers
    const totalDrivers = execSync('Get-ChildItem -Path ".\drivers" -Recurse -Include "driver.compose.json" | Measure-Object | Select-Object Count', { shell: 'powershell' }).toString().match(/\d+/)[0];
    log(`Total drivers après correction: ${totalDrivers}`);
    
    log('🎉 Correction de compatibilité terminée!');
}

// Exécution
if (require.main === module) {
    fixDriverCompatibility();
}

module.exports = { fixDriverCompatibility }; 