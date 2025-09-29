#!/usr/bin/env node

/**
 * Comprehensive Driver Enricher
 * Creates missing drivers based on historical analysis, PR/issues, and external sources
 * Follows unbranded categorization with intelligent device mapping
 */

const fs = require('fs-extra');
const path = require('path');

class ComprehensiveDriverEnricher {
    constructor() {
        this.projectRoot = process.cwd();
        this.driversPath = path.join(this.projectRoot, 'drivers');
        
        this.enrichmentResults = {
            newDriversCreated: [],
            existingDriversEnhanced: [],
            manufacturerIdsAdded: [],
            capabilitiesEnhanced: [],
            errors: []
        };

        this.deviceTemplates = new Map([
            ['switches', this.generateSwitchTemplate()],
            ['sensors', this.generateSensorTemplate()],
            ['lighting', this.generateLightingTemplate()],
            ['climate', this.generateClimateTemplate()],
            ['security', this.generateSecurityTemplate()],
            ['power', this.generatePowerTemplate()],
            ['covers', this.generateCoversTemplate()],
            ['remotes', this.generateRemoteTemplate()]
        ]);

        console.log('🚀 Comprehensive Driver Enricher - Ultimate Device Coverage');
        console.log('📊 Creating missing drivers from all analyzed sources');
    }

    async run() {
        console.log('\n🚀 Starting comprehensive driver enrichment...');
        
        try {
            await this.loadAnalysisResults();
            await this.createMissingDrivers();
            await this.enhanceExistingDrivers();
            await this.generateEnrichmentReport();
            
            console.log('✅ Comprehensive driver enrichment completed successfully!');
            return this.enrichmentResults;
            
        } catch (error) {
            console.error('❌ Error during driver enrichment:', error);
            throw error;
        }
    }

    async loadAnalysisResults() {
        console.log('\n📂 Loading analysis results from all sources...');
        
        this.analysisData = {
            historical: await this.loadJSONSafely('comprehensive-historical-analysis.json'),
            prIssues: await this.loadJSONSafely('github-pr-issues-comprehensive-extraction.json'),
            external: await this.loadJSONSafely('external-sources-comprehensive-analysis.json'),
            reorganization: await this.loadJSONSafely('intelligent-folder-reorganization-report.json')
        };

        console.log('📊 Analysis data loaded:');
        console.log(`   Historical drivers: ${this.analysisData.historical?.summary?.currentDrivers || 0}`);
        console.log(`   Missing from history: ${this.analysisData.historical?.summary?.missingDrivers || 0}`);
        console.log(`   PR/Issues requests: ${this.analysisData.prIssues?.summary?.device_requests || 0}`);
        console.log(`   External sources: ${this.analysisData.external?.summary?.new_device_requests || 0}`);
    }

    async loadJSONSafely(filename) {
        try {
            const filePath = path.join(this.projectRoot, 'project-data', 'analysis-results', filename);
            if (await fs.pathExists(filePath)) {
                return await fs.readJson(filePath);
            }
        } catch (error) {
            console.log(`⚠️  Could not load ${filename}:`, error.message);
        }
        return null;
    }

    async createMissingDrivers() {
        console.log('\n🔧 Creating missing drivers from all sources...');
        
        const missingDrivers = this.compileMissingDriversList();
        console.log(`📊 Found ${missingDrivers.length} unique missing drivers to create`);

        let created = 0;
        for (const driverSpec of missingDrivers) {
            try {
                console.log(`🔨 Creating: ${driverSpec.name}`);
                await this.createDriver(driverSpec);
                this.enrichmentResults.newDriversCreated.push(driverSpec.name);
                created++;
            } catch (error) {
                console.log(`❌ Error creating ${driverSpec.name}:`, error.message);
                this.enrichmentResults.errors.push({
                    driver: driverSpec.name,
                    error: error.message,
                    action: 'create'
                });
            }
        }

        console.log(`✅ Created ${created}/${missingDrivers.length} new drivers`);
    }

