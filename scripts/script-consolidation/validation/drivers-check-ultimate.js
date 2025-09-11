#!/usr/bin/env node
'use strict';

// MEGA ULTIMATE ENHANCED - 2025-08-07T16:33:44.666Z
// Script amélioré avec liens corrigés et fonctionnalités étendues

const fs = require('fs');
const path = require('path');
// Configuration du check
const CHECK_CONFIG = {
    verbose: true,
    checkFiles: ['device.js', 'driver.js', 'driver.compose.json'],
    checkAssets: ['small.png', 'large.png'],
    languages: ['en', 'fr', 'nl', 'ta']
};

// Structure des drivers
const DRIVERS_STRUCTURE = {
    tuya: {
        lights: ['bulbs', 'dimmers', 'rgb', 'strips'],
        plugs: ['indoor', 'outdoor', 'power'],
        switches: ['remote', 'smart', 'wall'],
        sensors: ['humidity', 'motion', 'temperature', 'water'],
        covers: ['blinds', 'curtains', 'shutters'],
        locks: ['keypads', 'smart_locks'],
        thermostats: ['floor', 'smart', 'wall'],
        security: ['cameras', 'alarms'],
        climate: ['fans', 'heaters'],
        automation: ['controllers', 'hubs'],
        controllers: ['gateways', 'bridges'],
        generic: ['unknown', 'misc']
    },
    zigbee: {
        lights: ['bulbs', 'strips'],
        switches: ['onoff', 'dimmers'],
        sensors: ['temperature', 'humidity', 'motion'],
        plugs: ['power', 'energy'],
        covers: ['blinds', 'curtains'],
        thermostats: ['smart', 'floor'],
        automation: ['controllers'],
        security: ['locks', 'alarms']
    }
};

// Fonction pour scanner récursivement les drivers
function scanDrivers(basePath, type) {
    const drivers = [];

    function scanDirectory(dir, category) {
        if (!fs.existsSync(dir)) return;

        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                // Vérifier si c'est un driver (contient device.js ou driver.js)
                const hasDeviceJs = fs.existsSync(path.join(fullPath, 'device.js'));
                const hasDriverJs = fs.existsSync(path.join(fullPath, 'driver.js'));
                const hasComposeJson = fs.existsSync(path.join(fullPath, 'driver.compose.json'));

                if (hasDeviceJs || hasDriverJs || hasComposeJson) {
                    const driverInfo = {
                        path: fullPath,
                        name: item,
                        type: type,
                        category: category,
                        files: {
                            deviceJs: hasDeviceJs,
                            driverJs: hasDriverJs,
                            composeJson: hasComposeJson
                        },
                        status: 'unknown'
                    };

                    // Analyser le statut du driver
                    driverInfo.status = analyzeDriverStatus(driverInfo);
                    drivers.push(driverInfo);
                } else {
                    // Continuer à scanner les sous-dossiers
                    scanDirectory(fullPath, item);
                }
            }
        }
    }

    scanDirectory(basePath, 'root');
    return drivers;
}

// Fonction pour analyser le statut d'un driver
function analyzeDriverStatus(driverInfo) {
    const { files } = driverInfo;

    if (files.deviceJs && files.driverJs && files.composeJson) {
        return 'complete';
    } else if (files.deviceJs || files.driverJs) {
        return 'partial';
    } else if (files.composeJson) {
        return 'config_only';
    } else {
        return 'empty';
    }
}

// Fonction pour vérifier les fichiers d'un driver
function checkDriverFiles(driverPath) {
    const checks = {
        deviceJs: { exists: false, size: 0, valid: false },
        driverJs: { exists: false, size: 0, valid: false },
        composeJson: { exists: false, size: 0, valid: false },
        readme: { exists: false, size: 0 },
        assets: { small: false, large: false, icon: false }
    };

    // Vérifier device.js
    const deviceJsPath = path.join(driverPath, 'device.js');
    if (fs.existsSync(deviceJsPath)) {
        checks.deviceJs.exists = true;
        checks.deviceJs.size = fs.statSync(deviceJsPath).size;
        checks.deviceJs.valid = validateJavaScriptFile(deviceJsPath);
    }

    // Vérifier driver.js
    const driverJsPath = path.join(driverPath, 'driver.js');
    if (fs.existsSync(driverJsPath)) {
        checks.driverJs.exists = true;
        checks.driverJs.size = fs.statSync(driverJsPath).size;
        checks.driverJs.valid = validateJavaScriptFile(driverJsPath);
    }

    // Vérifier driver.compose.json
    const composePath = path.join(driverPath, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
        checks.composeJson.exists = true;
        checks.composeJson.size = fs.statSync(composePath).size;
        checks.composeJson.valid = validateJsonFile(composePath);
    }

    // Vérifier README.md
    const readmePath = path.join(driverPath, 'README.md');
    if (fs.existsSync(readmePath)) {
        checks.readme.exists = true;
        checks.readme.size = fs.statSync(readmePath).size;
    }

    // Vérifier les assets
    const assetsPath = path.join(driverPath, 'assets');
    if (fs.existsSync(assetsPath)) {
        checks.assets.small = fs.existsSync(path.join(assetsPath, 'small.png'));
        checks.assets.large = fs.existsSync(path.join(assetsPath, 'large.png'));
        checks.assets.icon = fs.existsSync(path.join(assetsPath, 'icon.svg'));
    }

    return checks;
}

