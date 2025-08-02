// core/project-reconstructor.js
// Reconstructeur de projet complet pour Tuya Zigbee
// Applique toutes les contraintes et structures spécifiées

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProjectReconstructor {
    constructor() {
        this.projectName = 'com.tuya.zigbee';
        this.sdkVersion = 3;
        this.structure = {
            drivers: {
                tuya: 'drivers/tuya',
                zigbee: 'drivers/zigbee',
                exclude: ['drivers/fusion*', 'drivers/legacy', 'drivers/deprecated']
            },
            scripts: {
                core: 'scripts/core',
                tools: 'scripts/tools',
                workflows: 'scripts/workflows'
            },
            docs: {
                specs: 'docs/specs',
                dashboard: 'docs/dashboard',
                locales: 'docs/locales'
            },
            data: {
                inference: 'data/tuya-inference-db.json',
                clusters: 'data/cluster-map.json',
                cache: '.cache'
            },
            config: {
                app: 'app.json',
                package: 'package.json',
                main: 'app.js',
                readme: 'README.md'
            }
        };
    }

    // Reconstruire complètement la structure du projet
    async reconstructProject() {
        log('🏗️ === RECONSTRUCTION COMPLÈTE DU PROJET ===');
        
        const results = {
            structure: await this.createProjectStructure(),
            config: await this.createProjectConfig(),
            drivers: await this.reorganizeDrivers(),
            scripts: await this.reorganizeScripts(),
            docs: await this.createDocumentation(),
            data: await this.createDataStructures(),
            validation: await this.validateReconstruction()
        };
        
        return {
            success: Object.values(results).every(r => r.success),
            results
        };
    }

    // Créer la structure de base du projet
    async createProjectStructure() {
        log('📁 Création de la structure de base...');
        
        const directories = [
            'drivers/tuya',
            'drivers/zigbee',
            'scripts/core',
            'scripts/tools',
            'scripts/workflows',
            'docs/specs',
            'docs/dashboard',
            'docs/locales',
            'data',
            '.cache',
            'reports',
            'assets/images'
        ];
        
        let created = 0;
        for (const dir of directories) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                created++;
            }
        }
        
        return { success: true, created };
    }

    // Créer la configuration du projet
    async createProjectConfig() {
        log('⚙️ Création de la configuration du projet...');
        
        // app.json
        const appJson = {
            id: this.projectName,
            name: {
                en: "Tuya Zigbee - Universal Device Support",
                fr: "Tuya Zigbee - Support Universel d'Appareils",
                nl: "Tuya Zigbee - Universele Apparaat Ondersteuning",
                ta: "Tuya Zigbee - Universal Device Support"
            },
            description: {
                en: "Universal Tuya Zigbee Device Support with AI-powered enrichment and automatic error correction",
                fr: "Support universel pour appareils Tuya Zigbee avec enrichissement IA et correction automatique d'erreurs",
                nl: "Universele Tuya Zigbee Apparaat Ondersteuning met AI-aangedreven verrijking en automatische foutcorrectie",
                ta: "Universal Tuya Zigbee Device Support with AI-powered enrichment and automatic error correction"
            },
            version: "1.0.0",
            compatibility: ">=5.0.0",
            sdk: this.sdkVersion,
            category: [
                "lights",
                "energy",
                "automation",
                "utilities"
            ],
            author: {
                name: "Dylan Rajasekaram",
                email: "dylan.rajasekaram+homey@gmail.com"
            },
            main: "app.js",
            images: {
                small: "./assets/images/small.png",
                large: "./assets/images/large.png"
            },
            bugs: {
                url: "https://github.com/dlnraja/com.tuya.zigbee/issues"
            },
            homepage: "https://github.com/dlnraja/com.tuya.zigbee",
            repository: {
                type: "git",
                url: "https://github.com/dlnraja/com.tuya.zigbee.git"
            },
            license: "MIT",
            permissions: [
                "homey:manager:api",
                "homey:app:com.tuya.zigbee"
            ],
            support: "mailto:dylan.rajasekaram+homey@gmail.com",
            api: {
                min: 3,
                max: 3
            },
            platform: "local",
            flow: {
                actions: [],
                conditions: [],
                triggers: []
            }
        };
        
        fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
        
        // package.json
        const packageJson = {
            name: this.projectName,
            version: "1.0.0",
            description: "Universal Tuya Zigbee Device Support",
            main: "app.js",
            scripts: {
                "start": "homey app run",
                "validate": "homey app validate",
                "install": "homey app install",
                "mega-pipeline": "node mega-pipeline.js",
                "validate-local": "node scripts/core/validator.js",
                "fix-drivers": "node scripts/core/driver-manager.js",
                "fix-assets": "node scripts/core/asset-manager.js",
                "fix-project": "node scripts/core/project-manager.js",
                "enrich-drivers": "node scripts/core/smart-enrich-drivers.js",
                "scrape-forums": "node scripts/core/forum-scraper.js",
                "generate-docs": "node scripts/core/documentation-generator.js",
                "reconstruct": "node scripts/core/project-reconstructor.js"
            },
            keywords: [
                "homey",
                "tuya",
                "zigbee",
                "smart-home",
                "automation"
            ],
            author: {
                name: "Dylan Rajasekaram",
                email: "dylan.rajasekaram+homey@gmail.com"
            },
            license: "MIT",
            dependencies: {
                "homey-meshdriver": "^1.3.50"
            },
            devDependencies: {
                "homey": "^2.0.0"
            },
            engines: {
                "node": ">=16.0.0"
            }
        };
        
        fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
        
        // app.js
        const appJs = `'use strict';

const Homey = require('homey');

class TuyaZigbeeApp extends Homey.App {
    async onInit() {
        this.log('Tuya Zigbee App is running...');
        
        // Initialisation de l'app
        await this.initializeApp();
    }

    async initializeApp() {
        try {
            // Configuration de base
            this.log('Initializing Tuya Zigbee App...');
            
            // Vérification des drivers
            const drivers = await this.getDrivers();
            this.log(\`Loaded \${drivers.length} drivers\`);
            
        } catch (error) {
            this.error('Error initializing app:', error);
        }
    }

    async getDrivers() {
        return Object.values(this.homey.drivers.getDrivers());
    }
}

module.exports = TuyaZigbeeApp;
`;
        
        fs.writeFileSync('app.js', appJs);
        
        return { success: true, files: ['app.json', 'package.json', 'app.js'] };
    }

    // Réorganiser les drivers
    async reorganizeDrivers() {
        log('🔧 Réorganisation des drivers...');
        
        const driversDir = 'drivers';
        if (!fs.existsSync(driversDir)) {
            fs.mkdirSync(driversDir, { recursive: true });
        }
        
        // Supprimer les dossiers exclus
        const excludePatterns = ['fusion*', 'legacy', 'deprecated'];
        const items = fs.readdirSync(driversDir);
        
        for (const item of items) {
            const fullPath = path.join(driversDir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                for (const pattern of excludePatterns) {
                    if (item.includes(pattern.replace('*', ''))) {
                        try {
                            fs.rmSync(fullPath, { recursive: true, force: true });
                            log(`🗑️ Supprimé: ${fullPath}`);
                        } catch (error) {
                            log(`❌ Erreur suppression ${fullPath}: ${error.message}`, 'ERROR');
                        }
                        break;
                    }
                }
            }
        }
        
        // Créer les dossiers tuya et zigbee s'ils n'existent pas
        const tuyaDir = path.join(driversDir, 'tuya');
        const zigbeeDir = path.join(driversDir, 'zigbee');
        
        if (!fs.existsSync(tuyaDir)) {
            fs.mkdirSync(tuyaDir, { recursive: true });
        }
        
        if (!fs.existsSync(zigbeeDir)) {
            fs.mkdirSync(zigbeeDir, { recursive: true });
        }
        
        return { success: true };
    }

    // Réorganiser les scripts
    async reorganizeScripts() {
        log('📜 Réorganisation des scripts...');
        
        const scriptsDir = 'scripts';
        if (!fs.existsSync(scriptsDir)) {
            fs.mkdirSync(scriptsDir, { recursive: true });
        }
        
        // Créer les sous-dossiers
        const subDirs = ['core', 'tools', 'workflows'];
        for (const subDir of subDirs) {
            const fullPath = path.join(scriptsDir, subDir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
        }
        
        return { success: true };
    }

    // Créer la documentation
    async createDocumentation() {
        log('📚 Création de la documentation...');
        
        const docsDir = 'docs';
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir, { recursive: true });
        }
        
        // Créer les sous-dossiers
        const subDirs = ['specs', 'dashboard', 'locales'];
        for (const subDir of subDirs) {
            const fullPath = path.join(docsDir, subDir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
        }
        
        // Créer README.md dans specs
        const specsReadme = `# Tuya Zigbee Specifications

## Overview

This directory contains specifications and technical documentation for the Tuya Zigbee project.

## Structure

- \`drivers/\` - Driver specifications and templates
- \`protocols/\` - Zigbee protocol documentation
- \`standards/\` - Homey and Tuya standards
- \`examples/\` - Code examples and templates

## Contributing

Please follow the established patterns when adding new specifications.
`;
        
        fs.writeFileSync(path.join(docsDir, 'specs', 'README.md'), specsReadme);
        
        return { success: true };
    }

    // Créer les structures de données
    async createDataStructures() {
        log('💾 Création des structures de données...');
        
        const dataDir = 'data';
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // tuya-inference-db.json
        const tuyaInferenceDB = {
            modelIdMapping: {
                'TS0601': {
                    capabilities: ['onoff'],
                    clusters: ['genOnOff'],
                    manufacturerName: '_TZ3000_generic',
                    fallback: true
                },
                'TS0001': {
                    capabilities: ['onoff', 'dim'],
                    clusters: ['genOnOff', 'genLevelCtrl'],
                    manufacturerName: '_TZ3000_dimmer',
                    fallback: true
                },
                'TS0002': {
                    capabilities: ['onoff', 'dim'],
                    clusters: ['genOnOff', 'genLevelCtrl'],
                    manufacturerName: '_TZ3000_dimmer',
                    fallback: true
                },
                'TS0003': {
                    capabilities: ['onoff', 'dim'],
                    clusters: ['genOnOff', 'genLevelCtrl'],
                    manufacturerName: '_TZ3000_dimmer',
                    fallback: true
                },
                'TS0004': {
                    capabilities: ['onoff', 'dim', 'light_temperature'],
                    clusters: ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl'],
                    manufacturerName: '_TZ3000_light',
                    fallback: true
                }
            },
            manufacturerMapping: {
                '_TZ3000_light': {
                    capabilities: ['onoff', 'dim', 'light_temperature'],
                    clusters: ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl'],
                    deviceClass: 'light'
                },
                '_TZ3000_switch': {
                    capabilities: ['onoff'],
                    clusters: ['genOnOff'],
                    deviceClass: 'device'
                },
                '_TZ3000_sensor': {
                    capabilities: ['measure_temperature', 'measure_humidity'],
                    clusters: ['msTemperatureMeasurement', 'msRelativeHumidity'],
                    deviceClass: 'sensor'
                },
                '_TZ3000_plug': {
                    capabilities: ['onoff', 'measure_power'],
                    clusters: ['genOnOff', 'haElectricalMeasurement'],
                    deviceClass: 'device'
                }
            }
        };
        
        fs.writeFileSync(path.join(dataDir, 'tuya-inference-db.json'), JSON.stringify(tuyaInferenceDB, null, 2));
        
        // cluster-map.json
        const clusterMap = {
            clusters: {
                'genOnOff': {
                    frequency: 0.95,
                    capabilities: ['onoff'],
                    description: 'Basic on/off control'
                },
                'genLevelCtrl': {
                    frequency: 0.70,
                    capabilities: ['dim'],
                    description: 'Dimming control'
                },
                'msTemperatureMeasurement': {
                    frequency: 0.40,
                    capabilities: ['measure_temperature'],
                    description: 'Temperature measurement'
                },
                'msRelativeHumidity': {
                    frequency: 0.35,
                    capabilities: ['measure_humidity'],
                    description: 'Humidity measurement'
                },
                'haElectricalMeasurement': {
                    frequency: 0.25,
                    capabilities: ['measure_power', 'measure_current', 'measure_voltage'],
                    description: 'Electrical measurements'
                },
                'lightingColorCtrl': {
                    frequency: 0.20,
                    capabilities: ['light_temperature', 'light_mode'],
                    description: 'Color and temperature control'
                }
            }
        };
        
        fs.writeFileSync(path.join(dataDir, 'cluster-map.json'), JSON.stringify(clusterMap, null, 2));
        
        return { success: true, files: ['tuya-inference-db.json', 'cluster-map.json'] };
    }

    // Valider la reconstruction
    async validateReconstruction() {
        log('✅ Validation de la reconstruction...');
        
        const checks = {
            structure: this.checkStructure(),
            config: this.checkConfig(),
            drivers: this.checkDrivers(),
            scripts: this.checkScripts(),
            docs: this.checkDocs(),
            data: this.checkData()
        };
        
        const success = Object.values(checks).every(check => check.success);
        
        return {
            success,
            checks
        };
    }

    // Vérifier la structure
    checkStructure() {
        const requiredDirs = [
            'drivers/tuya',
            'drivers/zigbee',
            'scripts/core',
            'scripts/tools',
            'scripts/workflows',
            'docs/specs',
            'docs/dashboard',
            'docs/locales',
            'data',
            '.cache',
            'reports',
            'assets/images'
        ];
        
        const missing = [];
        for (const dir of requiredDirs) {
            if (!fs.existsSync(dir)) {
                missing.push(dir);
            }
        }
        
        return {
            success: missing.length === 0,
            missing
        };
    }

    // Vérifier la configuration
    checkConfig() {
        const requiredFiles = ['app.json', 'package.json', 'app.js'];
        const missing = [];
        
        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                missing.push(file);
            }
        }
        
        return {
            success: missing.length === 0,
            missing
        };
    }

    // Vérifier les drivers
    checkDrivers() {
        const excludePatterns = ['fusion', 'legacy', 'deprecated'];
        const driversDir = 'drivers';
        
        if (!fs.existsSync(driversDir)) {
            return { success: false, error: 'Dossier drivers manquant' };
        }
        
        const items = fs.readdirSync(driversDir);
        const excluded = [];
        
        for (const item of items) {
            for (const pattern of excludePatterns) {
                if (item.includes(pattern)) {
                    excluded.push(item);
                }
            }
        }
        
        return {
            success: excluded.length === 0,
            excluded
        };
    }

    // Vérifier les scripts
    checkScripts() {
        const scriptsDir = 'scripts';
        const requiredSubDirs = ['core', 'tools', 'workflows'];
        
        if (!fs.existsSync(scriptsDir)) {
            return { success: false, error: 'Dossier scripts manquant' };
        }
        
        const missing = [];
        for (const subDir of requiredSubDirs) {
            const fullPath = path.join(scriptsDir, subDir);
            if (!fs.existsSync(fullPath)) {
                missing.push(subDir);
            }
        }
        
        return {
            success: missing.length === 0,
            missing
        };
    }

    // Vérifier la documentation
    checkDocs() {
        const docsDir = 'docs';
        const requiredSubDirs = ['specs', 'dashboard', 'locales'];
        
        if (!fs.existsSync(docsDir)) {
            return { success: false, error: 'Dossier docs manquant' };
        }
        
        const missing = [];
        for (const subDir of requiredSubDirs) {
            const fullPath = path.join(docsDir, subDir);
            if (!fs.existsSync(fullPath)) {
                missing.push(subDir);
            }
        }
        
        return {
            success: missing.length === 0,
            missing
        };
    }

    // Vérifier les données
    checkData() {
        const dataDir = 'data';
        const requiredFiles = ['tuya-inference-db.json', 'cluster-map.json'];
        
        if (!fs.existsSync(dataDir)) {
            return { success: false, error: 'Dossier data manquant' };
        }
        
        const missing = [];
        for (const file of requiredFiles) {
            const fullPath = path.join(dataDir, file);
            if (!fs.existsSync(fullPath)) {
                missing.push(file);
            }
        }
        
        return {
            success: missing.length === 0,
            missing
        };
    }
}

// Fonction utilitaire pour les logs
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const emoji = {
        'INFO': 'ℹ️',
        'SUCCESS': '✅',
        'WARN': '⚠️',
        'ERROR': '❌'
    };
    console.log(`[${timestamp}] [${level}] ${emoji[level] || ''} ${message}`);
}

// Export pour utilisation dans d'autres scripts
module.exports = { ProjectReconstructor, log };

// Exécution directe si appelé directement
if (require.main === module) {
    const reconstructor = new ProjectReconstructor();
    reconstructor.reconstructProject().then(result => {
        if (result.success) {
            log('🎉 Reconstruction terminée avec succès!', 'SUCCESS');
            process.exit(0);
        } else {
            log('❌ Reconstruction échouée', 'ERROR');
            process.exit(1);
        }
    }).catch(error => {
        log(`❌ Erreur fatale: ${error.message}`, 'ERROR');
        process.exit(1);
    });
} 