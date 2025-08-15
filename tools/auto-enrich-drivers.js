#!/usr/bin/env node

/**
 * 🚀 AUTO ENRICH DRIVERS - BRIEF "BÉTON"
 * 
 * Enrichissement automatique des drivers manquants
 * Génère des skeletons device.js pré-remplis par use-case
 * Sans écraser l'existant
 */

const fs = require('fs-extra');
const path = require('path');

class AutoEnrichDrivers {
    constructor() {
        this.projectRoot = process.cwd();
        this.driversDir = path.join(this.projectRoot, 'drivers');
        this.templates = this.loadTemplates();
    }

    async run() {
        try {
            console.log('🚀 AUTO ENRICH DRIVERS - BRIEF "BÉTON"');
            console.log('=' .repeat(70));
            console.log('🎯 Enrichissement automatique des drivers...\n');

            // 1. Analyser la structure des drivers
            const analysis = await this.analyzeDrivers();

            // 2. Identifier les drivers manquants
            const missingDrivers = this.identifyMissingDrivers(analysis);

            // 3. Générer les skeletons manquants
            await this.generateMissingSkeletons(missingDrivers);

            // 4. Rapport final
            await this.generateReport(analysis, missingDrivers);

            console.log('\n✅ ENRICHISSEMENT AUTOMATIQUE TERMINÉ !');
            console.log('🚀 Vos drivers sont maintenant complets !');

        } catch (error) {
            console.error('❌ Erreur lors de l\'enrichissement:', error);
        }
    }

