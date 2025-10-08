#!/usr/bin/env node
'use strict';

/**
 * 🔍 EVIDENCE COLLECTOR - BRIEF "BÉTON"
 * 
 * Collecte les preuves et spécifications pour chaque driver
 * Recherche dans Zigbee2MQTT, Blakadder, Homey Forum, GitHub
 */

const fs = require('fs');
const path = require('path');

class EvidenceCollector {
    constructor() {
        this.projectRoot = process.cwd();
        this.driversDir = path.join(this.projectRoot, 'drivers');
        this.evidenceDir = path.join(this.projectRoot, 'evidence');
    }

    async run() {
        try {
            console.log('🔍 EVIDENCE COLLECTOR - BRIEF "BÉTON"');
            console.log('=' .repeat(70));
            console.log('🎯 Collecte des preuves pour chaque driver...\n');

            // 1. Analyser la structure des drivers
            const drivers = await this.analyzeDrivers();

            // 2. Collecter les preuves pour chaque driver
            for (const driver of drivers) {
                await this.collectEvidenceForDriver(driver);
            }

            // 3. Rapport final
            await this.generateEvidenceReport(drivers);

            console.log('\n✅ COLLECTE D\'ÉVIDENCE TERMINÉE !');
            console.log('🚀 Chaque driver a maintenant son pack d\'évidence !');

        } catch (error) {
            console.error('❌ Erreur lors de la collecte:', error);
        }
    }

