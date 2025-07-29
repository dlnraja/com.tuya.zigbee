#!/usr/bin/env node

/**
 * Script de récupération de nouveaux appareils depuis les sources externes
 * Version: 1.0.12-20250729-1405
 * Objectif: Scraper toutes les sources externes et ajouter nouveaux dossiers drivers/ en mode todo-
 * Spécificités: Ajoute nouveaux dossiers drivers/ en mode todo-
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    driversPath: './drivers',
    todoPath: './drivers/todo-devices',
    logFile: './logs/fetch-devices.log',
    reportFile: './reports/fetch-report.json',
    sources: [
        {
            name: 'Tuya Developer',
            url: 'https://developer.tuya.com/en/docs/iot/device-development/tuya-zigbee-sdk/tuya-zigbee-sdk?id=Kb3enqgqh89gq',
            type: 'api'
        },
        {
            name: 'Homey Apps',
            url: 'https://apps.homey.app/fr/apps',
            type: 'web'
        },
        {
            name: 'Zigbee2MQTT Devices',
            url: 'https://www.zigbee2mqtt.io/supported-devices/',
            type: 'web'
        },
        {
            name: 'Homey Community',
            url: 'https://community.homey.app/t/c/com.tuya.zigbee',
            type: 'forum'
        }
    ],
    maxNewDevices: 100, // Limite de nouveaux appareils par exécution
    createTodoStructure: true
};

// Classes de gestion
class DeviceInfo {
    constructor(name, source, category, capabilities = []) {
        this.name = name;
        this.source = source;
        this.category = category;
        this.capabilities = capabilities;
        this.timestamp = new Date().toISOString();
        this.status = 'todo';
    }
}

class FetchResult {
    constructor() {
        this.newDevices = [];
        this.existingDevices = [];
        this.errors = [];
        this.sourcesChecked = [];
        this.timestamp = new Date().toISOString();
    }

    addNewDevice(device) {
        this.newDevices.push(device);
    }

    addExistingDevice(device) {
        this.existingDevices.push(device);
    }

    addError(error) {
        this.errors.push(error);
    }

    addSourceChecked(source) {
        this.sourcesChecked.push(source);
    }

    toJSON() {
        return {
            timestamp: this.timestamp,
            statistics: {
                newDevices: this.newDevices.length,
                existingDevices: this.existingDevices.length,
                errors: this.errors.length,
                sourcesChecked: this.sourcesChecked.length
            },
            newDevices: this.newDevices,
            existingDevices: this.existingDevices,
            errors: this.errors,
            sourcesChecked: this.sourcesChecked
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

function ensureDirectories() {
    const dirs = ['./logs', './reports', './drivers/todo-devices'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

function sanitizeDeviceName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function getExistingDevices() {
    const devices = new Set();
    
    function scanDrivers(dir) {
        if (!fs.existsSync(dir)) return;
        
        const items = fs.readdirSync(dir);
        items.forEach(item => {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                if (fs.existsSync(path.join(fullPath, 'device.js'))) {
                    devices.add(item);
                } else {
                    scanDrivers(fullPath);
                }
            }
        });
    }
    
    scanDrivers(CONFIG.driversPath);
    return devices;
}

// Fonctions de scraping
async function fetchFromAPI(url, sourceName) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData);
                } catch (error) {
                    reject(new Error(`Erreur parsing JSON de ${sourceName}: ${error.message}`));
                }
            });
        }).on('error', (error) => {
            reject(new Error(`Erreur HTTP pour ${sourceName}: ${error.message}`));
        });
    });
}

async function fetchFromWeb(url, sourceName) {
    // Simulation de récupération web (en réalité, utiliser puppeteer ou cheerio)
    log(`Simulation de récupération depuis ${sourceName} (${url})`);
    
    // Retourner des données simulées
    return {
        devices: [
            { name: `${sourceName}-device-1`, category: 'controllers', capabilities: ['onoff'] },
            { name: `${sourceName}-device-2`, category: 'sensors', capabilities: ['measure_temperature'] },
            { name: `${sourceName}-device-3`, category: 'security', capabilities: ['alarm_motion'] }
        ]
    };
}

async function fetchFromForum(url, sourceName) {
    // Simulation de récupération forum
    log(`Simulation de récupération depuis le forum ${sourceName} (${url})`);
    
    return {
        devices: [
            { name: `forum-${sourceName}-device-1`, category: 'controllers', capabilities: ['onoff', 'dim'] },
            { name: `forum-${sourceName}-device-2`, category: 'sensors', capabilities: ['measure_humidity'] }
        ]
    };
}

// Fonction de création de structure todo
function createTodoDevice(deviceInfo) {
    const deviceName = sanitizeDeviceName(deviceInfo.name);
    const devicePath = path.join(CONFIG.todoPath, deviceName);
    
    try {
        // Création du dossier
        if (!fs.existsSync(devicePath)) {
            fs.mkdirSync(devicePath, { recursive: true });
        }
        
        // Création du device.js basique
        const deviceJS = `const { ZigbeeDevice } = require('homey-meshdriver');

class ${deviceName.charAt(0).toUpperCase() + deviceName.slice(1)}Device extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        this.startPolling();
    }

    async onUninit() {
        this.stopPolling();
        await super.onUninit();
    }
}

module.exports = ${deviceName.charAt(0).toUpperCase() + deviceName.slice(1)}Device;`;
        
        fs.writeFileSync(path.join(devicePath, 'device.js'), deviceJS);
        
        // Création du driver.compose.json
        const composeJSON = {
            id: deviceName,
            title: `${deviceInfo.name} Device`,
            category: deviceInfo.category,
            capabilities: deviceInfo.capabilities,
            images: {
                small: 'assets/images/small.png',
                large: 'assets/images/large.png'
            }
        };
        
        fs.writeFileSync(
            path.join(devicePath, 'driver.compose.json'),
            JSON.stringify(composeJSON, null, 2)
        );
        
        // Création du driver.settings.compose.json
        const settingsJSON = {
            id: `${deviceName}_settings`,
            title: `${deviceInfo.name} Settings`,
            category: 'settings'
        };
        
        fs.writeFileSync(
            path.join(devicePath, 'driver.settings.compose.json'),
            JSON.stringify(settingsJSON, null, 2)
        );
        
        // Création du dossier assets
        const assetsPath = path.join(devicePath, 'assets', 'images');
        if (!fs.existsSync(assetsPath)) {
            fs.mkdirSync(assetsPath, { recursive: true });
        }
        
        // Création d'une icône SVG basique
        const iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="12" cy="12" r="10" fill="url(#grad1)"/>
  <text x="12" y="16" text-anchor="middle" fill="white" font-size="12">${deviceName.charAt(0).toUpperCase()}</text>
</svg>`;
        
        fs.writeFileSync(path.join(assetsPath, 'icon.svg'), iconSVG);
        
        // Création du fichier info.json
        const infoJSON = {
            name: deviceInfo.name,
            source: deviceInfo.source,
            category: deviceInfo.category,
            capabilities: deviceInfo.capabilities,
            status: 'todo',
            created: new Date().toISOString(),
            notes: `Device créé automatiquement depuis ${deviceInfo.source}`
        };
        
        fs.writeFileSync(
            path.join(devicePath, 'info.json'),
            JSON.stringify(infoJSON, null, 2)
        );
        
        return true;
        
    } catch (error) {
        log(`Erreur lors de la création du device ${deviceName}: ${error.message}`, 'ERROR');
        return false;
    }
}

// Fonction de traitement des sources
async function processSource(source, result) {
    try {
        log(`Traitement de la source: ${source.name}`);
        
        let devices = [];
        
        switch (source.type) {
            case 'api':
                const apiData = await fetchFromAPI(source.url, source.name);
                devices = apiData.devices || [];
                break;
                
            case 'web':
                const webData = await fetchFromWeb(source.url, source.name);
                devices = webData.devices || [];
                break;
                
            case 'forum':
                const forumData = await fetchFromForum(source.url, source.name);
                devices = forumData.devices || [];
                break;
                
            default:
                log(`Type de source non supporté: ${source.type}`, 'WARNING');
                return;
        }
        
        log(`Trouvé ${devices.length} appareils dans ${source.name}`);
        
        // Traitement des appareils trouvés
        devices.forEach(device => {
            const deviceInfo = new DeviceInfo(
                device.name,
                source.name,
                device.category || 'controllers',
                device.capabilities || ['onoff']
            );
            
            if (createTodoDevice(deviceInfo)) {
                result.addNewDevice(deviceInfo);
            }
        });
        
        result.addSourceChecked(source.name);
        
    } catch (error) {
        log(`Erreur lors du traitement de ${source.name}: ${error.message}`, 'ERROR');
        result.addError({
            source: source.name,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

// Fonction principale
async function main() {
    log('Démarrage de la récupération de nouveaux appareils...');
    
    // Initialisation
    ensureDirectories();
    
    const result = new FetchResult();
    const existingDevices = getExistingDevices();
    
    log(`Trouvé ${existingDevices.size} appareils existants`);
    
    try {
        // Traitement de chaque source
        for (const source of CONFIG.sources) {
            await processSource(source, result);
            
            // Vérification de la limite de nouveaux appareils
            if (result.newDevices.length >= CONFIG.maxNewDevices) {
                log(`Limite de nouveaux appareils atteinte (${CONFIG.maxNewDevices})`, 'WARNING');
                break;
            }
        }
        
        // Génération du rapport
        fs.writeFileSync(CONFIG.reportFile, JSON.stringify(result.toJSON(), null, 2));
        
        // Affichage des résultats
        log('=== RÉSULTATS DE LA RÉCUPÉRATION ===');
        log(`Nouveaux appareils: ${result.newDevices.length}`);
        log(`Appareils existants: ${result.existingDevices.length}`);
        log(`Erreurs: ${result.errors.length}`);
        log(`Sources vérifiées: ${result.sourcesChecked.length}`);
        
        if (result.newDevices.length > 0) {
            log('=== NOUVEAUX APPAREILS CRÉÉS ===');
            result.newDevices.forEach(device => {
                log(`- ${device.name} (${device.source}) - ${device.category}`);
            });
        }
        
        if (result.errors.length > 0) {
            log('=== ERREURS DÉTECTÉES ===');
            result.errors.forEach(error => {
                log(`- ${error.source}: ${error.error}`, 'ERROR');
            });
        }
        
        log('Récupération terminée avec succès');
        
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
    createTodoDevice,
    sanitizeDeviceName,
    getExistingDevices,
    processSource,
    FetchResult,
    DeviceInfo
};