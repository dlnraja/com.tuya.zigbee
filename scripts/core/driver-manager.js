// core/driver-manager.js
// Gestionnaire centralisé des drivers Tuya Zigbee
// Remplace tous les scripts de gestion de drivers dispersés

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DriverManager {
    constructor() {
        this.driversDir = 'drivers';
        this.templates = {
            tuya: {
                class: 'device',
                capabilities: ['onoff'],
                zigbee: {
                    manufacturerName: '_TZ3000_generic',
                    modelId: 'generic',
                    endpoints: {
                        '1': {
                            clusters: {
                                input: ['genBasic', 'genIdentify', 'genOnOff'],
                                output: ['genIdentify']
                            }
                        }
                    }
                }
            },
            zigbee: {
                class: 'light',
                capabilities: ['onoff', 'dim'],
                zigbee: {
                    manufacturerName: '_TZ3000_light',
                    modelId: 'light',
                    endpoints: {
                        '1': {
                            clusters: {
                                input: ['genBasic', 'genIdentify', 'genOnOff', 'genLevelCtrl'],
                                output: ['genIdentify']
                            }
                        }
                    }
                }
            }
        };
    }

    // Scanner tous les drivers
    scanDrivers() {
        const drivers = [];
        
        if (!fs.existsSync(this.driversDir)) {
            return drivers;
        }

        const scanDir = (dir, category = '') => {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    const composePath = path.join(fullPath, 'driver.compose.json');
                    
                    if (fs.existsSync(composePath)) {
                        try {
                            const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                            drivers.push({
                                path: fullPath,
                                category: category || path.basename(path.dirname(fullPath)),
                                compose: compose,
                                valid: this.validateDriver(composePath)
                            });
                        } catch (error) {
                            drivers.push({
                                path: fullPath,
                                category: category || path.basename(path.dirname(fullPath)),
                                compose: null,
                                valid: false,
                                error: error.message
                            });
                        }
                    } else {
                        // Récursion pour les sous-dossiers
                        scanDir(fullPath, item);
                    }
                }
            }
        };

        scanDir(this.driversDir);
        return drivers;
    }

    // Valider un driver
    validateDriver(composePath) {
        try {
            const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            
            // Vérifications de base
            const required = ['id', 'name', 'class', 'capabilities'];
            const missing = required.filter(field => !compose[field]);
            
            if (missing.length > 0) {
                return false;
            }

            // Vérification des capabilities
            if (!Array.isArray(compose.capabilities) || compose.capabilities.length === 0) {
                return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    // Créer un driver
    createDriver(id, name, category = 'tuya', customCapabilities = []) {
        const template = this.templates[category] || this.templates.tuya;
        const capabilities = [...template.capabilities, ...customCapabilities];
        
        const driverPath = path.join(this.driversDir, category, id);
        const composePath = path.join(driverPath, 'driver.compose.json');
        const devicePath = path.join(driverPath, 'device.js');

        // Créer le dossier
        if (!fs.existsSync(driverPath)) {
            fs.mkdirSync(driverPath, { recursive: true });
        }

        // Créer driver.compose.json
        const compose = {
            id: id,
            name: {
                en: name,
                fr: name,
                nl: name,
                ta: name
            },
            class: template.class,
            capabilities: capabilities,
            zigbee: template.zigbee,
            images: {
                small: '/assets/icon-small.png',
                large: '/assets/icon-large.png'
            }
        };

        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));

        // Créer device.js
        const deviceCode = `'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class ${id.replace(/[-_]/g, '')}Device extends ZigbeeDevice {
    async onMeshInit() {
        await super.onMeshInit();
        
        // Configuration des capabilities
        ${capabilities.map(cap => `this.registerCapability('${cap}', 'genOnOff');`).join('\n        ')}
    }
}

module.exports = ${id.replace(/[-_]/g, '')}Device;
`;

        fs.writeFileSync(devicePath, deviceCode);

        return { success: true, path: driverPath };
    }

    // Corriger un driver
    fixDriver(driverPath) {
        const composePath = path.join(driverPath, 'driver.compose.json');
        
        if (!fs.existsSync(composePath)) {
            return { success: false, error: 'driver.compose.json manquant' };
        }

        try {
            let compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            let fixed = false;

            // Corriger les champs manquants
            if (!compose.id) {
                compose.id = path.basename(driverPath);
                fixed = true;
            }

            if (!compose.name) {
                compose.name = {
                    en: compose.title || path.basename(driverPath),
                    fr: compose.title || path.basename(driverPath),
                    nl: compose.title || path.basename(driverPath),
                    ta: compose.title || path.basename(driverPath)
                };
                fixed = true;
            }

            if (!compose.class || compose.class === 'other') {
                compose.class = 'device';
                fixed = true;
            }

            if (!compose.capabilities || !Array.isArray(compose.capabilities)) {
                compose.capabilities = ['onoff'];
                fixed = true;
            }

            if (!compose.zigbee) {
                compose.zigbee = this.templates.tuya.zigbee;
                fixed = true;
            }

            // Supprimer les champs non standard
            delete compose.title;
            delete compose.description;

            if (fixed) {
                fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
            }

            return { success: true, fixed };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Fusionner des drivers dupliqués
    mergeDuplicateDrivers() {
        const drivers = this.scanDrivers();
        const duplicates = new Map();
        const merged = [];

        // Identifier les doublons
        for (const driver of drivers) {
            if (!driver.compose) continue;
            
            const key = `${driver.compose.zigbee?.manufacturerName || 'unknown'}_${driver.compose.zigbee?.modelId || 'unknown'}`;
            
            if (duplicates.has(key)) {
                duplicates.get(key).push(driver);
            } else {
                duplicates.set(key, [driver]);
            }
        }

        // Fusionner les doublons
        for (const [key, driverList] of duplicates) {
            if (driverList.length > 1) {
                const primary = driverList[0];
                const capabilities = new Set();
                
                // Fusionner les capabilities
                for (const driver of driverList) {
                    if (driver.compose?.capabilities) {
                        driver.compose.capabilities.forEach(cap => capabilities.add(cap));
                    }
                }

                // Mettre à jour le driver principal
                if (primary.compose) {
                    primary.compose.capabilities = Array.from(capabilities);
                    this.fixDriver(primary.path);
                    merged.push(primary);
                }

                // Supprimer les doublons
                for (let i = 1; i < driverList.length; i++) {
                    try {
                        fs.rmSync(driverList[i].path, { recursive: true, force: true });
                    } catch (error) {
                        console.warn(`Impossible de supprimer ${driverList[i].path}: ${error.message}`);
                    }
                }
            } else {
                merged.push(driverList[0]);
            }
        }

        return merged;
    }

    // Nettoyer la structure des drivers
    cleanStructure() {
        const allowedFolders = ['tuya', 'zigbee'];
        const driversDir = this.driversDir;

        if (!fs.existsSync(driversDir)) {
            return { success: true, message: 'Dossier drivers inexistant' };
        }

        const items = fs.readdirSync(driversDir);
        let removed = 0;

        for (const item of items) {
            const fullPath = path.join(driversDir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                if (!allowedFolders.includes(item)) {
                    try {
                        fs.rmSync(fullPath, { recursive: true, force: true });
                        removed++;
                    } catch (error) {
                        console.warn(`Impossible de supprimer ${fullPath}: ${error.message}`);
                    }
                }
            }
        }

        return { success: true, removed };
    }

    // Générer un rapport
    generateReport() {
        const drivers = this.scanDrivers();
        const stats = {
            total: drivers.length,
            valid: drivers.filter(d => d.valid).length,
            invalid: drivers.filter(d => !d.valid).length,
            categories: {},
            errors: drivers.filter(d => d.error).map(d => d.error)
        };

        // Compter par catégorie
        for (const driver of drivers) {
            const category = driver.category || 'unknown';
            stats.categories[category] = (stats.categories[category] || 0) + 1;
        }

        return stats;
    }
}

// Fonction utilitaire pour les logs
function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

// Export pour utilisation dans d'autres scripts
module.exports = { DriverManager, log };

// Exécution directe si appelé directement
if (require.main === module) {
    const manager = new DriverManager();
    const report = manager.generateReport();
    log(`Rapport drivers: ${JSON.stringify(report, null, 2)}`);
} 