    compileMissingDriversList() {
        const missingDrivers = [];
        const existingDrivers = new Set();

        // Get existing drivers
        try {
            const driversDir = fs.readdirSync(this.driversPath);
            driversDir.forEach(dir => existingDrivers.add(dir.toLowerCase()));
        } catch (error) {
            console.log('⚠️  Could not read existing drivers:', error.message);
        }

        // Add from historical analysis
        if (this.analysisData.historical?.analysis?.missingDrivers) {
            for (const missing of this.analysisData.historical.analysis.missingDrivers) {
                if (!existingDrivers.has(missing.suggested.toLowerCase())) {
                    missingDrivers.push({
                        name: missing.suggested,
                        category: missing.category,
                        source: 'historical',
                        priority: missing.priority || 'medium',
                        originalName: missing.name
                    });
                }
            }
        }

        // Add high-priority from external sources
        if (this.analysisData.external?.analysis?.newDeviceRequests) {
            for (const request of this.analysisData.external.analysis.newDeviceRequests) {
                if (request.priority === 'high' && !existingDrivers.has(request.suggestedName.toLowerCase())) {
                    missingDrivers.push({
                        name: request.suggestedName,
                        category: request.category,
                        source: 'external',
                        priority: request.priority,
                        originalName: request.originalName,
                        manufacturer: request.manufacturer,
                        capabilities: request.capabilities
                    });
                }
            }
        }

        // Add from PR/Issues with device requests
        if (this.analysisData.prIssues?.data?.deviceRequests) {
            for (const request of this.analysisData.prIssues.data.deviceRequests) {
                const suggestedName = this.suggestDriverName(request.device);
                if (!existingDrivers.has(suggestedName.toLowerCase())) {
                    missingDrivers.push({
                        name: suggestedName,
                        category: request.category || 'other',
                        source: 'pr-issues',
                        priority: 'medium',
                        originalName: request.device
                    });
                }
            }
        }

        // Remove duplicates
        const uniqueDrivers = [];
        const seen = new Set();
        
        for (const driver of missingDrivers) {
            const key = driver.name.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                uniqueDrivers.push(driver);
            }
        }