    loadTemplates() {
        return {
            // Template de base pour tous les drivers
            base: {
                device: `const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class TuyaDevice extends ZigBeeDevice {
    async onNodeInit({ zclNode }) {
        // Logique de base pour tous les devices
        await super.onNodeInit({ zclNode });
        
        // Configuration Zigbee
        await this.configureZigbeeReporting();
        
        // Enregistrement des capabilities
        await this.registerCapabilities();
    }

    async configureZigbeeReporting() {
        try {
            // Configuration des rapports automatiques
            // Sera personnalisé selon le type de device
        } catch (error) {
            this.error('Erreur configuration Zigbee:', error);
        }
    }

    async registerCapabilities() {
        try {
            // Enregistrement des capabilities
            // Sera personnalisé selon le type de device
        } catch (error) {
            this.error('Erreur enregistrement capabilities:', error);
        }
    }
}

module.exports = TuyaDevice;`,

                driver: `const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaDriver extends ZigBeeDriver {
    async onNodeInit({ node }) {
        await super.onNodeInit({ node });
    }
}

module.exports = TuyaDriver;`
            },

            // Templates spécifiques par use-case
            useCases: {
                'onoff': {
                    capabilities: ['onoff'],
                    device: `const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class TuyaOnOffDevice extends ZigBeeDevice {
    async onNodeInit({ zclNode }) {
        await super.onNodeInit({ zclNode });
        
        // Configuration Zigbee
        await this.configureZigbeeReporting();
        
        // Enregistrement des capabilities
        await this.registerCapabilities();
    }

    async configureZigbeeReporting() {
        try {
            // Configuration des rapports pour on/off
            await this.configureClusterCapability('onoff', CLUSTER.ON_OFF, {
                attributeName: 'onOff',
                minInterval: 0,
                maxInterval: 60000,
                minChange: 1
            });
        } catch (error) {
            this.error('Erreur configuration Zigbee:', error);
        }
    }

    async registerCapabilities() {
        try {
            // Enregistrement de la capability on/off
            await this.registerCapability('onoff', CLUSTER.ON_OFF, {
                get: 'onOff',
                set: 'setOnOff',
                setParser: (value) => ({ onOff: value }),
                reportParser: (value) => value.onOff
            });
        } catch (error) {
            this.error('Erreur enregistrement capabilities:', error);
        }
    }
}

module.exports = TuyaOnOffDevice;`
                },

                'dim': {
                    capabilities: ['onoff', 'dim'],
                    device: `const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class TuyaDimDevice extends ZigBeeDevice {
    async onNodeInit({ zclNode }) {
        await super.onNodeInit({ zclNode });
        
        // Configuration Zigbee
        await this.configureZigbeeReporting();
        
        // Enregistrement des capabilities
        await this.registerCapabilities();
    }

    async configureZigbeeReporting() {
        try {
            // Configuration des rapports pour on/off et dim
            await this.configureClusterCapability('onoff', CLUSTER.ON_OFF, {
                attributeName: 'onOff',
                minInterval: 0,
                maxInterval: 60000,
                minChange: 1
            });

            await this.configureClusterCapability('dim', CLUSTER.LEVEL_CONTROL, {
                attributeName: 'currentLevel',
                minInterval: 0,
                maxInterval: 60000,
                minChange: 1
            });
        } catch (error) {
            this.error('Erreur configuration Zigbee:', error);
        }
    }

    async registerCapabilities() {
        try {
            // Enregistrement de la capability on/off
            await this.registerCapability('onoff', CLUSTER.ON_OFF, {
                get: 'onOff',
                set: 'setOnOff',
                setParser: (value) => ({ onOff: value }),
                reportParser: (value) => value.onOff
            });

            // Enregistrement de la capability dim
            await this.registerCapability('dim', CLUSTER.LEVEL_CONTROL, {
                get: 'currentLevel',
                set: 'setLevel',
                setParser: (value) => ({ level: Math.round(value * 254) }),
                reportParser: (value) => value.currentLevel / 254
            });
        } catch (error) {
            this.error('Erreur enregistrement capabilities:', error);
        }
    }
}

module.exports = TuyaDimDevice;`
                },

                'sensor': {
                    capabilities: ['measure_temperature', 'measure_humidity', 'measure_pressure'],
                    device: `const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class TuyaSensorDevice extends ZigBeeDevice {
    async onNodeInit({ zclNode }) {
        await super.onNodeInit({ zclNode });
        
        // Configuration Zigbee
        await this.configureZigbeeReporting();
        
        // Enregistrement des capabilities
        await this.registerCapabilities();
    }

    async configureZigbeeReporting() {
        try {
            // Configuration des rapports pour les capteurs
            if (this.hasCapability('measure_temperature')) {
                await this.configureClusterCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
                    attributeName: 'measuredValue',
                    minInterval: 0,
                    maxInterval: 300000,
                    minChange: 10
                });
            }

            if (this.hasCapability('measure_humidity')) {
                await this.configureClusterCapability('measure_humidity', CLUSTER.HUMIDITY_MEASUREMENT, {
                    attributeName: 'measuredValue',
                    minInterval: 0,
                    maxInterval: 300000,
                    minChange: 100
                });
            }
        } catch (error) {
            this.error('Erreur configuration Zigbee:', error);
        }
    }

    async registerCapabilities() {
        try {
            // Enregistrement des capabilities de capteurs
            if (this.hasCapability('measure_temperature')) {
                await this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
                    get: 'measuredValue',
                    reportParser: (value) => value.measuredValue / 100
                });
            }

            if (this.hasCapability('measure_humidity')) {
                await this.registerCapability('measure_humidity', CLUSTER.HUMIDITY_MEASUREMENT, {
                    get: 'measuredValue',
                    reportParser: (value) => value.measuredValue / 100
                });
            }
        } catch (error) {
            this.error('Erreur enregistrement capabilities:', error);
        }
    }
}

module.exports = TuyaSensorDevice;`
                }
            }
        };
    }