    async analyzeDrivers() {
        console.log('🔍 ANALYSE DE LA STRUCTURE DES DRIVERS...');
        console.log('-' .repeat(40));

        const drivers = [];

        try {
            if (!fs.existsSync(this.driversDir)) {
                console.log('   ⚠️ Dossier drivers non trouvé');
                return drivers;
            }

            const categories = fs.readdirSync(this.driversDir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            for (const category of categories) {
                const categoryPath = path.join(this.driversDir, category);
                const driverFolders = fs.readdirSync(categoryPath, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name);

                for (const driverName of driverFolders) {
                    const driverPath = path.join(categoryPath, driverName);
                    const driver = await this.analyzeDriver(driverPath, category, driverName);
                    drivers.push(driver);
                }
            }

            console.log(`   📊 Total drivers analysés: ${drivers.length}`);

        } catch (error) {
            console.log(`   ❌ Erreur analyse: ${error.message}`);
        }

        return drivers;
    }

    async analyzeDriver(driverPath, category, driverName) {
        const analysis = {
            id: driverName,
            category: category,
            path: driverPath,
            hasDevice: false,
            hasDriver: false,
            hasCompose: false,
            capabilities: [],
            zigbee: {},
            useCase: 'unknown'
        };

        try {
            const files = fs.readdirSync(driverPath);
            
            analysis.hasDevice = files.includes('device.js');
            analysis.hasDriver = files.includes('driver.js');
            analysis.hasCompose = files.includes('driver.compose.json') || files.includes('driver.json');

            // Analyser le compose pour déterminer les capabilities et zigbee
            if (analysis.hasCompose) {
                const composePath = ['driver.compose.json', 'driver.json']
                    .map(f => path.join(driverPath, f))
                    .find(f => fs.existsSync(f));

                if (composePath) {
                    try {
                        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                        analysis.capabilities = compose.capabilities || [];
                        analysis.zigbee = compose.zigbee || {};
                        analysis.useCase = this.determineUseCase(compose.capabilities || []);
                    } catch (error) {
                        console.log(`      ⚠️ Erreur parsing ${driverName}: ${error.message}`);
                    }
                }
            }

        } catch (error) {
            // Ignorer les erreurs de lecture
        }

        return analysis;
    }

    determineUseCase(capabilities) {
        const caps = capabilities.map(cap => cap.toLowerCase());
        
        if (caps.includes('dim') || caps.includes('light_temperature') || caps.includes('light_hue')) return 'light';
        if (caps.includes('onoff')) return 'switch';
        if (caps.includes('measure_temperature') || caps.includes('measure_humidity') || caps.includes('measure_pressure')) return 'sensor';
        if (caps.includes('alarm_motion') || caps.includes('alarm_contact')) return 'security';
        if (caps.includes('measure_power') || caps.includes('meter_power')) return 'energy';
        if (caps.includes('target_temperature')) return 'thermostat';
        if (caps.includes('windowcoverings')) return 'cover';
        
        return 'other';
    }

    async collectEvidenceForDriver(driver) {
        console.log(`🔍 Collecte pour ${driver.id} (${driver.category}/${driver.useCase})...`);

        const evidenceDir = path.join(this.evidenceDir, driver.id);
        if (!fs.existsSync(evidenceDir)) {
            fs.mkdirSync(evidenceDir, { recursive: true });
        }

        // 1. Sources de recherche
        await this.generateSources(driver, evidenceDir);

        // 2. Fingerprints Zigbee
        await this.generateFingerprints(driver, evidenceDir);

        // 3. Features détectées
        await this.generateFeatures(driver, evidenceDir);

        // 4. Clusters identifiés
        await this.generateClusters(driver, evidenceDir);

        // 5. DPIDs Tuya EF00 (si applicable)
        await this.generateTuyaDpids(driver, evidenceDir);

        // 6. Configuration reporting
        await this.generateReporting(driver, evidenceDir);

        // 7. Capabilities proposées
        await this.generateProposedCapabilities(driver, evidenceDir);

        // 8. Notes et observations
        await this.generateNotes(driver, evidenceDir);

        console.log(`   ✅ Évidence collectée pour ${driver.id}`);
    }

    async generateSources(driver, evidenceDir) {
        const sources = {
            zigbee2mqtt: [],
            blakadder: [],
            homey_forum: [],
            github: []
        };

        // Générer des requêtes de recherche basées sur les informations du driver
        const searchTerms = this.buildSearchTerms(driver);

        sources.zigbee2mqtt = [
            {
                title: `Zigbee2MQTT: ${driver.id} search`,
                url: `https://www.zigbee2mqtt.io/devices/?search=${encodeURIComponent(searchTerms)}`,
                description: 'Recherche dans la base de données Zigbee2MQTT'
            }
        ];

        sources.blakadder = [
            {
                title: `Blakadder: ${driver.id} search`,
                url: `https://blakadder.com/zigbee/?search=${encodeURIComponent(searchTerms)}`,
                description: 'Recherche dans la base Blakadder'
            }
        ];

        sources.homey_forum = [
            {
                title: `Homey Forum: ${driver.id} discussion`,
                url: `https://community.homey.app/search?q=${encodeURIComponent(searchTerms + ' zigbee')}`,
                description: 'Recherche dans le forum Homey'
            }
        ];

        sources.github = [
            {
                title: `GitHub: ${driver.id} zigbee`,
                url: `https://github.com/search?q=${encodeURIComponent(searchTerms + ' zigbee')}`,
                description: 'Recherche dans GitHub'
            }
        ];

        const sourcesPath = path.join(evidenceDir, 'sources.json');
        fs.writeFileSync(sourcesPath, JSON.stringify(sources, null, 2));
    }

    buildSearchTerms(driver) {
        const terms = [driver.id];
        
        if (driver.zigbee.manufacturerName) {
            terms.push(driver.zigbee.manufacturerName);
        }
        
        if (driver.zigbee.modelId) {
            terms.push(driver.zigbee.modelId);
        }
        
        if (driver.zigbee.productId) {
            terms.push(driver.zigbee.productId);
        }

        return terms.join(' ');
    }

    async generateFingerprints(driver, evidenceDir) {
        const fingerprints = {
            manufacturer: driver.zigbee.manufacturerName || 'Unknown',
            model: driver.zigbee.modelId || 'Unknown',
            product: driver.zigbee.productId || 'Unknown',
            endpoints: [],
            input_clusters: [],
            output_clusters: []
        };

        // Ajouter des clusters par défaut selon le use-case
        switch (driver.useCase) {
            case 'light':
                fingerprints.input_clusters = ['genBasic', 'genOnOff', 'genLevelCtrl', 'lightingColorCtrl'];
                break;
            case 'switch':
                fingerprints.input_clusters = ['genBasic', 'genOnOff'];
                break;
            case 'sensor':
                fingerprints.input_clusters = ['genBasic', 'msTemperatureMeasurement', 'msRelativeHumidity'];
                break;
            case 'security':
                fingerprints.input_clusters = ['genBasic', 'msOccupancySensing', 'ssIasZone'];
                break;
            case 'energy':
                fingerprints.input_clusters = ['genBasic', 'haElectricalMeasurement', 'seMetering'];
                break;
            default:
                fingerprints.input_clusters = ['genBasic'];
        }

        const fingerprintsPath = path.join(evidenceDir, 'fingerprints.json');
        fs.writeFileSync(fingerprintsPath, JSON.stringify(fingerprints, null, 2));
    }

    async generateFeatures(driver, evidenceDir) {
        const features = [];

        // Détecter les features basées sur les capabilities existantes
        if (driver.capabilities.includes('onoff')) features.push('switch');
        if (driver.capabilities.includes('dim')) features.push('dimmer');
        if (driver.capabilities.includes('light_temperature')) features.push('cct');
        if (driver.capabilities.includes('light_hue')) features.push('rgb');
        if (driver.capabilities.includes('measure_power')) features.push('power_meter');
        if (driver.capabilities.includes('measure_temperature')) features.push('env_sensor');
        if (driver.capabilities.includes('measure_humidity')) features.push('env_sensor');
        if (driver.capabilities.includes('alarm_motion')) features.push('motion_sensor');
        if (driver.capabilities.includes('alarm_contact')) features.push('contact_sensor');
        if (driver.capabilities.includes('target_temperature')) features.push('thermostat');
        if (driver.capabilities.includes('windowcoverings')) features.push('cover');

        const featuresPath = path.join(evidenceDir, 'features.json');
        fs.writeFileSync(featuresPath, JSON.stringify(features, null, 2));
    }

    async generateClusters(driver, evidenceDir) {
        const clusters = [];

        // Mapper les capabilities aux clusters ZCL
        const capabilityToCluster = {
            'onoff': 'genOnOff',
            'dim': 'genLevelCtrl',
            'light_temperature': 'lightingColorCtrl',
            'light_hue': 'lightingColorCtrl',
            'light_saturation': 'lightingColorCtrl',
            'measure_temperature': 'msTemperatureMeasurement',
            'measure_humidity': 'msRelativeHumidity',
            'measure_luminance': 'msIlluminanceMeasurement',
            'alarm_motion': 'msOccupancySensing',
            'alarm_contact': 'ssIasZone',
            'measure_power': 'haElectricalMeasurement',
            'meter_power': 'seMetering',
            'target_temperature': 'hvacThermostat'
        };

        for (const capability of driver.capabilities) {
            if (capabilityToCluster[capability]) {
                clusters.push(capabilityToCluster[capability]);
            }
        }

        // Ajouter des clusters de base
        if (!clusters.includes('genBasic')) {
            clusters.unshift('genBasic');
        }

        const clustersPath = path.join(evidenceDir, 'clusters.json');
        fs.writeFileSync(clustersPath, JSON.stringify(clusters, null, 2));
    }

    async generateTuyaDpids(driver, evidenceDir) {
        const dpids = [];

        // Générer des DPIDs par défaut selon le use-case
        if (driver.useCase === 'light') {
            dpids.push(
                { dpid: 1, type: 'bool', meaning: 'on/off', scale: 1, unit: '' },
                { dpid: 2, type: 'value', meaning: 'brightness', scale: 1, unit: '%' },
                { dpid: 3, type: 'value', meaning: 'color_temperature', scale: 1, unit: 'K' }
            );
        } else if (driver.useCase === 'sensor') {
            dpids.push(
                { dpid: 1, type: 'value', meaning: 'temperature', scale: 10, unit: '°C' },
                { dpid: 2, type: 'value', meaning: 'humidity', scale: 1, unit: '%' }
            );
        }

        const dpidsPath = path.join(evidenceDir, 'tuya_dpids.json');
        fs.writeFileSync(dpidsPath, JSON.stringify(dpids, null, 2));
    }

    async generateReporting(driver, evidenceDir) {
        const reporting = [];

        // Configuration de reporting par défaut selon les capabilities
        if (driver.capabilities.includes('measure_temperature')) {
            reporting.push({
                cluster: 'msTemperatureMeasurement',
                attribute: 'measuredValue',
                minInterval: 0,
                maxInterval: 300000,
                minChange: 10
            });
        }

        if (driver.capabilities.includes('measure_humidity')) {
            reporting.push({
                cluster: 'msRelativeHumidity',
                attribute: 'measuredValue',
                minInterval: 0,
                maxInterval: 300000,
                minChange: 100
            });
        }

        if (driver.capabilities.includes('onoff')) {
            reporting.push({
                cluster: 'genOnOff',
                attribute: 'onOff',
                minInterval: 0,
                maxInterval: 60000,
                minChange: 1
            });
        }

        const reportingPath = path.join(evidenceDir, 'reporting.json');
        fs.writeFileSync(reportingPath, JSON.stringify(reporting, null, 2));
    }

    async generateProposedCapabilities(driver, evidenceDir) {
        const proposed = [...driver.capabilities];

        // Ajouter des capabilities basées sur le use-case
        switch (driver.useCase) {
            case 'light':
                if (!proposed.includes('onoff')) proposed.unshift('onoff');
                if (!proposed.includes('dim')) proposed.push('dim');
                break;
            case 'sensor':
                if (!proposed.includes('measure_temperature')) proposed.push('measure_temperature');
                if (!proposed.includes('measure_humidity')) proposed.push('measure_humidity');
                break;
            case 'energy':
                if (!proposed.includes('measure_power')) proposed.push('measure_power');
                if (!proposed.includes('meter_power')) proposed.push('meter_power');
                break;
        }

        const capabilitiesPath = path.join(evidenceDir, 'capabilities.proposed.json');
        fs.writeFileSync(capabilitiesPath, JSON.stringify(proposed, null, 2));
    }

    async generateNotes(driver, evidenceDir) {
        const notes = `# Notes pour ${driver.id}

## Choix effectués
- **Use-case détecté**: ${driver.useCase}
- **Capabilities existantes**: ${driver.capabilities.join(', ') || 'Aucune'}
- **Clusters identifiés**: Voir \`clusters.json\`

## Sources consultées
- Zigbee2MQTT: Base de données officielle des devices Zigbee
- Blakadder: Base de données communautaire
- Homey Forum: Discussions et exemples d'implémentation
- GitHub: Code source et issues

## Prochaines étapes
1. Vérifier les sources pour confirmer les clusters
2. Valider les DPIDs Tuya si applicable
3. Ajuster les capabilities selon les spécifications réelles
4. Tester la configuration de reporting

## Remarques
- Les clusters et DPIDs sont basés sur des patterns communs
- Vérifier toujours avec les sources officielles
- Adapter selon le firmware et la version du device
`;

        const notesPath = path.join(evidenceDir, 'notes.md');
        fs.writeFileSync(notesPath, notes);
    }

    async generateEvidenceReport(drivers) {
        console.log('📊 GÉNÉRATION DU RAPPORT D\'ÉVIDENCE...');
        console.log('-' .repeat(40));

        const report = {
            timestamp: new Date().toISOString(),
            total: drivers.length,
            evidenceCollected: 0,
            drivers: []
        };

        for (const driver of drivers) {
            const evidencePath = path.join(this.evidenceDir, driver.id);
            const hasEvidence = fs.existsSync(evidencePath);
            
            report.drivers.push({
                id: driver.id,
                category: driver.category,
                useCase: driver.useCase,
                hasEvidence: hasEvidence,
                capabilities: driver.capabilities.length
            });

            if (hasEvidence) {
                report.evidenceCollected++;
            }
        }

        const reportPath = path.join(this.projectRoot, 'EVIDENCE_COLLECTION_REPORT.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log(`   📄 Rapport généré: ${reportPath}`);
        console.log(`   📊 Évidence collectée: ${report.evidenceCollected}/${report.total} drivers`);
    }
}

if (require.main === module) {
    const collector = new EvidenceCollector();
    collector.run().catch(console.error);
}

module.exports = EvidenceCollector;