        // Sort by priority
        return uniqueDrivers.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }).slice(0, 25); // Limit to top 25 for practical purposes
    }

    suggestDriverName(deviceName) {
        return deviceName.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .replace(/^(tuya|aqara|xiaomi|sonoff|ikea)_?/i, '')
            .replace(/^smart_/, '')
            .replace(/^wireless_/, '')
            .trim();
    }

    async createDriver(driverSpec) {
        const driverPath = path.join(this.driversPath, driverSpec.name);
        
        // Create driver directory
        await fs.ensureDir(driverPath);
        await fs.ensureDir(path.join(driverPath, 'assets'));

        // Create driver.json
        const driverJson = this.generateDriverJson(driverSpec);
        await fs.writeJson(path.join(driverPath, 'driver.json'), driverJson, { spaces: 2 });

        // Create device.js
        const deviceJs = this.generateDeviceJs(driverSpec);
        await fs.writeFile(path.join(driverPath, 'device.js'), deviceJs);

        // Create placeholder images (will be regenerated later)
        await this.createPlaceholderImages(path.join(driverPath, 'assets'));
    }

    generateDriverJson(driverSpec) {
        const template = this.deviceTemplates.get(driverSpec.category) || this.deviceTemplates.get('sensors');
        
        return {
            id: driverSpec.name,
            name: {
                en: this.generateDriverTitle(driverSpec.name)
            },
            class: template.class,
            capabilities: driverSpec.capabilities || template.capabilities,
            platforms: ["local"],
            connectivity: ["zigbee"],
            images: {
                small: "./assets/small.png",
                large: "./assets/large.png"
            },
            zigbee: {
                manufacturerName: driverSpec.manufacturer || "_TZ3000_",
                productId: driverSpec.manufacturer || "_TZ3000_" + Math.random().toString(36).substr(2, 8).toUpperCase(),
                endpoints: template.endpoints,
                learnmode: {
                    image: "./assets/large.png",
                    instruction: {
                        en: `Follow the pairing instructions for your ${this.generateDriverTitle(driverSpec.name)}.`
                    }
                }
            },
            energy: template.energy,
            settings: template.settings || []
        };
    }

    generateDriverTitle(driverName) {
        return driverName.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    generateDeviceJs(driverSpec) {
        const template = this.deviceTemplates.get(driverSpec.category) || this.deviceTemplates.get('sensors');
        
        return `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${this.generateClassName(driverSpec.name)} extends ZigBeeDevice {

    async onNodeInit() {
        await super.onNodeInit();
        
        this.log('${this.generateDriverTitle(driverSpec.name)} device initialized');
        
        ${template.deviceCode}
        
        await this.configureAttributeReporting([
            {
                endpointId: 1,
                cluster: {
                    ${template.clusterConfig}
                }
            }
        ]).catch(this.error);
    }

    ${template.additionalMethods || ''}
}

module.exports = ${this.generateClassName(driverSpec.name)};`;
    }

    generateClassName(driverName) {
        return driverName.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('') + 'Device';
    }

    async createPlaceholderImages(assetsPath) {
        // Create placeholder image files that will be replaced by image generator
        const smallPlaceholder = Buffer.from('placeholder-small');
        const largePlaceholder = Buffer.from('placeholder-large');
        
        await fs.writeFile(path.join(assetsPath, 'small.placeholder'), smallPlaceholder);
        await fs.writeFile(path.join(assetsPath, 'large.placeholder'), largePlaceholder);
    }

    async enhanceExistingDrivers() {
        console.log('\n🔧 Enhancing existing drivers with new data...');
        
        // Get manufacturer IDs from external sources
        const manufacturerIds = new Set();
        if (this.analysisData.external?.data?.manufacturerIds) {
            this.analysisData.external.data.manufacturerIds.forEach(id => manufacturerIds.add(id));
        }
        if (this.analysisData.prIssues?.data?.manufacturerIds) {
            this.analysisData.prIssues.data.manufacturerIds.forEach(id => manufacturerIds.add(id));
        }

        console.log(`📊 Found ${manufacturerIds.size} manufacturer IDs to potentially add`);
        
        const existingDrivers = await fs.readdir(this.driversPath);
        let enhanced = 0;

        for (const driverName of existingDrivers) {
            const driverPath = path.join(this.driversPath, driverName);
            const stat = await fs.stat(driverPath);
            
            if (stat.isDirectory()) {
                try {
                    const wasEnhanced = await this.enhanceDriver(driverName, driverPath, manufacturerIds);
                    if (wasEnhanced) {
                        this.enrichmentResults.existingDriversEnhanced.push(driverName);
                        enhanced++;
                    }
                } catch (error) {
                    console.log(`⚠️  Error enhancing ${driverName}:`, error.message);
                    this.enrichmentResults.errors.push({
                        driver: driverName,
                        error: error.message,
                        action: 'enhance'
                    });
                }
            }
        }

        console.log(`✅ Enhanced ${enhanced} existing drivers`);
    }

    async enhanceDriver(driverName, driverPath, manufacturerIds) {
        const driverJsonPath = path.join(driverPath, 'driver.json');
        
        if (!await fs.pathExists(driverJsonPath)) {
            return false;
        }

        const driverJson = await fs.readJson(driverJsonPath);
        let wasModified = false;

        // Add relevant manufacturer IDs based on device category
        if (driverJson.zigbee) {
            const relevantIds = Array.from(manufacturerIds).filter(id => 
                this.isRelevantManufacturerId(id, driverName)
            );

            if (relevantIds.length > 0) {
                // Ensure manufacturerName is array
                if (!Array.isArray(driverJson.zigbee.manufacturerName)) {
                    driverJson.zigbee.manufacturerName = driverJson.zigbee.manufacturerName 
                        ? [driverJson.zigbee.manufacturerName] 
                        : [];
                }

                // Add new manufacturer IDs
                const existing = new Set(driverJson.zigbee.manufacturerName);
                let added = 0;
                
                for (const id of relevantIds.slice(0, 5)) { // Limit to 5 new IDs
                    if (!existing.has(id)) {
                        driverJson.zigbee.manufacturerName.push(id);
                        existing.add(id);
                        added++;
                        wasModified = true;
                    }
                }

                if (added > 0) {
                    this.enrichmentResults.manufacturerIdsAdded.push({
                        driver: driverName,
                        added: added,
                        ids: relevantIds.slice(0, added)
                    });
                }
            }
        }

        // Save if modified
        if (wasModified) {
            await fs.writeJson(driverJsonPath, driverJson, { spaces: 2 });
        }

        return wasModified;
    }

    isRelevantManufacturerId(manufacturerId, driverName) {
        // Simple relevance check - can be enhanced with more sophisticated matching
        const driverLower = driverName.toLowerCase();
        const idLower = manufacturerId.toLowerCase();
        
        // Always relevant for Tuya devices
        if (idLower.includes('_tz')) return true;
        
        // Category-based relevance
        if (driverLower.includes('switch') && idLower.includes('switch')) return true;
        if (driverLower.includes('sensor') && idLower.includes('sensor')) return true;
        if (driverLower.includes('light') && idLower.includes('light')) return true;
        
        return false;
    }

    generateSwitchTemplate() {
        return {
            class: 'socket',
            capabilities: ['onoff'],
            endpoints: {
                1: {
                    clusters: [0, 3, 4, 5, 6, 1794, 57344],
                    bindings: [6]
                }
            },
            energy: {
                batteries: ['CR2032']
            },
            deviceCode: `
        // Register onoff capability
        this.registerCapability('onoff', 6, {
            endpoint: 1
        });`,
            clusterConfig: `
                id: 6,
                attributes: ['onOff']
            `
        };
    }

    generateSensorTemplate() {
        return {
            class: 'sensor',
            capabilities: ['measure_temperature', 'measure_humidity', 'alarm_battery'],
            endpoints: {
                1: {
                    clusters: [0, 1, 3, 1026, 1029],
                    bindings: [1026, 1029]
                }
            },
            energy: {
                batteries: ['CR2032']
            },
            deviceCode: `
        // Register temperature capability
        this.registerCapability('measure_temperature', 1026);
        
        // Register humidity capability  
        this.registerCapability('measure_humidity', 1029);
        
        // Register battery alarm
        this.registerCapability('alarm_battery', 1);`,
            clusterConfig: `
                id: 1026,
                attributes: ['measuredValue']
            `
        };
    }

    generateLightingTemplate() {
        return {
            class: 'light',
            capabilities: ['onoff', 'dim'],
            endpoints: {
                1: {
                    clusters: [0, 3, 4, 5, 6, 8],
                    bindings: [6, 8]
                }
            },
            deviceCode: `
        // Register onoff capability
        this.registerCapability('onoff', 6);
        
        // Register dim capability
        this.registerCapability('dim', 8);`,
            clusterConfig: `
                id: 6,
                attributes: ['onOff']
            `
        };
    }

    generateClimateTemplate() {
        return {
            class: 'thermostat',
            capabilities: ['target_temperature', 'measure_temperature'],
            endpoints: {
                1: {
                    clusters: [0, 3, 513, 1026],
                    bindings: [513, 1026]
                }
            },
            deviceCode: `
        // Register temperature capabilities
        this.registerCapability('target_temperature', 513);
        this.registerCapability('measure_temperature', 1026);`,
            clusterConfig: `
                id: 513,
                attributes: ['occupiedCoolingSetpoint', 'occupiedHeatingSetpoint']
            `
        };
    }

    generateSecurityTemplate() {
        return {
            class: 'lock',
            capabilities: ['locked', 'alarm_battery'],
            endpoints: {
                1: {
                    clusters: [0, 1, 3, 257],
                    bindings: [257]
                }
            },
            energy: {
                batteries: ['AA', 'CR2032']
            },
            deviceCode: `
        // Register lock capability
        this.registerCapability('locked', 257);
        
        // Register battery alarm
        this.registerCapability('alarm_battery', 1);`,
            clusterConfig: `
                id: 257,
                attributes: ['lockState']
            `
        };
    }

    generatePowerTemplate() {
        return {
            class: 'socket',
            capabilities: ['onoff', 'measure_power', 'meter_power'],
            endpoints: {
                1: {
                    clusters: [0, 3, 4, 5, 6, 1794, 2820],
                    bindings: [6, 1794, 2820]
                }
            },
            deviceCode: `
        // Register power capabilities
        this.registerCapability('onoff', 6);
        this.registerCapability('measure_power', 1794);
        this.registerCapability('meter_power', 1794);`,
            clusterConfig: `
                id: 6,
                attributes: ['onOff']
            `
        };
    }

    generateCoversTemplate() {
        return {
            class: 'windowcoverings',
            capabilities: ['windowcoverings_state', 'windowcoverings_set'],
            endpoints: {
                1: {
                    clusters: [0, 3, 4, 5, 258],
                    bindings: [258]
                }
            },
            deviceCode: `
        // Register window coverings capabilities
        this.registerCapability('windowcoverings_state', 258);
        this.registerCapability('windowcoverings_set', 258);`,
            clusterConfig: `
                id: 258,
                attributes: ['currentPositionLiftPercentage']
            `
        };
    }

    generateRemoteTemplate() {
        return {
            class: 'button',
            capabilities: ['alarm_battery'],
            endpoints: {
                1: {
                    clusters: [0, 1, 3],
                    bindings: []
                }
            },
            energy: {
                batteries: ['CR2032']
            },
            deviceCode: `
        // Register battery alarm
        this.registerCapability('alarm_battery', 1);
        
        // Setup button press detection
        this.registerAttrReportListener('genOnOff', 'onOff', 1, 60, null, this.onCommandReport.bind(this));`,
            clusterConfig: `
                id: 1,
                attributes: ['batteryPercentageRemaining']
            `,
            additionalMethods: `
    onCommandReport(value) {
        this.log('Button pressed:', value);
        this.homey.flow.getDeviceTriggerCard('button_pressed').trigger(this);
    }`
        };
    }

    async generateEnrichmentReport() {
        console.log('\n📊 Generating comprehensive enrichment report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                new_drivers_created: this.enrichmentResults.newDriversCreated.length,
                existing_drivers_enhanced: this.enrichmentResults.existingDriversEnhanced.length,
                manufacturer_ids_added: this.enrichmentResults.manufacturerIdsAdded.length,
                total_errors: this.enrichmentResults.errors.length,
                success_rate: this.calculateSuccessRate()
            },
            details: {
                newDriversCreated: this.enrichmentResults.newDriversCreated,
                existingDriversEnhanced: this.enrichmentResults.existingDriversEnhanced,
                manufacturerIdsAdded: this.enrichmentResults.manufacturerIdsAdded,
                errors: this.enrichmentResults.errors
            },
            sources_utilized: [
                'Historical Analysis',
                'GitHub PR/Issues', 
                'External Sources (Z2M, ZHA, Blackhader)',
                'Folder Reorganization Results'
            ],
            next_steps: [
                'Run image coherence analyzer on new drivers',
                'Generate images for new drivers', 
                'Run final validation',
                'Update version and publish'
            ]
        };

        const reportPath = path.join(this.projectRoot, 'project-data', 'analysis-results', 'comprehensive-driver-enrichment-report.json');
        await fs.ensureDir(path.dirname(reportPath));
        await fs.writeJson(reportPath, report, { spaces: 2 });

        console.log(`📄 Enrichment report saved: ${reportPath}`);
        console.log('\n📊 Driver Enrichment Summary:');
        console.log(`   New drivers created: ${report.summary.new_drivers_created}`);
        console.log(`   Existing drivers enhanced: ${report.summary.existing_drivers_enhanced}`);
        console.log(`   Manufacturer IDs added: ${report.summary.manufacturer_ids_added}`);
        console.log(`   Success rate: ${report.summary.success_rate}%`);
        console.log(`   Errors: ${report.summary.total_errors}`);

        return report;
    }

    calculateSuccessRate() {
        const total = this.enrichmentResults.newDriversCreated.length + 
                     this.enrichmentResults.existingDriversEnhanced.length + 
                     this.enrichmentResults.errors.length;
        const successful = this.enrichmentResults.newDriversCreated.length + 
                          this.enrichmentResults.existingDriversEnhanced.length;
        
        return total > 0 ? Math.round((successful / total) * 100) : 100;
    }
}

// Execute if run directly
if (require.main === module) {
    const enricher = new ComprehensiveDriverEnricher();
    enricher.run().catch(console.error);
}

module.exports = ComprehensiveDriverEnricher;
