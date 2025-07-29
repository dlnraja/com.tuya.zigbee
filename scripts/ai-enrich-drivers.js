#!/usr/bin/env node
/**
 * Script d'enrichissement AI des drivers avec OpenAI
 * Version: 1.0.12-20250729-1405
 * Objectif: Utilise OpenAI (si dispo) pour compléter clusters, capabilities, comportement, UI
 * Spécificités: Facultatif et fallback si clé absente
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1405',
    driversPath: './drivers',
    openaiApiKey: process.env.OPENAI_API_KEY,
    maxTokens: 2000,
    temperature: 0.7,
    logFile: './logs/ai-enrichment.log',
    backupPath: './backups/ai-enrichment'
};

// Logging
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    
    // Créer le dossier logs s'il n'existe pas
    const logDir = path.dirname(CONFIG.logFile);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
}

// Créer backup
function createBackup(driverPath) {
    const backupDir = path.join(CONFIG.backupPath, path.basename(driverPath));
    if (!fs.existsSync(CONFIG.backupPath)) {
        fs.mkdirSync(CONFIG.backupPath, { recursive: true });
    }
    
    if (fs.existsSync(driverPath)) {
        execSync(`cp -r "${driverPath}" "${backupDir}"`, { stdio: 'inherit' });
        log(`Backup créé: ${backupDir}`);
    }
}

// Appel OpenAI API
async function callOpenAI(prompt, systemPrompt = '') {
    if (!CONFIG.openaiApiKey) {
        log('Clé OpenAI non disponible, utilisation du mode fallback', 'WARN');
        return null;
    }
    
    const data = JSON.stringify({
        model: 'gpt-4',
        messages: [
            { role: 'system', content: systemPrompt || 'Tu es un expert en développement Homey SDK3 et Zigbee. Tu aides à enrichir les drivers avec des fonctionnalités avancées.' },
            { role: 'user', content: prompt }
        ],
        max_tokens: CONFIG.maxTokens,
        temperature: CONFIG.temperature
    });
    
    const options = {
        hostname: 'api.openai.com',
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.openaiApiKey}`,
            'Content-Length': data.length
        }
    };
    
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(responseData);
                    if (response.choices && response.choices[0]) {
                        resolve(response.choices[0].message.content);
                    } else {
                        reject(new Error('Réponse OpenAI invalide'));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.write(data);
        req.end();
    });
}

// Enrichir capabilities
async function enrichCapabilities(driverPath) {
    const composePath = path.join(driverPath, 'driver.compose.json');
    if (!fs.existsSync(composePath)) {
        log(`Fichier compose.json non trouvé: ${composePath}`, 'ERROR');
        return false;
    }
    
    try {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        
        // Analyser les capabilities existantes
        const existingCapabilities = compose.capabilities || [];
        const deviceType = path.basename(driverPath);
        
        const prompt = `
Analyse ce driver Homey SDK3 et suggère des capabilities supplémentaires:

Device: ${deviceType}
Capabilities existantes: ${existingCapabilities.join(', ')}

Suggère des capabilities supplémentaires appropriées pour ce type d'appareil.
Format de réponse: JSON array de capabilities, exemple: ["onoff", "dim", "measure_power"]
        `;
        
        const aiResponse = await callOpenAI(prompt);
        if (aiResponse) {
            try {
                const suggestedCapabilities = JSON.parse(aiResponse);
                const newCapabilities = suggestedCapabilities.filter(cap => !existingCapabilities.includes(cap));
                
                if (newCapabilities.length > 0) {
                    compose.capabilities = [...existingCapabilities, ...newCapabilities];
                    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
                    log(`Capabilities enrichies pour ${deviceType}: ${newCapabilities.join(', ')}`);
                    return true;
                }
            } catch (error) {
                log(`Erreur parsing réponse AI: ${error.message}`, 'ERROR');
            }
        }
        
        // Fallback: ajouter capabilities basiques selon le type
        const fallbackCapabilities = getFallbackCapabilities(deviceType);
        if (fallbackCapabilities.length > 0) {
            compose.capabilities = [...existingCapabilities, ...fallbackCapabilities];
            fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
            log(`Capabilities fallback ajoutées pour ${deviceType}: ${fallbackCapabilities.join(', ')}`);
            return true;
        }
        
    } catch (error) {
        log(`Erreur enrichissement capabilities: ${error.message}`, 'ERROR');
    }
    
    return false;
}

// Fallback capabilities selon le type d'appareil
function getFallbackCapabilities(deviceType) {
    const capabilitiesMap = {
        'plug': ['measure_power', 'measure_current', 'measure_voltage'],
        'switch': ['measure_power'],
        'light': ['dim', 'light_temperature', 'light_mode'],
        'sensor': ['measure_temperature', 'measure_humidity', 'measure_pressure'],
        'motion': ['alarm_motion'],
        'contact': ['alarm_contact'],
        'smoke': ['alarm_smoke'],
        'water': ['alarm_water'],
        'battery': ['measure_battery', 'alarm_battery']
    };
    
    for (const [type, caps] of Object.entries(capabilitiesMap)) {
        if (deviceType.toLowerCase().includes(type)) {
            return caps;
        }
    }
    
    return [];
}

// Enrichir clusters Zigbee
async function enrichClusters(driverPath) {
    const devicePath = path.join(driverPath, 'device.js');
    if (!fs.existsSync(devicePath)) {
        log(`Fichier device.js non trouvé: ${devicePath}`, 'ERROR');
        return false;
    }
    
    try {
        const deviceCode = fs.readFileSync(devicePath, 'utf8');
        const deviceType = path.basename(driverPath);
        
        const prompt = `
Analyse ce code device.js Homey SDK3 et suggère des clusters Zigbee supplémentaires:

Device: ${deviceType}
Code actuel: ${deviceCode.substring(0, 500)}...

Suggère des clusters Zigbee appropriés pour ce type d'appareil.
Format: JSON array de clusters, exemple: ["genBasic", "genOnOff", "genLevelCtrl"]
        `;
        
        const aiResponse = await callOpenAI(prompt);
        if (aiResponse) {
            try {
                const suggestedClusters = JSON.parse(aiResponse);
                log(`Clusters suggérés pour ${deviceType}: ${suggestedClusters.join(', ')}`);
                
                // Ajouter les clusters au code device.js
                const clusterComment = `\n    // Clusters Zigbee enrichis: ${suggestedClusters.join(', ')}\n`;
                const updatedCode = deviceCode.replace(/class \w+ extends Homey\.Device {/, 
                    `class ${path.basename(deviceType)} extends Homey.Device {${clusterComment}`);
                
                fs.writeFileSync(devicePath, updatedCode);
                return true;
            } catch (error) {
                log(`Erreur parsing clusters AI: ${error.message}`, 'ERROR');
            }
        }
        
        // Fallback: clusters basiques
        const fallbackClusters = getFallbackClusters(deviceType);
        if (fallbackClusters.length > 0) {
            const clusterComment = `\n    // Clusters Zigbee fallback: ${fallbackClusters.join(', ')}\n`;
            const updatedCode = deviceCode.replace(/class \w+ extends Homey\.Device {/, 
                `class ${path.basename(deviceType)} extends Homey.Device {${clusterComment}`);
            
            fs.writeFileSync(devicePath, updatedCode);
            log(`Clusters fallback ajoutés pour ${deviceType}: ${fallbackClusters.join(', ')}`);
            return true;
        }
        
    } catch (error) {
        log(`Erreur enrichissement clusters: ${error.message}`, 'ERROR');
    }
    
    return false;
}

// Fallback clusters selon le type
function getFallbackClusters(deviceType) {
    const clustersMap = {
        'plug': ['genBasic', 'genOnOff', 'genPowerCfg'],
        'switch': ['genBasic', 'genOnOff'],
        'light': ['genBasic', 'genOnOff', 'genLevelCtrl', 'lightingColorCtrl'],
        'sensor': ['genBasic', 'msTemperatureMeasurement', 'msRelativeHumidity'],
        'motion': ['genBasic', 'ssIasZone'],
        'contact': ['genBasic', 'ssIasZone'],
        'smoke': ['genBasic', 'ssIasZone'],
        'water': ['genBasic', 'ssIasZone']
    };
    
    for (const [type, clusters] of Object.entries(clustersMap)) {
        if (deviceType.toLowerCase().includes(type)) {
            return clusters;
        }
    }
    
    return ['genBasic'];
}

// Enrichir UI et comportement
async function enrichUI(driverPath) {
    const settingsPath = path.join(driverPath, 'driver.settings.compose.json');
    const deviceType = path.basename(driverPath);
    
    const prompt = `
Crée une interface utilisateur enrichie pour ce driver Homey:

Device: ${deviceType}
Type: ${deviceType.includes('tuya') ? 'Tuya' : 'Zigbee'}

Suggère des paramètres UI avancés (voltage, amperage, battery, alerts, etc.)
Format: JSON object avec sections UI
        `;
    
    const aiResponse = await callOpenAI(prompt);
    if (aiResponse) {
        try {
            const uiSettings = JSON.parse(aiResponse);
            
            // Créer ou mettre à jour le fichier settings
            const existingSettings = fs.existsSync(settingsPath) ? 
                JSON.parse(fs.readFileSync(settingsPath, 'utf8')) : {};
            
            const enrichedSettings = {
                ...existingSettings,
                ...uiSettings
            };
            
            fs.writeFileSync(settingsPath, JSON.stringify(enrichedSettings, null, 2));
            log(`UI enrichie pour ${deviceType}`);
            return true;
        } catch (error) {
            log(`Erreur parsing UI AI: ${error.message}`, 'ERROR');
        }
    }
    
    // Fallback: UI basique
    const fallbackUI = getFallbackUI(deviceType);
    if (fallbackUI) {
        fs.writeFileSync(settingsPath, JSON.stringify(fallbackUI, null, 2));
        log(`UI fallback créée pour ${deviceType}`);
        return true;
    }
    
    return false;
}

// Fallback UI
function getFallbackUI(deviceType) {
    const baseUI = {
        title: {
            en: `${deviceType} Settings`,
            fr: `Paramètres ${deviceType}`,
            nl: `${deviceType} Instellingen`,
            ta: `${deviceType} அமைப்புகள்`
        },
        group: {
            en: 'Advanced Settings',
            fr: 'Paramètres Avancés',
            nl: 'Geavanceerde Instellingen',
            ta: 'மேம்பட்ட அமைப்புகள்'
        }
    };
    
    if (deviceType.includes('battery') || deviceType.includes('sensor')) {
        return {
            ...baseUI,
            battery_alert: {
                type: 'boolean',
                title: {
                    en: 'Battery Alert',
                    fr: 'Alerte Batterie',
                    nl: 'Batterij Waarschuwing',
                    ta: 'பேட்டரி எச்சரிக்கை'
                },
                default: true
            }
        };
    }
    
    if (deviceType.includes('power') || deviceType.includes('plug')) {
        return {
            ...baseUI,
            power_monitoring: {
                type: 'boolean',
                title: {
                    en: 'Power Monitoring',
                    fr: 'Surveillance Électrique',
                    nl: 'Stroom Monitoring',
                    ta: 'மின் கண்காணிப்பு'
                },
                default: true
            }
        };
    }
    
    return baseUI;
}

// Fonction principale
async function enrichDriver(driverPath) {
    log(`Enrichissement AI du driver: ${driverPath}`);
    
    // Créer backup
    createBackup(driverPath);
    
    let enriched = false;
    
    // Enrichir capabilities
    if (await enrichCapabilities(driverPath)) {
        enriched = true;
    }
    
    // Enrichir clusters
    if (await enrichClusters(driverPath)) {
        enriched = true;
    }
    
    // Enrichir UI
    if (await enrichUI(driverPath)) {
        enriched = true;
    }
    
    if (enriched) {
        log(`Driver enrichi avec succès: ${driverPath}`);
    } else {
        log(`Aucun enrichissement appliqué: ${driverPath}`, 'WARN');
    }
    
    return enriched;
}

// Enrichir tous les drivers
async function enrichAllDrivers() {
    log('=== DÉBUT ENRICHISSEMENT AI DES DRIVERS ===');
    
    if (!fs.existsSync(CONFIG.driversPath)) {
        log(`Dossier drivers non trouvé: ${CONFIG.driversPath}`, 'ERROR');
        return;
    }
    
    const drivers = [];
    
    // Parcourir tous les dossiers drivers
    const tuyaPath = path.join(CONFIG.driversPath, 'tuya');
    const zigbeePath = path.join(CONFIG.driversPath, 'zigbee');
    
    for (const protocolPath of [tuyaPath, zigbeePath]) {
        if (fs.existsSync(protocolPath)) {
            const categories = fs.readdirSync(protocolPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            
            for (const category of categories) {
                const categoryPath = path.join(protocolPath, category);
                const categoryDrivers = fs.readdirSync(categoryPath, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => path.join(categoryPath, dirent.name));
                
                drivers.push(...categoryDrivers);
            }
        }
    }
    
    log(`Drivers trouvés: ${drivers.length}`);
    
    let enrichedCount = 0;
    let errorCount = 0;
    
    for (const driverPath of drivers) {
        try {
            if (await enrichDriver(driverPath)) {
                enrichedCount++;
            }
        } catch (error) {
            log(`Erreur enrichissement ${driverPath}: ${error.message}`, 'ERROR');
            errorCount++;
        }
    }
    
    log(`=== RÉSULTATS ENRICHISSEMENT ===`);
    log(`Drivers enrichis: ${enrichedCount}/${drivers.length}`);
    log(`Erreurs: ${errorCount}`);
    log(`Taux de succès: ${((enrichedCount / drivers.length) * 100).toFixed(1)}%`);
    
    // Mettre à jour les statistiques
    updateStatistics(enrichedCount, drivers.length, errorCount);
}

// Mettre à jour les statistiques
function updateStatistics(enrichedCount, totalCount, errorCount) {
    const stats = {
        timestamp: new Date().toISOString(),
        enriched: enrichedCount,
        total: totalCount,
        errors: errorCount,
        successRate: ((enrichedCount / totalCount) * 100).toFixed(1)
    };
    
    const statsPath = './logs/ai-enrichment-stats.json';
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    log(`Statistiques sauvegardées: ${statsPath}`);
}

// Point d'entrée
if (require.main === module) {
    enrichAllDrivers().catch(error => {
        log(`Erreur fatale: ${error.message}`, 'ERROR');
        process.exit(1);
    });
}

module.exports = {
    enrichDriver,
    enrichAllDrivers,
    callOpenAI,
    getFallbackCapabilities,
    getFallbackClusters,
    getFallbackUI
};