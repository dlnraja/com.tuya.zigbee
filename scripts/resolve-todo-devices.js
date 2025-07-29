#!/usr/bin/env node
/**
 * Script de traitement des TODO devices
 * Version: 1.0.12-20250729-1405
 * Objectif: Traiter les TODO devices de manière unitaire et intelligente
 * Spécificités: Autonome, tolérant aux erreurs, mode dégradé
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1405',
    driversPath: './drivers',
    todoPath: './drivers/todo-devices',
    backupPath: './backups/todo-resolution',
    logFile: './logs/resolve-todo-devices.log',
    maxConcurrent: 5, // Traiter 5 devices à la fois
    timeout: 60000 // 60 secondes timeout par device
};

// Logging
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

// Créer les dossiers nécessaires
function ensureDirectories() {
    const dirs = [
        CONFIG.driversPath,
        CONFIG.todoPath,
        CONFIG.backupPath,
        path.dirname(CONFIG.logFile)
    ];
    
    for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            log(`Dossier créé: ${dir}`);
        }
    }
}

// Lister tous les TODO devices
function listTodoDevices() {
    log('=== LISTING DES TODO DEVICES ===');
    
    const todoDevices = [];
    
    try {
        if (!fs.existsSync(CONFIG.todoPath)) {
            log('Aucun dossier todo-devices trouvé', 'WARN');
            return todoDevices;
        }
        
        const items = fs.readdirSync(CONFIG.todoPath, { withFileTypes: true });
        
        for (const item of items) {
            if (item.isDirectory()) {
                const devicePath = path.join(CONFIG.todoPath, item.name);
                const composePath = path.join(devicePath, 'driver.compose.json');
                const devicePath_js = path.join(devicePath, 'device.js');
                
                // Vérifier si c'est un device valide
                if (fs.existsSync(composePath) || fs.existsSync(devicePath_js)) {
                    todoDevices.push({
                        name: item.name,
                        path: devicePath,
                        hasCompose: fs.existsSync(composePath),
                        hasDevice: fs.existsSync(devicePath_js),
                        priority: determinePriority(item.name)
                    });
                }
            }
        }
        
        log(`TODO devices trouvés: ${todoDevices.length}`);
        
    } catch (error) {
        log(`Erreur listing TODO devices: ${error.message}`, 'ERROR');
    }
    
    return todoDevices;
}

// Déterminer la priorité d'un device
function determinePriority(deviceName) {
    const name = deviceName.toLowerCase();
    
    // Priorité haute pour les devices critiques
    if (name.includes('gateway') || name.includes('bridge') || name.includes('hub')) {
        return 'high';
    }
    
    // Priorité moyenne pour les controllers
    if (name.includes('light') || name.includes('switch') || name.includes('plug')) {
        return 'medium';
    }
    
    // Priorité normale pour les autres
    return 'normal';
}

// Analyser un TODO device
function analyzeTodoDevice(device) {
    log(`Analyse du device: ${device.name}`);
    
    const analysis = {
        name: device.name,
        status: 'pending',
        protocol: 'unknown',
        category: 'unknown',
        capabilities: [],
        clusters: [],
        issues: [],
        suggestions: []
    };
    
    try {
        // Analyser le nom du device
        const name = device.name.toLowerCase();
        
        // Déterminer le protocole
        if (name.includes('tuya')) {
            analysis.protocol = 'tuya';
        } else if (name.includes('zigbee')) {
            analysis.protocol = 'zigbee';
        } else {
            // Deviner basé sur le nom
            analysis.protocol = name.includes('smart') ? 'tuya' : 'zigbee';
        }
        
        // Déterminer la catégorie
        if (name.includes('light') || name.includes('bulb') || name.includes('lamp')) {
            analysis.category = 'controllers';
            analysis.capabilities.push('onoff', 'dim');
        } else if (name.includes('switch') || name.includes('plug') || name.includes('outlet')) {
            analysis.category = 'controllers';
            analysis.capabilities.push('onoff', 'measure_power');
        } else if (name.includes('sensor') || name.includes('detector')) {
            analysis.category = 'sensors';
            analysis.capabilities.push('measure_temperature', 'measure_humidity');
        } else if (name.includes('motion') || name.includes('presence')) {
            analysis.category = 'sensors';
            analysis.capabilities.push('alarm_motion');
        } else if (name.includes('contact') || name.includes('door') || name.includes('window')) {
            analysis.category = 'security';
            analysis.capabilities.push('alarm_contact');
        } else if (name.includes('lock') || name.includes('alarm')) {
            analysis.category = 'security';
            analysis.capabilities.push('alarm_contact', 'lock_state');
        } else if (name.includes('thermostat') || name.includes('hvac') || name.includes('climate')) {
            analysis.category = 'climate';
            analysis.capabilities.push('measure_temperature', 'target_temperature');
        } else if (name.includes('curtain') || name.includes('blind') || name.includes('shade')) {
            analysis.category = 'automation';
            analysis.capabilities.push('windowcoverings_state', 'windowcoverings_set');
        } else if (name.includes('fan') || name.includes('ventilation')) {
            analysis.category = 'automation';
            analysis.capabilities.push('onoff', 'dim');
        } else {
            analysis.category = 'generic';
            analysis.capabilities.push('onoff');
        }
        
        // Analyser les fichiers existants
        if (device.hasCompose) {
            try {
                const composePath = path.join(device.path, 'driver.compose.json');
                const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                
                if (compose.capabilities) {
                    analysis.capabilities = [...new Set([...analysis.capabilities, ...compose.capabilities])];
                }
                
                if (compose.clusters) {
                    analysis.clusters = compose.clusters;
                }
                
            } catch (error) {
                analysis.issues.push(`Erreur lecture compose.json: ${error.message}`);
            }
        }
        
        // Suggestions d'amélioration
        if (analysis.capabilities.length === 0) {
            analysis.suggestions.push('Ajouter des capabilities de base (onoff)');
        }
        
        if (!analysis.clusters || analysis.clusters.length === 0) {
            analysis.suggestions.push('Définir les clusters Zigbee appropriés');
        }
        
        analysis.status = 'analyzed';
        
    } catch (error) {
        analysis.issues.push(`Erreur analyse: ${error.message}`);
        analysis.status = 'error';
    }
    
    return analysis;
}

// Résoudre un TODO device
function resolveTodoDevice(analysis) {
    log(`Résolution du device: ${analysis.name}`);
    
    const results = {
        name: analysis.name,
        status: 'pending',
        created: false,
        errors: []
    };
    
    try {
        // Créer le dossier de destination
        const targetDir = path.join(CONFIG.driversPath, analysis.protocol, analysis.category, analysis.name);
        
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        
        // Créer le driver.compose.json
        const compose = createComposeJson(analysis);
        const composePath = path.join(targetDir, 'driver.compose.json');
        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
        
        // Créer le device.js
        const device = createDeviceJs(analysis);
        const devicePath = path.join(targetDir, 'device.js');
        fs.writeFileSync(devicePath, device);
        
        // Créer les images
        const imagesDir = path.join(targetDir, 'assets', 'images');
        fs.mkdirSync(imagesDir, { recursive: true });
        
        const iconSvg = createIconSvg(analysis);
        const iconPath = path.join(imagesDir, 'icon.svg');
        fs.writeFileSync(iconPath, iconSvg);
        
        // Copier les fichiers existants du TODO device
        const sourceDir = path.join(CONFIG.todoPath, analysis.name);
        if (fs.existsSync(sourceDir)) {
            const files = fs.readdirSync(sourceDir);
            for (const file of files) {
                const sourceFile = path.join(sourceDir, file);
                const targetFile = path.join(targetDir, file);
                
                if (fs.statSync(sourceFile).isFile() && !fs.existsSync(targetFile)) {
                    fs.copyFileSync(sourceFile, targetFile);
                }
            }
        }
        
        results.status = 'resolved';
        results.created = true;
        log(`Device résolu: ${analysis.name} -> ${analysis.protocol}/${analysis.category}`);
        
    } catch (error) {
        results.errors.push(error.message);
        results.status = 'error';
        log(`Erreur résolution ${analysis.name}: ${error.message}`, 'ERROR');
    }
    
    return results;
}

// Créer le driver.compose.json
function createComposeJson(analysis) {
    const compose = {
        id: analysis.name,
        title: {
            en: `${analysis.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
            fr: `${analysis.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
            nl: `${analysis.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
            ta: `${analysis.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`
        },
        description: {
            en: `Auto-generated device from TODO list`,
            fr: `Appareil auto-généré depuis la liste TODO`,
            nl: `Auto-gegenereerd apparaat van TODO lijst`,
            ta: `TODO பட்டியலில் இருந்து தானாக உருவாக்கப்பட்ட சாதனம்`
        },
        capabilities: analysis.capabilities,
        capabilitiesOptions: {},
        images: {
            icon: 'assets/images/icon.svg'
        },
        category: analysis.category,
        protocol: analysis.protocol,
        source: 'todo-resolution',
        resolutionDate: new Date().toISOString(),
        originalAnalysis: analysis
    };
    
    // Ajouter les options de capabilities
    for (const capability of analysis.capabilities) {
        compose.capabilitiesOptions[capability] = {
            title: {
                en: capability.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                fr: capability.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                nl: capability.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                ta: capability.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            }
        };
    }
    
    // Ajouter les clusters si disponibles
    if (analysis.clusters && analysis.clusters.length > 0) {
        compose.clusters = analysis.clusters;
    }
    
    return compose;
}

// Créer le device.js
function createDeviceJs(analysis) {
    const className = analysis.name
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
    
    const baseClass = analysis.protocol === 'tuya' ? 'TuyaDevice' : 'ZigbeeDevice';
    const requirePath = analysis.protocol === 'tuya' ? 'homey-tuya' : 'homey-meshdriver';
    
    return `const { ${baseClass} } = require('${requirePath}');

class ${className} extends ${baseClass} {
    async onInit() {
        await super.onInit();
        
        this.log('${className} initialized');
        
        // Register capabilities
${analysis.capabilities.map(cap => `        this.registerCapabilityListener('${cap}', async (value) => {
            await this.setCapabilityValue('${cap}', value);
        });`).join('\n')}
    }
    
    async onUninit() {
        this.log('${className} uninitialized');
    }
}

module.exports = ${className};`;
}

// Créer l'icône SVG
function createIconSvg(analysis) {
    const colors = {
        'controllers': '#4CAF50',
        'sensors': '#2196F3',
        'security': '#F44336',
        'climate': '#FF9800',
        'automation': '#9C27B0',
        'generic': '#607D8B'
    };
    
    const color = colors[analysis.category] || colors.generic;
    const text = analysis.name.substring(0, 8).toUpperCase();
    
    return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color}dd;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="10" fill="url(#grad)" />
  <text x="50" y="55" font-family="Arial" font-size="12" fill="white" text-anchor="middle">${text}</text>
</svg>`;
}

// Traiter tous les TODO devices
function processAllTodoDevices() {
    log('=== TRAITEMENT DE TOUS LES TODO DEVICES ===');
    
    const results = {
        total: 0,
        analyzed: 0,
        resolved: 0,
        errors: 0,
        devices: []
    };
    
    try {
        // Lister tous les TODO devices
        const todoDevices = listTodoDevices();
        results.total = todoDevices.length;
        
        log(`Traitement de ${todoDevices.length} TODO devices`);
        
        // Traiter chaque device
        for (const device of todoDevices) {
            try {
                // Analyser le device
                const analysis = analyzeTodoDevice(device);
                results.analyzed++;
                
                // Résoudre le device
                const resolution = resolveTodoDevice(analysis);
                results.devices.push({
                    name: device.name,
                    analysis: analysis,
                    resolution: resolution
                });
                
                if (resolution.status === 'resolved') {
                    results.resolved++;
                } else {
                    results.errors++;
                }
                
            } catch (error) {
                log(`Erreur traitement ${device.name}: ${error.message}`, 'ERROR');
                results.errors++;
            }
        }
        
    } catch (error) {
        log(`Erreur traitement global: ${error.message}`, 'ERROR');
        results.errors++;
    }
    
    return results;
}

// Créer un rapport de résolution
function createResolutionReport(processResults) {
    log('=== CRÉATION DU RAPPORT DE RÉSOLUTION ===');
    
    const report = {
        timestamp: new Date().toISOString(),
        version: CONFIG.version,
        processResults: processResults,
        summary: {
            totalDevices: processResults.total,
            analyzedDevices: processResults.analyzed,
            resolvedDevices: processResults.resolved,
            errorDevices: processResults.errors,
            successRate: processResults.total > 0 ? (processResults.resolved / processResults.total * 100).toFixed(2) : 0
        }
    };
    
    const reportPath = './logs/todo-resolution-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`Rapport de résolution créé: ${reportPath}`);
    
    // Afficher le résumé
    log('=== RÉSUMÉ RÉSOLUTION TODO ===');
    log(`Total devices: ${processResults.total}`);
    log(`Devices analysés: ${processResults.analyzed}`);
    log(`Devices résolus: ${processResults.resolved}`);
    log(`Erreurs: ${processResults.errors}`);
    log(`Taux de succès: ${report.summary.successRate}%`);
    
    return report;
}

// Point d'entrée principal
async function resolveTodoDevicesScript() {
    log('🚀 === RÉSOLUTION DES TODO DEVICES ===');
    
    ensureDirectories();
    
    // Étape 1: Traitement des TODO devices
    log('🔧 ÉTAPE 1: Traitement des TODO devices');
    const processResults = processAllTodoDevices();
    
    // Étape 2: Rapport
    log('📊 ÉTAPE 2: Création du rapport');
    const report = createResolutionReport(processResults);
    
    // Rapport final
    log('=== RAPPORT FINAL RÉSOLUTION ===');
    log(`Total devices: ${processResults.total}`);
    log(`Devices résolus: ${processResults.resolved}`);
    log(`Taux de succès: ${report.summary.successRate}%`);
    
    return report;
}

// Point d'entrée
if (require.main === module) {
    resolveTodoDevicesScript().catch(error => {
        log(`Erreur fatale: ${error.message}`, 'ERROR');
        process.exit(1);
    });
}

module.exports = {
    resolveTodoDevicesScript,
    listTodoDevices,
    analyzeTodoDevice,
    resolveTodoDevice,
    processAllTodoDevices,
    createResolutionReport
};