// Fonction pour valider un fichier JavaScript
function validateJavaScriptFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        // Vérifications basiques
        const hasStrictMode = content.includes("'use strict'");
        const hasModuleExports = content.includes('module.exports');
        const hasClass = content.includes('class');

        return hasStrictMode && hasModuleExports && hasClass;
    } catch (error) {
        return false;
    }
}

// Fonction pour valider un fichier JSON
function validateJsonFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        JSON.parse(content);
        return true;
    } catch (error) {
        return false;
    }
}

// Fonction pour analyser les capacités d'un driver
function analyzeDriverCapabilities(driverPath) {
    const capabilities = [];

    try {
        const composePath = path.join(driverPath, 'driver.compose.json');
        if (fs.existsSync(composePath)) {
            const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            if (compose.capabilities && Array.isArray(compose.capabilities)) {
                capabilities.push(...compose.capabilities);
            }
        }
    } catch (error) {
        // Ignorer les erreurs de parsing
    }

    return capabilities;
}

// Fonction pour générer le rapport complet
function generateCompleteReport() {
    const allDrivers = [];
    let totalDrivers = 0;
    let completeDrivers = 0;
    let partialDrivers = 0;
    let emptyDrivers = 0;

    // Scanner les drivers Tuya
    const tuyaDrivers = scanDrivers('drivers/tuya', 'tuya');
    allDrivers.push(...tuyaDrivers);
    for (const driver of tuyaDrivers) {
        totalDrivers++;

        switch (driver.status) {
            case 'complete':
                completeDrivers++;
                break;
            case 'partial':
                partialDrivers++;
                break;
            case 'empty':
                emptyDrivers++;
                break;
        }
    }

    // Scanner les drivers Zigbee
    const zigbeeDrivers = scanDrivers('drivers/zigbee', 'zigbee');
    allDrivers.push(...zigbeeDrivers);
    for (const driver of zigbeeDrivers) {
        totalDrivers++;

        switch (driver.status) {
            case 'complete':
                completeDrivers++;
                break;
            case 'partial':
                partialDrivers++;
                break;
            case 'empty':
                emptyDrivers++;
                break;
        }
    }

    // Statistiques globales
    // Analyse détaillée par type
    const tuyaByCategory = {};
    const zigbeeByCategory = {};

    for (const driver of allDrivers) {
        if (driver.type === 'tuya') {
            tuyaByCategory[driver.category] = (tuyaByCategory[driver.category] || 0) + 1;
        } else {
            zigbeeByCategory[driver.category] = (zigbeeByCategory[driver.category] || 0) + 1;
        }
    }
    for (const [category, count] of Object.entries(tuyaByCategory)) {
    }
    for (const [category, count] of Object.entries(zigbeeByCategory)) {
    }

    // Liste complète des drivers
    for (const driver of tuyaDrivers) {
        const checks = checkDriverFiles(driver.path);
        const capabilities = analyzeDriverCapabilities(driver.path);
    }
    for (const driver of zigbeeDrivers) {
        const checks = checkDriverFiles(driver.path);
        const capabilities = analyzeDriverCapabilities(driver.path);
    }

    // Recommandations
    if (emptyDrivers > 0) {
    }

    if (partialDrivers > 0) {
    }

    const missingReadme = allDrivers.filter(d => {
        const checks = checkDriverFiles(d.path);
        return !checks.readme.exists;
    }).length;

    if (missingReadme > 0) {
    }

    const missingAssets = allDrivers.filter(d => {
        const checks = checkDriverFiles(d.path);
        return !checks.assets.small || !checks.assets.large || !checks.assets.icon;
    }).length;

    if (missingAssets > 0) {
    }
    return {
        total: totalDrivers,
        complete: completeDrivers,
        partial: partialDrivers,
        empty: emptyDrivers,
        drivers: allDrivers
    };
}

// Fonction principale
function main() {
    try {
        const report = generateCompleteReport();

        // Sauvegarder le rapport
        const reportData = {
            timestamp: new Date().toISOString(),
            summary: {
                total: report.total,
                complete: report.complete,
                partial: report.partial,
                empty: report.empty,
                completenessRate: Math.round((report.complete / report.total) * 100)
            },
            drivers: report.drivers.map(d => ({
                name: d.name,
                type: d.type,
                category: d.category,
                status: d.status,
                path: d.path
            }))
        };

        fs.writeFileSync('drivers-check-report.json', JSON.stringify(reportData, null, 2));
    } catch (error) {
        console.error('❌ ERREUR LORS DU CHECK:', error);
        process.exit(1);
    }
}

// Exécuter le check
main();