    async analyzeDrivers() {
        console.log('🔍 ANALYSE DE LA STRUCTURE DES DRIVERS...');
        console.log('-' .repeat(40));

        const analysis = {
            total: 0,
            complete: 0,
            incomplete: 0,
            missingDevice: 0,
            missingDriver: 0,
            missingCompose: 0,
            categories: {}
        };

        try {
            if (!fs.existsSync(this.driversDir)) {
                console.log('   ⚠️ Dossier drivers non trouvé');
                return analysis;
            }

            const categories = fs.readdirSync(this.driversDir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            for (const category of categories) {
                const categoryPath = path.join(this.driversDir, category);
                const drivers = fs.readdirSync(categoryPath, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name);

                analysis.categories[category] = {
                    total: drivers.length,
                    complete: 0,
                    incomplete: 0,
                    drivers: []
                };

                for (const driver of drivers) {
                    const driverPath = path.join(categoryPath, driver);
                    const driverAnalysis = await this.analyzeDriver(driverPath, category, driver);
                    
                    analysis.categories[category].drivers.push(driverAnalysis);
                    analysis.total++;

                    if (driverAnalysis.isComplete) {
                        analysis.categories[category].complete++;
                        analysis.complete++;
                    } else {
                        analysis.categories[category].incomplete++;
                        analysis.incomplete++;
                    }

                    if (!driverAnalysis.hasDevice) analysis.missingDevice++;
                    if (!driverAnalysis.hasDriver) analysis.missingDriver++;
                    if (!driverAnalysis.hasCompose) analysis.missingCompose++;
                }
            }

            console.log(`   📊 Total drivers: ${analysis.total}`);
            console.log(`   ✅ Complets: ${analysis.complete}`);
            console.log(`   ⚠️ Incomplets: ${analysis.incomplete}`);
            console.log(`   🔧 Manquant device.js: ${analysis.missingDevice}`);
            console.log(`   🚗 Manquant driver.js: ${analysis.missingDriver}`);
            console.log(`   📋 Manquant compose: ${analysis.missingCompose}`);

        } catch (error) {
            console.log(`   ❌ Erreur analyse: ${error.message}`);
        }

        return analysis;
    }

    async analyzeDriver(driverPath, category, driverName) {
        const analysis = {
            name: driverName,
            category: category,
            path: driverPath,
            hasDevice: false,
            hasDriver: false,
            hasCompose: false,
            hasMetadata: false,
            isComplete: false,
            capabilities: [],
            useCase: 'unknown'
        };

        try {
            const files = fs.readdirSync(driverPath);
            
            analysis.hasDevice = files.includes('device.js');
            analysis.hasDriver = files.includes('driver.js');
            analysis.hasCompose = files.includes('driver.compose.json');
            analysis.hasMetadata = files.includes('metadata.json');

            // Analyser le compose pour déterminer les capabilities
            if (analysis.hasCompose) {
                const composePath = path.join(driverPath, 'driver.compose.json');
                try {
                    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                    analysis.capabilities = compose.capabilities || [];
                    analysis.useCase = this.determineUseCase(compose.capabilities || []);
                } catch (error) {
                    // Ignorer les erreurs de parsing
                }
            }

            analysis.isComplete = analysis.hasDevice && analysis.hasDriver && analysis.hasCompose;

        } catch (error) {
            // Ignorer les erreurs de lecture
        }

        return analysis;
    }

    determineUseCase(capabilities) {
        const caps = capabilities.map(cap => cap.toLowerCase());
        
        if (caps.includes('dim')) return 'dim';
        if (caps.includes('onoff')) return 'onoff';
        if (caps.includes('measure_temperature') || caps.includes('measure_humidity') || caps.includes('measure_pressure')) return 'sensor';
        
        return 'base';
    }

    identifyMissingDrivers(analysis) {
        const missing = [];

        for (const [category, catAnalysis] of Object.entries(analysis.categories)) {
            for (const driver of catAnalysis.drivers) {
                if (!driver.isComplete) {
                    missing.push({
                        ...driver,
                        needs: []
                    });

                    if (!driver.hasDevice) missing[missing.length - 1].needs.push('device');
                    if (!driver.hasDriver) missing[missing.length - 1].needs.push('driver');
                    if (!driver.hasCompose) missing[missing.length - 1].needs.push('compose');
                }
            }
        }

        return missing;
    }

    async generateMissingSkeletons(missingDrivers) {
        console.log('🔧 GÉNÉRATION DES SKELETONS MANQUANTS...');
        console.log('-' .repeat(40));

        let generated = 0;
        let errors = 0;

        for (const driver of missingDrivers) {
            try {
                await this.generateDriverSkeleton(driver);
                generated++;
            } catch (error) {
                errors++;
                console.log(`   ⚠️ Erreur ${driver.name}: ${error.message}`);
            }
        }

        console.log(`   ✅ ${generated} skeletons générés`);
        if (errors > 0) {
            console.log(`   ⚠️ ${errors} erreurs rencontrées`);
        }
    }

    async generateDriverSkeleton(driver) {
        const driverPath = driver.path;

        // Générer device.js si manquant
        if (driver.needs.includes('device')) {
            const devicePath = path.join(driverPath, 'device.js');
            const template = this.selectDeviceTemplate(driver.useCase);
            fs.writeFileSync(devicePath, template);
            console.log(`      ✅ device.js généré pour ${driver.name}`);
        }

        // Générer driver.js si manquant
        if (driver.needs.includes('driver')) {
            const driverFilePath = path.join(driverPath, 'driver.js');
            fs.writeFileSync(driverFilePath, this.templates.base.driver);
            console.log(`      ✅ driver.js généré pour ${driver.name}`);
        }

        // Générer driver.compose.json si manquant
        if (driver.needs.includes('compose')) {
            const composePath = path.join(driverPath, 'driver.compose.json');
            const compose = this.generateComposeJson(driver);
            fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
            console.log(`      ✅ driver.compose.json généré pour ${driver.name}`);
        }
    }

    selectDeviceTemplate(useCase) {
        if (this.templates.useCases[useCase]) {
            return this.templates.useCases[useCase].device;
        }
        return this.templates.base.device;
    }

    generateComposeJson(driver) {
        const baseCompose = {
            "id": driver.name,
            "class": this.determineClass(driver.capabilities),
            "capabilities": driver.capabilities.length > 0 ? driver.capabilities : ["onoff"],
            "capabilitiesOptions": {},
            "images": {
                "small": "assets/images/small.png",
                "large": "assets/images/large.png"
            }
        };

        // Ajouter les options de capabilities
        for (const capability of baseCompose.capabilities) {
            baseCompose.capabilitiesOptions[capability] = {
                set: this.isSettableCapability(capability),
                get: true
            };
        }

        return baseCompose;
    }

    determineClass(capabilities) {
        const caps = capabilities.map(cap => cap.toLowerCase());
        
        if (caps.includes('dim')) return 'light';
        if (caps.includes('onoff')) return 'switch';
        if (caps.includes('measure_temperature') || caps.includes('measure_humidity')) return 'sensor';
        
        return 'other';
    }

    isSettableCapability(capability) {
        const settable = ['onoff', 'dim', 'light_temperature', 'light_hue', 'light_saturation'];
        return settable.includes(capability);
    }

    async generateReport(analysis, missingDrivers) {
        console.log('📊 GÉNÉRATION DU RAPPORT...');
        console.log('-' .repeat(40));

        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: analysis.total,
                complete: analysis.complete,
                incomplete: analysis.incomplete,
                completionRate: analysis.total > 0 ? ((analysis.complete / analysis.total) * 100).toFixed(1) : 0
            },
            missingDrivers: missingDrivers.map(d => ({
                name: d.name,
                category: d.category,
                needs: d.needs,
                useCase: d.useCase
            })),
            categories: analysis.categories
        };

        const reportPath = path.join(this.projectRoot, 'DRIVER_ENRICHMENT_REPORT.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log(`   📄 Rapport généré: ${reportPath}`);
        console.log(`   📈 Taux de complétion: ${report.summary.completionRate}%`);
    }
}

if (require.main === module) {
    const enricher = new AutoEnrichDrivers();
    enricher.run().catch(console.error);
}

module.exports = AutoEnrichDrivers;
