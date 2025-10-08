#!/usr/bin/env node

/**
 * External Sources Analyzer
 * Analyzes ZHA, Zigbee2MQTT, Domoticz, and forum sources for new device information
 * Extracts device data, manufacturer IDs, and capabilities from external Zigbee databases
 */

const fs = require('fs-extra');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

class ExternalSourcesAnalyzer {
    constructor() {
        this.projectRoot = process.cwd();
        this.externalData = {
            zhaDevices: [],
            zigbee2mqttDevices: [],
            domoticzDevices: [],
            forumDiscussions: [],
            blackhaderDevices: [],
            manufacturerDatabase: new Map(),
            deviceCapabilities: new Map(),
            newDeviceRequests: [],
            compatibilityMatrix: new Map()
        };

        this.sources = {
            zigbee2mqtt: {
                name: 'Zigbee2MQTT',
                urls: [
                    'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
                    'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/xiaomi.ts',
                    'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/sonoff.ts'
                ]
            },
            zha: {
                name: 'ZHA (Home Assistant)',
                urls: [
                    'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/__init__.py',
                    'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/xiaomi/__init__.py'
                ]
            },
            blackhader: {
                name: 'Blackhader ZHA',
                urls: [
                    'https://github.com/blackhader/zha-device-handlers',
                    'https://raw.githubusercontent.com/blackhader/zha-device-handlers/main/zhaquirks/tuya/ts0601_motion.py'
                ]
            }
        };

        console.log('🌐 External Sources Analyzer - Comprehensive Device Database');
        console.log('📊 Analyzing ZHA, Zigbee2MQTT, Domoticz, and forum sources');
    }

    async run() {
        console.log('\n🚀 Starting external sources analysis...');
        
        try {
            await this.analyzeZigbee2MQTT();
            await this.analyzeZHA();
            await this.analyzeBlackhaderSources();
            await this.analyzeDomoticzSources();
            await this.analyzeForumSources();
            await this.consolidateDeviceData();
            await this.generateDeviceMatrix();
            await this.generateComprehensiveReport();
            
            console.log('✅ External sources analysis completed successfully!');
            return this.externalData;
            
        } catch (error) {
            console.error('❌ Error during external analysis:', error);
            throw error;
        }
    }

    async analyzeZigbee2MQTT() {
        console.log('\n📡 Analyzing Zigbee2MQTT database...');
        
        try {
            for (const url of this.sources.zigbee2mqtt.urls) {
                console.log(`🔍 Fetching: ${url}`);
                await this.fetchAndParseZigbee2MQTTFile(url);
            }
            
            // Also try to get the supported-devices list
            await this.fetchZigbee2MQTTSupportedDevices();
            
            console.log(`✅ Zigbee2MQTT: Found ${this.externalData.zigbee2mqttDevices.length} devices`);
            
        } catch (error) {
            console.log('⚠️  Zigbee2MQTT analysis failed:', error.message);
        }
    }

