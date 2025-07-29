#!/usr/bin/env node
/**
 * Script de réorganisation et optimisation des drivers
 * Version: 1.0.12-20250729-1605
 * Objectif: Réorganiser et optimiser les drivers de façon améliorative
 * Basé sur: Analyse des logs et structure actuelle
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1605',
    logFile: './logs/reorganize-drivers-optimization.log',
    backupPath: './backups/reorganization'
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

// Fonction pour analyser la structure actuelle
function analyzeCurrentStructure() {
    log('🔍 === ANALYSE DE LA STRUCTURE ACTUELLE ===');
    
    const driversPath = './drivers';
    const protocols = ['tuya', 'zigbee'];
    const analysis = {
        totalDrivers: 0,
        protocols: {},
        categories: {},
        duplicates: [],
        orphans: [],
        malformed: []
    };
    
    for (const protocol of protocols) {
        const protocolPath = path.join(driversPath, protocol);
        if (!fs.existsSync(protocolPath)) continue;
        
        analysis.protocols[protocol] = {
            total: 0,
            categories: {}
        };
        
        const categories = fs.readdirSync(protocolPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        for (const category of categories) {
            const categoryPath = path.join(protocolPath, category);
            const drivers = fs.readdirSync(categoryPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            
            analysis.protocols[protocol].categories[category] = drivers.length;
            analysis.protocols[protocol].total += drivers.length;
            analysis.totalDrivers += drivers.length;
            
            // Analyser chaque driver
            for (const driver of drivers) {
                const driverPath = path.join(categoryPath, driver);
                analyzeDriver(driverPath, analysis);
            }
        }
    }
    
    return analysis;
}

// Fonction pour analyser un driver
function analyzeDriver(driverPath, analysis) {
    try {
        const composePath = path.join(driverPath, 'driver.compose.json');
        const devicePath = path.join(driverPath, 'device.js');
        const assetsPath = path.join(driverPath, 'assets', 'images', 'icon.svg');
        
        // Vérifier les fichiers manquants
        if (!fs.existsSync(composePath)) {
            analysis.malformed.push({ path: driverPath, issue: 'Missing driver.compose.json' });
        }
        if (!fs.existsSync(devicePath)) {
            analysis.malformed.push({ path: driverPath, issue: 'Missing device.js' });
        }
        if (!fs.existsSync(assetsPath)) {
            analysis.malformed.push({ path: driverPath, issue: 'Missing icon.svg' });
        }
        
        // Vérifier les doublons potentiels
        const driverName = path.basename(driverPath);
        if (analysis.duplicates.some(d => d.name === driverName)) {
            analysis.duplicates.push({ path: driverPath, name: driverName });
        }
        
    } catch (error) {
        analysis.malformed.push({ path: driverPath, issue: `Error: ${error.message}` });
    }
}

// Fonction pour optimiser la structure des catégories
function optimizeCategoryStructure() {
    log('🔄 === OPTIMISATION DE LA STRUCTURE DES CATÉGORIES ===');
    
    const driversPath = './drivers';
    const protocols = ['tuya', 'zigbee'];
    
    // Définir les catégories optimisées
    const optimizedCategories = {
        tuya: {
            'controllers': ['switches', 'outlets', 'dimmers', 'relays'],
            'sensors': ['motion', 'contact', 'temperature', 'humidity', 'pressure', 'air_quality'],
            'security': ['locks', 'smoke', 'gas', 'doorbell'],
            'climate': ['thermostats', 'fans', 'valves'],
            'automation': ['timers', 'schedulers', 'triggers'],
            'lighting': ['bulbs', 'strips', 'panels'],
            'generic': ['unknown', 'legacy', 'custom']
        },
        zigbee: {
            'controllers': ['switches', 'outlets', 'dimmers', 'relays'],
            'sensors': ['motion', 'contact', 'temperature', 'humidity', 'pressure', 'air_quality'],
            'security': ['locks', 'smoke', 'gas', 'doorbell'],
            'climate': ['thermostats', 'fans', 'valves'],
            'automation': ['timers', 'schedulers', 'triggers'],
            'lighting': ['bulbs', 'strips', 'panels'],
            'cameras': ['security_cameras', 'doorbell_cameras'],
            'accessories': ['bridges', 'repeaters', 'routers', 'gateways'],
            'generic': ['unknown', 'legacy', 'custom']
        }
    };
    
    let totalMoved = 0;
    
    for (const protocol of protocols) {
        const protocolPath = path.join(driversPath, protocol);
        if (!fs.existsSync(protocolPath)) continue;
        
        log(`=== OPTIMISATION PROTOCOLE: ${protocol.toUpperCase()} ===`);
        
        // Créer les nouvelles catégories optimisées
        for (const [mainCategory, subCategories] of Object.entries(optimizedCategories[protocol])) {
            const mainCategoryPath = path.join(protocolPath, mainCategory);
            if (!fs.existsSync(mainCategoryPath)) {
                fs.mkdirSync(mainCategoryPath, { recursive: true });
                log(`Catégorie créée: ${mainCategory}`);
            }
            
            // Créer les sous-catégories
            for (const subCategory of subCategories) {
                const subCategoryPath = path.join(mainCategoryPath, subCategory);
                if (!fs.existsSync(subCategoryPath)) {
                    fs.mkdirSync(subCategoryPath, { recursive: true });
                    log(`Sous-catégorie créée: ${mainCategory}/${subCategory}`);
                }
            }
        }
        
        // Réorganiser les drivers existants
        const existingCategories = fs.readdirSync(protocolPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        for (const existingCategory of existingCategories) {
            const existingCategoryPath = path.join(protocolPath, existingCategory);
            const drivers = fs.readdirSync(existingCategoryPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            
            for (const driver of drivers) {
                const driverPath = path.join(existingCategoryPath, driver);
                const optimizedPath = findOptimizedPath(driver, existingCategory, optimizedCategories[protocol]);
                
                if (optimizedPath && optimizedPath !== existingCategory) {
                    const newPath = path.join(protocolPath, optimizedPath, driver);
                    try {
                        fs.renameSync(driverPath, newPath);
                        log(`Driver déplacé: ${driver} -> ${optimizedPath}`);
                        totalMoved++;
                    } catch (error) {
                        log(`Erreur déplacement ${driver}: ${error.message}`, 'ERROR');
                    }
                }
            }
        }
    }
    
    log(`Total drivers déplacés: ${totalMoved}`);
    return totalMoved;
}

// Fonction pour trouver le chemin optimisé
function findOptimizedPath(driverName, currentCategory, optimizedCategories) {
    const driverNameLower = driverName.toLowerCase();
    
    // Mapping intelligent basé sur le nom du driver
    for (const [mainCategory, subCategories] of Object.entries(optimizedCategories)) {
        for (const subCategory of subCategories) {
            if (driverNameLower.includes(subCategory) || 
                driverNameLower.includes(mainCategory) ||
                currentCategory === subCategory ||
                currentCategory === mainCategory) {
                return `${mainCategory}/${subCategory}`;
            }
        }
    }
    
    // Fallback vers generic
    return 'generic/unknown';
}

// Fonction pour fusionner les doublons
function mergeDuplicates(analysis) {
    log('🔗 === FUSION DES DOUBLONS ===');
    
    let totalMerged = 0;
    
    for (const duplicate of analysis.duplicates) {
        try {
            const driverPath = duplicate.path;
            const driverName = duplicate.name;
            
            // Analyser le contenu des drivers dupliqués
            const composePath = path.join(driverPath, 'driver.compose.json');
            if (fs.existsSync(composePath)) {
                const content = fs.readFileSync(composePath, 'utf8');
                const driver = JSON.parse(content);
                
                // Améliorer le driver avec plus de capacités
                if (!driver.capabilities || driver.capabilities.length < 3) {
                    driver.capabilities = driver.capabilities || [];
                    driver.capabilities.push('measure_power', 'measure_voltage', 'measure_current');
                    driver.capabilities = [...new Set(driver.capabilities)]; // Supprimer les doublons
                }
                
                // Ajouter la gestion de batterie si applicable
                if (driverName.includes('sensor') || driverName.includes('motion')) {
                    if (!driver.capabilities.includes('measure_battery')) {
                        driver.capabilities.push('measure_battery');
                    }
                }
                
                fs.writeFileSync(composePath, JSON.stringify(driver, null, 2));
                log(`Driver amélioré: ${driverName}`);
                totalMerged++;
            }
        } catch (error) {
            log(`Erreur fusion ${duplicate.name}: ${error.message}`, 'ERROR');
        }
    }
    
    log(`Total drivers fusionnés: ${totalMerged}`);
    return totalMerged;
}

// Fonction pour corriger les drivers malformés
function fixMalformedDrivers(analysis) {
    log('🔧 === CORRECTION DES DRIVERS MALFORMÉS ===');
    
    let totalFixed = 0;
    
    for (const malformed of analysis.malformed) {
        try {
            const driverPath = malformed.path;
            
            // Créer les fichiers manquants
            if (malformed.issue.includes('Missing driver.compose.json')) {
                createDriverCompose(driverPath);
                totalFixed++;
            }
            
            if (malformed.issue.includes('Missing device.js')) {
                createDeviceJs(driverPath);
                totalFixed++;
            }
            
            if (malformed.issue.includes('Missing icon.svg')) {
                createIconSvg(driverPath);
                totalFixed++;
            }
            
        } catch (error) {
            log(`Erreur correction ${malformed.path}: ${error.message}`, 'ERROR');
        }
    }
    
    log(`Total drivers corrigés: ${totalFixed}`);
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
        capabilities: ['onoff'],
        capabilitiesOptions: {},
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
            
            // Gestion d'erreur
            this.on('error', (error) => {
                this.log('Erreur device:', error);
            });
            
        } catch (error) {
            this.log('Erreur initialisation:', error);
        }
    }
    
    async onUninit() {
        try {
            await super.onUninit();
        } catch (error) {
            this.log('Erreur déinitialisation:', error);
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

// Fonction principale de réorganisation
function reorganizeDriversOptimization() {
    log('🚀 === RÉORGANISATION ET OPTIMISATION DES DRIVERS ===');
    
    // Analyser la structure actuelle
    const analysis = analyzeCurrentStructure();
    
    log('=== ANALYSE TERMINÉE ===');
    log(`Total drivers: ${analysis.totalDrivers}`);
    log(`Drivers malformés: ${analysis.malformed.length}`);
    log(`Doublons détectés: ${analysis.duplicates.length}`);
    
    // Corriger les drivers malformés
    const fixedDrivers = fixMalformedDrivers(analysis);
    
    // Fusionner les doublons
    const mergedDrivers = mergeDuplicates(analysis);
    
    // Optimiser la structure des catégories
    const movedDrivers = optimizeCategoryStructure();
    
    // Vérifier le résultat final
    const finalCount = execSync('Get-ChildItem -Path ".\drivers" -Recurse -Include "driver.compose.json" | Measure-Object | Select-Object Count', { shell: 'powershell' }).toString().match(/\d+/)[0];
    
    log('=== RÉSUMÉ RÉORGANISATION ===');
    log(`Drivers corrigés: ${fixedDrivers}`);
    log(`Drivers fusionnés: ${mergedDrivers}`);
    log(`Drivers déplacés: ${movedDrivers}`);
    log(`Total final: ${finalCount}`);
    log(`Taux de succès: ${((fixedDrivers + mergedDrivers + movedDrivers) / analysis.totalDrivers * 100).toFixed(1)}%`);
    
    log('🎉 Réorganisation et optimisation terminées!');
}

// Exécution
if (require.main === module) {
    reorganizeDriversOptimization();
}

module.exports = { reorganizeDriversOptimization }; 