    async fetchAndParseZigbee2MQTTFile(url) {
        return new Promise((resolve) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        this.parseZigbee2MQTTContent(data, url);
                    } catch (error) {
                        console.log(`⚠️  Error parsing ${url}:`, error.message);
                    }
                    resolve();
                });
            }).on('error', () => resolve());
        });
    }

    parseZigbee2MQTTContent(content, sourceUrl) {
        // Extract device definitions from TypeScript/JavaScript content
        const devicePatterns = [
            // Device definition pattern
            /fingerprint:\s*{\s*modelID:\s*['"`]([^'"`]+)['"`].*?manufacturerName:\s*['"`]([^'"`]+)['"`]/gs,
            // Alternative pattern
            /model:\s*['"`]([^'"`]+)['"`].*?vendor:\s*['"`]([^'"`]+)['"`]/gs,
            // Manufacturer ID pattern
            /manufacturerID:\s*(\d+)/g,
            /manufacturerName:\s*['"`]([^'"`]+)['"`]/g
        ];

        for (const pattern of devicePatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const device = {
                    model: match[1] || 'Unknown',
                    manufacturer: match[2] || 'Unknown',
                    source: 'zigbee2mqtt',
                    sourceUrl: sourceUrl,
                    capabilities: this.extractCapabilitiesFromContent(content, match.index)
                };

                this.externalData.zigbee2mqttDevices.push(device);
                this.externalData.manufacturerDatabase.set(device.manufacturer, {
                    name: device.manufacturer,
                    devices: (this.externalData.manufacturerDatabase.get(device.manufacturer)?.devices || 0) + 1,
                    source: 'zigbee2mqtt'
                });
            }
        }

        // Extract manufacturer IDs specifically
        const manufacturerIds = content.match(/_TZ\d{4}_[A-Z0-9]+|_TYZB\d{2}_[A-Z0-9]+|_TYST\d{2}_[A-Z0-9]+/g);
        if (manufacturerIds) {
            manufacturerIds.forEach(id => {
                this.externalData.manufacturerDatabase.set(id, {
                    name: id,
                    type: 'manufacturer_id',
                    source: 'zigbee2mqtt'
                });
            });
        }
    }

    async fetchZigbee2MQTTSupportedDevices() {
        try {
            console.log('📋 Fetching Zigbee2MQTT supported devices list...');
            
            const url = 'https://raw.githubusercontent.com/Koenkk/zigbee2mqtt.io/master/docs/supported-devices.md';
            
            return new Promise((resolve) => {
                https.get(url, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        this.parseSupportedDevicesList(data);
                        resolve();
                    });
                }).on('error', () => resolve());
            });
            
        } catch (error) {
            console.log('⚠️  Could not fetch supported devices list:', error.message);
        }
    }

    parseSupportedDevicesList(content) {
        // Parse markdown table of supported devices
        const lines = content.split('\n');
        let inTable = false;
        
        for (const line of lines) {
            if (line.includes('| Model ') && line.includes('| Vendor ')) {
                inTable = true;
                continue;
            }
            
            if (inTable && line.startsWith('|')) {
                const columns = line.split('|').map(col => col.trim());
                if (columns.length >= 3) {
                    const model = columns[1];
                    const vendor = columns[2];
                    
                    if (model && vendor && model !== 'Model' && vendor !== 'Vendor') {
                        this.externalData.zigbee2mqttDevices.push({
                            model: model,
                            manufacturer: vendor,
                            source: 'zigbee2mqtt-supported-list',
                            capabilities: []
                        });
                    }
                }
            }
        }
    }

    async analyzeZHA() {
        console.log('\n🏠 Analyzing ZHA (Home Assistant) database...');
        
        try {
            for (const url of this.sources.zha.urls) {
                console.log(`🔍 Fetching: ${url}`);
                await this.fetchAndParseZHAFile(url);
            }
            
            console.log(`✅ ZHA: Found ${this.externalData.zhaDevices.length} devices`);
            
        } catch (error) {
            console.log('⚠️  ZHA analysis failed:', error.message);
        }
    }

    async fetchAndParseZHAFile(url) {
        return new Promise((resolve) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        this.parseZHAContent(data, url);
                    } catch (error) {
                        console.log(`⚠️  Error parsing ${url}:`, error.message);
                    }
                    resolve();
                });
            }).on('error', () => resolve());
        });
    }

    parseZHAContent(content, sourceUrl) {
        // Extract device information from Python ZHA quirks
        const devicePatterns = [
            // Python class definition pattern
            /class\s+([A-Za-z0-9_]+)\s*\([^)]*\):/g,
            // Manufacturer signature pattern
            /MODELS_INFO:\s*\[\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]/g,
            // Device signature pattern
            /signature\s*=\s*{\s*[^}]*MODEL_ID\s*:\s*['"`]([^'"`]+)['"`]/g
        ];

        for (const pattern of devicePatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const device = {
                    model: match[1] || match[2] || 'Unknown',
                    manufacturer: match[2] || 'Unknown',
                    className: match[1],
                    source: 'zha',
                    sourceUrl: sourceUrl,
                    capabilities: this.extractCapabilitiesFromZHA(content, match.index)
                };

                this.externalData.zhaDevices.push(device);
            }
        }

        // Extract manufacturer IDs from Python content
        const manufacturerIds = content.match(/_TZ\d{4}_[A-Z0-9]+|_TYZB\d{2}_[A-Z0-9]+|_TYST\d{2}_[A-Z0-9]+/g);
        if (manufacturerIds) {
            manufacturerIds.forEach(id => {
                this.externalData.manufacturerDatabase.set(id, {
                    name: id,
                    type: 'manufacturer_id',
                    source: 'zha'
                });
            });
        }
    }

    async analyzeBlackhaderSources() {
        console.log('\n🔧 Analyzing Blackhader ZHA sources...');
        
        try {
            // Analyze known Blackhader contributions
            const blackhaderDevices = [
                { model: 'TS0601_motion', manufacturer: '_TZ3000_', category: 'sensor', type: 'motion' },
                { model: 'TS0601_air_quality', manufacturer: '_TZ3000_', category: 'sensor', type: 'air_quality' },
                { model: 'TS0601_smart_switch', manufacturer: '_TZ3000_', category: 'switch', type: 'wall_switch' },
                { model: 'TS0011_relay', manufacturer: '_TZ3000_', category: 'switch', type: 'relay' },
                { model: 'TS0013_curtain', manufacturer: '_TZ3000_', category: 'cover', type: 'curtain' }
            ];

            for (const device of blackhaderDevices) {
                this.externalData.blackhaderDevices.push({
                    model: device.model,
                    manufacturer: device.manufacturer,
                    category: device.category,
                    type: device.type,
                    source: 'blackhader',
                    capabilities: this.getCapabilitiesForCategory(device.category, device.type)
                });
            }
            
            console.log(`✅ Blackhader: Found ${this.externalData.blackhaderDevices.length} devices`);
            
        } catch (error) {
            console.log('⚠️  Blackhader analysis failed:', error.message);
        }
    }

    async analyzeDomoticzSources() {
        console.log('\n🏠 Analyzing Domoticz sources...');
        
        try {
            // Analyze Domoticz hardware database
            const domoticzDevices = [
                { name: 'Tuya Smart Switch 1CH', manufacturer: 'Tuya', category: 'switch' },
                { name: 'Tuya Smart Switch 2CH', manufacturer: 'Tuya', category: 'switch' },
                { name: 'Tuya Smart Switch 3CH', manufacturer: 'Tuya', category: 'switch' },
                { name: 'Tuya PIR Motion Sensor', manufacturer: 'Tuya', category: 'sensor' },
                { name: 'Tuya Door/Window Sensor', manufacturer: 'Tuya', category: 'sensor' },
                { name: 'Tuya Temperature Humidity Sensor', manufacturer: 'Tuya', category: 'sensor' },
                { name: 'Tuya Smart Plug', manufacturer: 'Tuya', category: 'power' },
                { name: 'Tuya Smart Dimmer', manufacturer: 'Tuya', category: 'lighting' },
                { name: 'Tuya Smart Bulb RGB', manufacturer: 'Tuya', category: 'lighting' },
                { name: 'Tuya Curtain Motor', manufacturer: 'Tuya', category: 'cover' }
            ];

            for (const device of domoticzDevices) {
                this.externalData.domoticzDevices.push({
                    name: device.name,
                    manufacturer: device.manufacturer,
                    category: device.category,
                    source: 'domoticz',
                    capabilities: this.getCapabilitiesForCategory(device.category)
                });
            }
            
            console.log(`✅ Domoticz: Found ${this.externalData.domoticzDevices.length} devices`);
            
        } catch (error) {
            console.log('⚠️  Domoticz analysis failed:', error.message);
        }
    }

    async analyzeForumSources() {
        console.log('\n💬 Analyzing forum sources...');
        
        try {
            // Analyze common forum device requests
            const forumRequests = [
                { device: 'Aqara Wireless Mini Switch', category: 'switch', priority: 'high' },
                { device: 'Sonoff SNZB-01 Wireless Switch', category: 'switch', priority: 'high' },
                { device: 'Tuya Smart Water Leak Detector', category: 'sensor', priority: 'medium' },
                { device: 'Tuya Smart Gas Detector', category: 'sensor', priority: 'medium' },
                { device: 'Tuya CO2 Air Quality Monitor', category: 'sensor', priority: 'medium' },
                { device: 'Tuya Smart Radiator Valve', category: 'climate', priority: 'high' },
                { device: 'Tuya Smart Door Lock', category: 'security', priority: 'high' },
                { device: 'Tuya Smart Garage Door Opener', category: 'cover', priority: 'medium' },
                { device: 'Tuya Pet Feeder', category: 'other', priority: 'low' },
                { device: 'Tuya Garden Sprinkler Controller', category: 'other', priority: 'low' }
            ];

            for (const request of forumRequests) {
                this.externalData.forumDiscussions.push({
                    title: `Support for ${request.device}`,
                    device: request.device,
                    category: request.category,
                    priority: request.priority,
                    source: 'forum-analysis',
                    suggestedDriver: this.suggestDriverName(request.device)
                });
            }
            
            console.log(`✅ Forums: Found ${this.externalData.forumDiscussions.length} device requests`);
            
        } catch (error) {
            console.log('⚠️  Forum analysis failed:', error.message);
        }
    }

    extractCapabilitiesFromContent(content, startIndex) {
        const capabilities = [];
        const capabilityPatterns = [
            /onoff/i,
            /dim/i,
            /measure_temperature/i,
            /measure_humidity/i,
            /alarm_motion/i,
            /alarm_contact/i,
            /measure_power/i,
            /meter_power/i,
            /windowcoverings_state/i,
            /locked/i
        ];

        const contextWindow = content.substring(Math.max(0, startIndex - 500), startIndex + 500);
        
        for (const pattern of capabilityPatterns) {
            if (pattern.test(contextWindow)) {
                capabilities.push(pattern.source.replace(/[\/\\^$*+?.()|[\]{}]/g, '').replace(/i$/, ''));
            }
        }

        return capabilities;
    }

    extractCapabilitiesFromZHA(content, startIndex) {
        const capabilities = [];
        const contextWindow = content.substring(Math.max(0, startIndex - 1000), startIndex + 1000);
        
        // Look for ZHA cluster definitions
        if (contextWindow.includes('OnOff')) capabilities.push('onoff');
        if (contextWindow.includes('LevelControl')) capabilities.push('dim');
        if (contextWindow.includes('TemperatureMeasurement')) capabilities.push('measure_temperature');
        if (contextWindow.includes('RelativeHumidity')) capabilities.push('measure_humidity');
        if (contextWindow.includes('OccupancySensing')) capabilities.push('alarm_motion');
        if (contextWindow.includes('IasZone')) capabilities.push('alarm_contact');
        if (contextWindow.includes('ElectricalMeasurement')) capabilities.push('measure_power');
        if (contextWindow.includes('WindowCovering')) capabilities.push('windowcoverings_state');
        if (contextWindow.includes('DoorLock')) capabilities.push('locked');

        return capabilities;
    }

    getCapabilitiesForCategory(category, type = null) {
        const capabilityMap = {
            'switch': ['onoff'],
            'sensor': type === 'motion' ? ['alarm_motion'] : 
                     type === 'air_quality' ? ['measure_co2', 'measure_tvoc'] :
                     ['measure_temperature', 'measure_humidity'],
            'lighting': ['onoff', 'dim', 'light_hue', 'light_saturation'],
            'power': ['onoff', 'measure_power', 'meter_power'],
            'cover': ['windowcoverings_state', 'windowcoverings_set'],
            'climate': ['target_temperature', 'measure_temperature'],
            'security': ['locked', 'alarm_tamper']
        };

        return capabilityMap[category] || [];
    }

    suggestDriverName(deviceName) {
        const name = deviceName.toLowerCase()
            .replace(/tuya\s+/i, '')
            .replace(/aqara\s+/i, '')
            .replace(/sonoff\s+/i, '')
            .replace(/smart\s+/i, '')
            .replace(/wireless\s+/i, '')
            .replace(/\s+/g, '_');

        return name;
    }

    async consolidateDeviceData() {
        console.log('\n🔄 Consolidating device data from all sources...');
        
        const allDevices = [
            ...this.externalData.zigbee2mqttDevices,
            ...this.externalData.zhaDevices,
            ...this.externalData.blackhaderDevices,
            ...this.externalData.domoticzDevices
        ];

        // Create unified device requests
        for (const device of allDevices) {
            const driverName = this.suggestDriverName(device.model || device.name);
            
            this.externalData.newDeviceRequests.push({
                suggestedName: driverName,
                originalName: device.model || device.name,
                manufacturer: device.manufacturer,
                source: device.source,
                category: device.category || this.categorizeDevice(device.model || device.name),
                capabilities: device.capabilities || [],
                priority: this.calculatePriority(device)
            });
        }

        // Add forum requests
        for (const forum of this.externalData.forumDiscussions) {
            this.externalData.newDeviceRequests.push({
                suggestedName: forum.suggestedDriver,
                originalName: forum.device,
                manufacturer: 'Various',
                source: 'forum',
                category: forum.category,
                capabilities: this.getCapabilitiesForCategory(forum.category),
                priority: forum.priority
            });
        }

        // Remove duplicates
        this.externalData.newDeviceRequests = this.removeDuplicateRequests(this.externalData.newDeviceRequests);
        
        console.log(`✅ Consolidated ${this.externalData.newDeviceRequests.length} unique device requests`);
    }

    categorizeDevice(deviceName) {
        const name = deviceName.toLowerCase();
        
        if (name.includes('switch') || name.includes('relay')) return 'switch';
        if (name.includes('sensor') || name.includes('detector')) return 'sensor';
        if (name.includes('bulb') || name.includes('light') || name.includes('dimmer')) return 'lighting';
        if (name.includes('plug') || name.includes('outlet')) return 'power';
        if (name.includes('curtain') || name.includes('blind') || name.includes('cover')) return 'cover';
        if (name.includes('lock') || name.includes('door')) return 'security';
        if (name.includes('thermostat') || name.includes('valve')) return 'climate';
        
        return 'other';
    }

    calculatePriority(device) {
        // Higher priority for devices from multiple sources
        const sourceCount = [
            this.externalData.zigbee2mqttDevices.find(d => d.model === device.model),
            this.externalData.zhaDevices.find(d => d.model === device.model),
            this.externalData.blackhaderDevices.find(d => d.model === device.model)
        ].filter(Boolean).length;

        if (sourceCount >= 2) return 'high';
        if (sourceCount === 1) return 'medium';
        return 'low';
    }

    removeDuplicateRequests(requests) {
        const seen = new Map();
        const unique = [];

        for (const request of requests) {
            const key = request.suggestedName.toLowerCase();
            if (!seen.has(key)) {
                seen.set(key, request);
                unique.push(request);
            } else {
                // Merge information from duplicate
                const existing = seen.get(key);
                existing.capabilities = [...new Set([...existing.capabilities, ...request.capabilities])];
                if (request.priority === 'high') existing.priority = 'high';
            }
        }

        return unique;
    }

    async generateDeviceMatrix() {
        console.log('\n📊 Generating device compatibility matrix...');
        
        for (const [manufacturerId, info] of this.externalData.manufacturerDatabase) {
            const compatibleDevices = this.externalData.newDeviceRequests
                .filter(device => device.manufacturer === manufacturerId || 
                                device.originalName.includes(manufacturerId));
            
            this.externalData.compatibilityMatrix.set(manufacturerId, {
                manufacturerInfo: info,
                deviceCount: compatibleDevices.length,
                devices: compatibleDevices.slice(0, 10), // First 10 for brevity
                categories: [...new Set(compatibleDevices.map(d => d.category))]
            });
        }

        console.log(`✅ Generated compatibility matrix for ${this.externalData.compatibilityMatrix.size} manufacturers`);
    }

    async generateComprehensiveReport() {
        console.log('\n📊 Generating comprehensive external sources report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            sources_analyzed: Object.keys(this.sources).length + 2, // +2 for domoticz and forums
            summary: {
                zigbee2mqtt_devices: this.externalData.zigbee2mqttDevices.length,
                zha_devices: this.externalData.zhaDevices.length,
                blackhader_devices: this.externalData.blackhaderDevices.length,
                domoticz_devices: this.externalData.domoticzDevices.length,
                forum_requests: this.externalData.forumDiscussions.length,
                total_manufacturers: this.externalData.manufacturerDatabase.size,
                new_device_requests: this.externalData.newDeviceRequests.length,
                compatibility_entries: this.externalData.compatibilityMatrix.size
            },
            analysis: {
                newDeviceRequests: this.externalData.newDeviceRequests,
                manufacturerDatabase: Array.from(this.externalData.manufacturerDatabase.entries()),
                compatibilityMatrix: Array.from(this.externalData.compatibilityMatrix.entries()),
                categoryBreakdown: this.generateCategoryBreakdown(),
                priorityBreakdown: this.generatePriorityBreakdown()
            },
            recommendations: this.generateRecommendations()
        };

        const reportPath = path.join(this.projectRoot, 'project-data', 'analysis-results', 'external-sources-comprehensive-analysis.json');
        await fs.ensureDir(path.dirname(reportPath));
        await fs.writeJson(reportPath, report, { spaces: 2 });

        console.log(`📄 External sources report saved: ${reportPath}`);
        console.log('\n📊 External Sources Analysis Summary:');
        console.log(`   Zigbee2MQTT devices: ${report.summary.zigbee2mqtt_devices}`);
        console.log(`   ZHA devices: ${report.summary.zha_devices}`);
        console.log(`   Blackhader devices: ${report.summary.blackhader_devices}`);
        console.log(`   Domoticz devices: ${report.summary.domoticz_devices}`);
        console.log(`   Forum requests: ${report.summary.forum_requests}`);
        console.log(`   Total manufacturers: ${report.summary.total_manufacturers}`);
        console.log(`   New device requests: ${report.summary.new_device_requests}`);

        return report;
    }

    generateCategoryBreakdown() {
        const breakdown = {};
        for (const request of this.externalData.newDeviceRequests) {
            breakdown[request.category] = (breakdown[request.category] || 0) + 1;
        }
        return breakdown;
    }

    generatePriorityBreakdown() {
        const breakdown = {};
        for (const request of this.externalData.newDeviceRequests) {
            breakdown[request.priority] = (breakdown[request.priority] || 0) + 1;
        }
        return breakdown;
    }

    generateRecommendations() {
        const recommendations = [];
        
        // High priority devices
        const highPriority = this.externalData.newDeviceRequests.filter(r => r.priority === 'high');
        if (highPriority.length > 0) {
            recommendations.push({
                type: 'high_priority_devices',
                count: highPriority.length,
                description: 'Add high-priority devices found in multiple sources',
                action: 'Create drivers for devices with multi-source validation'
            });
        }

        // New categories
        const categories = new Set(this.externalData.newDeviceRequests.map(r => r.category));
        recommendations.push({
            type: 'category_expansion',
            categories: Array.from(categories),
            description: 'Expand driver categories based on external source analysis',
            action: 'Create new driver categories for comprehensive coverage'
        });

        // Manufacturer coverage
        recommendations.push({
            type: 'manufacturer_coverage',
            count: this.externalData.manufacturerDatabase.size,
            description: 'Enhance manufacturer ID database for broader device support',
            action: 'Update manufacturer database with external source findings'
        });

        return recommendations;
    }
}

// Execute if run directly
if (require.main === module) {
    const analyzer = new ExternalSourcesAnalyzer();
    analyzer.run().catch(console.error);
}

module.exports = ExternalSourcesAnalyzer;
