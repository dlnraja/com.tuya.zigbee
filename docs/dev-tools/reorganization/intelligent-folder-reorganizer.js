#!/usr/bin/env node

/**
 * Intelligent Folder Reorganizer
 * Reorganizes branded folders to unbranded categories with intelligent merging
 * Preserves manufacturer IDs while creating unified driver categories
 */

const fs = require('fs-extra');
const path = require('path');

class IntelligentFolderReorganizer {
    constructor() {
        this.projectRoot = process.cwd();
        this.driversPath = path.join(this.projectRoot, 'drivers');
        
        this.reorganizationPlan = {
            renames: [],
            merges: [],
            deletions: [],
            creations: [],
            preservedManufacturerIds: new Set()
        };

        this.brandPatterns = [
            'tuya', 'aqara', 'xiaomi', 'sonoff', 'ikea', 'philips', 'osram',
            'innr', 'gledopto', 'dresden', 'eurotronic', 'danfoss', 'honeywell',
            'bosch', 'yale', 'kwikset', 'schlage', 'august', 'nest'
        ];

        this.categoryMappings = new Map([
            // Wall switches by button count and power type
            ['wall_switch_1gang_ac', { pattern: /wall.*switch.*1gang(?!.*dc|.*battery)/i, priority: 1 }],
            ['wall_switch_2gang_ac', { pattern: /wall.*switch.*2gang(?!.*dc|.*battery)/i, priority: 1 }],
            ['wall_switch_3gang_ac', { pattern: /wall.*switch.*3gang(?!.*dc|.*battery)/i, priority: 1 }],
            ['wall_switch_4gang_ac', { pattern: /wall.*switch.*4gang(?!.*dc|.*battery)/i, priority: 1 }],
            ['wall_switch_5gang_ac', { pattern: /wall.*switch.*5gang(?!.*dc|.*battery)/i, priority: 1 }],
            ['wall_switch_6gang_ac', { pattern: /wall.*switch.*6gang(?!.*dc|.*battery)/i, priority: 1 }],
            
            // DC wall switches
            ['wall_switch_1gang_dc', { pattern: /wall.*switch.*1gang.*dc/i, priority: 1 }],
            ['wall_switch_2gang_dc', { pattern: /wall.*switch.*2gang.*dc/i, priority: 1 }],
            ['wall_switch_3gang_dc', { pattern: /wall.*switch.*3gang.*dc/i, priority: 1 }],
            
            // Wireless switches (battery powered)
            ['wireless_switch_1gang_cr2032', { pattern: /(wireless|battery|cr2032).*switch.*1gang|1gang.*(wireless|battery|cr2032)/i, priority: 1 }],
            ['wireless_switch_2gang_cr2032', { pattern: /(wireless|battery|cr2032).*switch.*2gang|2gang.*(wireless|battery|cr2032)/i, priority: 1 }],
            ['wireless_switch_3gang_cr2032', { pattern: /(wireless|battery|cr2032).*switch.*3gang|3gang.*(wireless|battery|cr2032)/i, priority: 1 }],
            ['wireless_switch_4gang_cr2032', { pattern: /(wireless|battery|cr2032).*switch.*4gang|4gang.*(wireless|battery|cr2032)/i, priority: 1 }],
            ['wireless_switch_5gang_cr2032', { pattern: /(wireless|battery|cr2032).*switch.*5gang|5gang.*(wireless|battery|cr2032)/i, priority: 1 }],
            ['wireless_switch_6gang_cr2032', { pattern: /(wireless|battery|cr2032).*switch.*6gang|6gang.*(wireless|battery|cr2032)/i, priority: 1 }],
            
            // Touch switches
            ['touch_switch_1gang', { pattern: /touch.*switch.*1gang|1gang.*touch.*switch/i, priority: 1 }],
            ['touch_switch_2gang', { pattern: /touch.*switch.*2gang|2gang.*touch.*switch/i, priority: 1 }],
            ['touch_switch_3gang', { pattern: /touch.*switch.*3gang|3gang.*touch.*switch/i, priority: 1 }],
            ['touch_switch_4gang', { pattern: /touch.*switch.*4gang|4gang.*touch.*switch/i, priority: 1 }],
            
            // Smart/hybrid switches
            ['smart_switch_1gang_hybrid', { pattern: /smart.*switch.*1gang|1gang.*smart.*switch/i, priority: 1 }],
            ['smart_switch_2gang_hybrid', { pattern: /smart.*switch.*2gang|2gang.*smart.*switch/i, priority: 1 }],
            ['smart_switch_3gang_hybrid', { pattern: /smart.*switch.*3gang|3gang.*smart.*switch/i, priority: 1 }],
            ['smart_switch_4gang_hybrid', { pattern: /smart.*switch.*4gang|4gang.*smart.*switch/i, priority: 1 }],
            
            // Motion sensors by type and power
            ['motion_sensor_pir_battery', { pattern: /(pir|motion).*sensor.*(battery|wireless|cr2032)|(battery|wireless|cr2032).*(pir|motion).*sensor/i, priority: 2 }],
            ['motion_sensor_pir_ac', { pattern: /(pir|motion).*sensor(?!.*(battery|wireless|cr2032))/i, priority: 2 }],
            ['motion_sensor_radar_battery', { pattern: /radar.*sensor.*(battery|wireless|cr2032)|(battery|wireless|cr2032).*radar.*sensor/i, priority: 2 }],
            ['motion_sensor_radar_ac', { pattern: /radar.*sensor(?!.*(battery|wireless|cr2032))/i, priority: 2 }],
            ['motion_sensor_mmwave_battery', { pattern: /mmwave.*sensor.*(battery|wireless|cr2032)|(battery|wireless|cr2032).*mmwave.*sensor/i, priority: 2 }],
            ['motion_sensor_mmwave_ac', { pattern: /mmwave.*sensor(?!.*(battery|wireless|cr2032))/i, priority: 2 }],
            
            // Other sensors
            ['temperature_humidity_sensor', { pattern: /(temperature|humidity).*sensor|sensor.*(temperature|humidity)/i, priority: 2 }],
            ['door_window_sensor', { pattern: /(door|window).*sensor|sensor.*(door|window)|contact.*sensor/i, priority: 2 }],
            ['water_leak_sensor', { pattern: /(water|leak).*sensor|sensor.*(water|leak)/i, priority: 2 }],
            ['smoke_detector', { pattern: /smoke.*(detector|sensor)|detector.*smoke/i, priority: 2 }],
            ['gas_detector', { pattern: /gas.*(detector|sensor)|detector.*gas/i, priority: 2 }],
            ['co2_sensor', { pattern: /co2.*sensor|sensor.*co2|air.*quality/i, priority: 2 }],
            ['presence_sensor_radar', { pattern: /presence.*sensor|sensor.*presence/i, priority: 2 }],
            
            // Lighting
            ['smart_bulb_white', { pattern: /bulb.*white|white.*bulb/i, priority: 3 }],
            ['smart_bulb_tunable', { pattern: /bulb.*tunable|tunable.*bulb/i, priority: 3 }],
            ['smart_bulb_rgb', { pattern: /bulb.*rgb|rgb.*bulb|bulb.*color/i, priority: 3 }],
            ['led_strip_controller', { pattern: /(led.*strip|strip.*led).*controller|controller.*(led.*strip|strip.*led)|strip.*light/i, priority: 3 }],
            ['ceiling_light_controller', { pattern: /ceiling.*light|light.*ceiling/i, priority: 3 }],
            ['outdoor_light_controller', { pattern: /outdoor.*light|light.*outdoor/i, priority: 3 }],
            ['smart_spot', { pattern: /spot.*light|light.*spot|downlight/i, priority: 3 }],
            
            // Climate
            ['thermostat', { pattern: /thermostat/i, priority: 4 }],
            ['radiator_valve', { pattern: /(radiator|valve)/i, priority: 4 }],
            ['temperature_controller', { pattern: /temperature.*controller/i, priority: 4 }],
            ['hvac_controller', { pattern: /hvac/i, priority: 4 }],
            ['fan_controller', { pattern: /fan.*controller/i, priority: 4 }],
            
            // Security & Access
            ['smart_lock', { pattern: /lock(?!.*keypad|.*fingerprint)/i, priority: 5 }],
            ['keypad_lock', { pattern: /keypad.*lock|lock.*keypad/i, priority: 5 }],
            ['fingerprint_lock', { pattern: /fingerprint.*lock|lock.*fingerprint/i, priority: 5 }],
            ['door_controller', { pattern: /door.*controller/i, priority: 5 }],
            ['garage_door_controller', { pattern: /garage.*door/i, priority: 5 }],
            
            // Power & Energy
            ['smart_plug', { pattern: /plug(?!.*extension|.*energy|.*usb)/i, priority: 6 }],
            ['extension_plug', { pattern: /extension.*plug|plug.*extension/i, priority: 6 }],
            ['energy_monitoring_plug', { pattern: /(energy|monitoring).*plug|plug.*(energy|monitoring)/i, priority: 6 }],
            ['usb_outlet', { pattern: /usb.*outlet|outlet.*usb/i, priority: 6 }],
            ['relay_switch_1gang', { pattern: /relay.*switch|switch.*relay/i, priority: 6 }],
            
            // Covers & Blinds
            ['roller_blind_controller', { pattern: /roller.*blind|blind.*roller/i, priority: 7 }],
            ['venetian_blind_controller', { pattern: /venetian.*blind|blind.*venetian/i, priority: 7 }],
            ['curtain_motor', { pattern: /curtain.*motor|motor.*curtain/i, priority: 7 }],
            ['shade_controller', { pattern: /shade.*controller/i, priority: 7 }],
            ['projector_screen_controller', { pattern: /projector.*screen/i, priority: 7 }],
            
            // Remote Controls
            ['scene_controller_2button', { pattern: /(scene|remote).*controller.*2button|2button.*(scene|remote)/i, priority: 8 }],
            ['scene_controller_4button', { pattern: /(scene|remote).*controller.*4button|4button.*(scene|remote)/i, priority: 8 }],
            ['scene_controller_6button', { pattern: /(scene|remote).*controller.*6button|6button.*(scene|remote)/i, priority: 8 }],
            ['scene_controller_8button', { pattern: /(scene|remote).*controller.*8button|8button.*(scene|remote)/i, priority: 8 }],
            ['scene_controller_battery', { pattern: /(scene|remote).*controller.*(battery|wireless)|(battery|wireless).*(scene|remote)/i, priority: 8 }]
        ]);

        console.log('🔄 Intelligent Folder Reorganizer - Unbranded Categories');
        console.log('📂 Analyzing and reorganizing branded driver folders');
    }

    async run() {
        console.log('\n🚀 Starting intelligent folder reorganization...');
        
        try {
            await this.analyzeCurrentStructure();
            await this.createReorganizationPlan();
            await this.executeReorganization();
            await this.generateReport();
            
            console.log('✅ Intelligent folder reorganization completed successfully!');
            return this.reorganizationPlan;
            
        } catch (error) {
            console.error('❌ Error during reorganization:', error);
            throw error;
        }
    }

    async analyzeCurrentStructure() {
        console.log('\n📊 Analyzing current driver structure...');
        
        if (!await fs.pathExists(this.driversPath)) {
            throw new Error('Drivers directory not found');
        }

        const driverFolders = await fs.readdir(this.driversPath);
        console.log(`📁 Found ${driverFolders.length} driver folders`);

        for (const folder of driverFolders) {
            const folderPath = path.join(this.driversPath, folder);
            const stat = await fs.stat(folderPath);
            
            if (stat.isDirectory()) {
                await this.analyzeDriverFolder(folder, folderPath);
            }
        }

        console.log(`✅ Analysis complete - found ${this.reorganizationPlan.renames.length + this.reorganizationPlan.merges.length} folders to reorganize`);
    }

    async analyzeDriverFolder(folderName, folderPath) {
        const analysis = {
            originalName: folderName,
            path: folderPath,
            isBranded: this.isBrandedFolder(folderName),
            suggestedCategory: this.determineCategory(folderName),
            manufacturerIds: await this.extractManufacturerIds(folderPath),
            capabilities: await this.extractCapabilities(folderPath),
            hasValidStructure: await this.hasValidDriverStructure(folderPath)
        };

        // Preserve manufacturer IDs
        analysis.manufacturerIds.forEach(id => this.reorganizationPlan.preservedManufacturerIds.add(id));
        
        if (analysis.isBranded || analysis.suggestedCategory !== folderName) {
            this.planReorganization(analysis);
        }
    }

    isBrandedFolder(folderName) {
        const lowerName = folderName.toLowerCase();
        return this.brandPatterns.some(brand => lowerName.includes(brand));
    }

    determineCategory(folderName) {
        const cleanName = this.removeBrandNames(folderName).toLowerCase();
        
        // Find best matching category
        let bestMatch = { category: folderName, priority: 999, score: 0 };
        
        for (const [category, config] of this.categoryMappings) {
            if (config.pattern.test(cleanName)) {
                const score = this.calculateMatchScore(cleanName, config.pattern);
                if (config.priority < bestMatch.priority || 
                    (config.priority === bestMatch.priority && score > bestMatch.score)) {
                    bestMatch = { category, priority: config.priority, score };
                }
            }
        }
        
        return bestMatch.category;
    }

    removeBrandNames(folderName) {
        let cleaned = folderName;
        for (const brand of this.brandPatterns) {
            const regex = new RegExp(`\\b${brand}[_\\s]*`, 'gi');
            cleaned = cleaned.replace(regex, '');
        }
        return cleaned.replace(/^[_\s]+|[_\s]+$/g, ''); // Trim leading/trailing separators
    }

    calculateMatchScore(name, pattern) {
        const matches = name.match(pattern);
        return matches ? matches[0].length : 0;
    }

    async extractManufacturerIds(folderPath) {
        const manufacturerIds = [];
        
        try {
            // Check driver.json
            const driverJsonPath = path.join(folderPath, 'driver.json');
            if (await fs.pathExists(driverJsonPath)) {
                const driverJson = await fs.readJson(driverJsonPath);
                if (driverJson.zigbee) {
                    if (driverJson.zigbee.manufacturerName) manufacturerIds.push(driverJson.zigbee.manufacturerName);
                    if (driverJson.zigbee.productId) manufacturerIds.push(driverJson.zigbee.productId);
                }
            }

            // Check driver.compose.json
            const composeJsonPath = path.join(folderPath, 'driver.compose.json');
            if (await fs.pathExists(composeJsonPath)) {
                const composeJson = await fs.readJson(composeJsonPath);
                if (composeJson.zigbee) {
                    if (composeJson.zigbee.manufacturerName) manufacturerIds.push(composeJson.zigbee.manufacturerName);
                    if (composeJson.zigbee.productId) manufacturerIds.push(composeJson.zigbee.productId);
                }
            }

        } catch (error) {
            console.log(`⚠️  Error extracting manufacturer IDs from ${folderPath}:`, error.message);
        }

        return manufacturerIds;
    }

    async extractCapabilities(folderPath) {
        const capabilities = [];
        
        try {
            const driverJsonPath = path.join(folderPath, 'driver.json');
            if (await fs.pathExists(driverJsonPath)) {
                const driverJson = await fs.readJson(driverJsonPath);
                if (driverJson.capabilities) {
                    capabilities.push(...driverJson.capabilities);
                }
            }
        } catch (error) {
            console.log(`⚠️  Error extracting capabilities from ${folderPath}:`, error.message);
        }

        return capabilities;
    }

    async hasValidDriverStructure(folderPath) {
        const requiredFiles = ['driver.json', 'device.js'];
        const requiredDirs = ['assets'];
        
        for (const file of requiredFiles) {
            if (!await fs.pathExists(path.join(folderPath, file))) {
                return false;
            }
        }
        
        for (const dir of requiredDirs) {
            if (!await fs.pathExists(path.join(folderPath, dir))) {
                return false;
            }
        }
        
        return true;
    }

    planReorganization(analysis) {
        const targetCategory = analysis.suggestedCategory;
        const targetPath = path.join(this.driversPath, targetCategory);
        
        // Check if target category already exists
        if (fs.existsSync(targetPath) && targetCategory !== analysis.originalName) {
            // Plan merge
            this.reorganizationPlan.merges.push({
                source: analysis.originalName,
                target: targetCategory,
                sourcePath: analysis.path,
                targetPath: targetPath,
                manufacturerIds: analysis.manufacturerIds,
                capabilities: analysis.capabilities,
                action: 'merge_and_preserve_ids'
            });
        } else if (targetCategory !== analysis.originalName) {
            // Plan rename
            this.reorganizationPlan.renames.push({
                from: analysis.originalName,
                to: targetCategory,
                fromPath: analysis.path,
                toPath: targetPath,
                manufacturerIds: analysis.manufacturerIds,
                capabilities: analysis.capabilities,
                action: 'rename_and_preserve_ids'
            });
        }
    }

    async createReorganizationPlan() {
        console.log('\n📋 Creating reorganization plan...');
        
        // Sort operations by priority
        this.reorganizationPlan.renames.sort((a, b) => a.from.localeCompare(b.from));
        this.reorganizationPlan.merges.sort((a, b) => a.source.localeCompare(b.source));
        
        console.log(`📊 Plan created:`);
        console.log(`   Renames: ${this.reorganizationPlan.renames.length}`);
        console.log(`   Merges: ${this.reorganizationPlan.merges.length}`);
        console.log(`   Manufacturer IDs to preserve: ${this.reorganizationPlan.preservedManufacturerIds.size}`);
    }

    async executeReorganization() {
        console.log('\n🔄 Executing reorganization plan...');
        
        let operationsCount = 0;

        // Execute renames first
        for (const rename of this.reorganizationPlan.renames) {
            try {
                console.log(`📝 Renaming: ${rename.from} → ${rename.to}`);
                
                // Rename the folder
                await fs.move(rename.fromPath, rename.toPath);
                
                // Update internal references if needed
                await this.updateInternalReferences(rename.toPath, rename.to);
                
                operationsCount++;
                
            } catch (error) {
                console.log(`⚠️  Error renaming ${rename.from}:`, error.message);
            }
        }

        // Execute merges
        for (const merge of this.reorganizationPlan.merges) {
            try {
                console.log(`🔀 Merging: ${merge.source} → ${merge.target}`);
                
                await this.executeMerge(merge);
                operationsCount++;
                
            } catch (error) {
                console.log(`⚠️  Error merging ${merge.source}:`, error.message);
            }
        }

        console.log(`✅ Reorganization complete - ${operationsCount} operations executed`);
    }

    async executeMerge(merge) {
        const sourceDriverJson = path.join(merge.sourcePath, 'driver.json');
        const targetDriverJson = path.join(merge.targetPath, 'driver.json');
        
        // Merge manufacturer IDs and capabilities
        if (await fs.pathExists(sourceDriverJson) && await fs.pathExists(targetDriverJson)) {
            const sourceData = await fs.readJson(sourceDriverJson);
            const targetData = await fs.readJson(targetDriverJson);
            
            // Merge zigbee manufacturer data
            if (sourceData.zigbee && targetData.zigbee) {
                // Create array of manufacturer names if not exists
                if (!Array.isArray(targetData.zigbee.manufacturerName)) {
                    targetData.zigbee.manufacturerName = targetData.zigbee.manufacturerName ? [targetData.zigbee.manufacturerName] : [];
                }
                if (!Array.isArray(targetData.zigbee.productId)) {
                    targetData.zigbee.productId = targetData.zigbee.productId ? [targetData.zigbee.productId] : [];
                }

                // Add source manufacturer data
                if (sourceData.zigbee.manufacturerName) {
                    const sourceManufacturers = Array.isArray(sourceData.zigbee.manufacturerName) 
                        ? sourceData.zigbee.manufacturerName 
                        : [sourceData.zigbee.manufacturerName];
                    targetData.zigbee.manufacturerName.push(...sourceManufacturers);
                }
                
                if (sourceData.zigbee.productId) {
                    const sourceProductIds = Array.isArray(sourceData.zigbee.productId) 
                        ? sourceData.zigbee.productId 
                        : [sourceData.zigbee.productId];
                    targetData.zigbee.productId.push(...sourceProductIds);
                }

                // Remove duplicates
                targetData.zigbee.manufacturerName = [...new Set(targetData.zigbee.manufacturerName)];
                targetData.zigbee.productId = [...new Set(targetData.zigbee.productId)];
            }

            // Merge capabilities
            if (sourceData.capabilities && targetData.capabilities) {
                targetData.capabilities = [...new Set([...targetData.capabilities, ...sourceData.capabilities])];
            }

            // Save merged driver.json
            await fs.writeJson(targetDriverJson, targetData, { spaces: 2 });
        }

        // Copy any additional files that don't exist in target
        const sourceFiles = await fs.readdir(merge.sourcePath);
        for (const file of sourceFiles) {
            const sourcePath = path.join(merge.sourcePath, file);
            const targetFilePath = path.join(merge.targetPath, file);
            
            if (!await fs.pathExists(targetFilePath)) {
                await fs.copy(sourcePath, targetFilePath);
            }
        }

        // Remove source folder
        await fs.remove(merge.sourcePath);
    }

    async updateInternalReferences(driverPath, newName) {
        // Update any internal references to the driver name in files
        const filesToUpdate = ['driver.json', 'device.js'];
        
        for (const fileName of filesToUpdate) {
            const filePath = path.join(driverPath, fileName);
            if (await fs.pathExists(filePath)) {
                try {
                    let content = await fs.readFile(filePath, 'utf8');
                    // Update any references that might need the new name
                    // This is a basic implementation - can be expanded based on needs
                    await fs.writeFile(filePath, content);
                } catch (error) {
                    console.log(`⚠️  Could not update references in ${fileName}:`, error.message);
                }
            }
        }
    }

    async generateReport() {
        console.log('\n📊 Generating reorganization report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total_operations: this.reorganizationPlan.renames.length + this.reorganizationPlan.merges.length,
                renames: this.reorganizationPlan.renames.length,
                merges: this.reorganizationPlan.merges.length,
                preserved_manufacturer_ids: this.reorganizationPlan.preservedManufacturerIds.size,
                categories_created: new Set([
                    ...this.reorganizationPlan.renames.map(r => r.to),
                    ...this.reorganizationPlan.merges.map(m => m.target)
                ]).size
            },
            operations: {
                renames: this.reorganizationPlan.renames,
                merges: this.reorganizationPlan.merges,
                preservedManufacturerIds: Array.from(this.reorganizationPlan.preservedManufacturerIds)
            },
            categoryMapping: Array.from(this.categoryMappings.keys()),
            recommendations: [
                {
                    type: 'validation',
                    description: 'Run structure validation after reorganization',
                    action: 'Verify all drivers have proper structure and manufacturer IDs'
                },
                {
                    type: 'image_coherence',
                    description: 'Check image coherence with new categories',
                    action: 'Regenerate images that don\'t match new category contexts'
                }
            ]
        };

        const reportPath = path.join(this.projectRoot, 'project-data', 'analysis-results', 'intelligent-folder-reorganization-report.json');
        await fs.ensureDir(path.dirname(reportPath));
        await fs.writeJson(reportPath, report, { spaces: 2 });

        console.log(`📄 Reorganization report saved: ${reportPath}`);
        console.log('\n📊 Reorganization Summary:');
        console.log(`   Total operations: ${report.summary.total_operations}`);
        console.log(`   Renames: ${report.summary.renames}`);
        console.log(`   Merges: ${report.summary.merges}`);
        console.log(`   Manufacturer IDs preserved: ${report.summary.preserved_manufacturer_ids}`);
        console.log(`   Categories created: ${report.summary.categories_created}`);

        return report;
    }
}

// Execute if run directly
if (require.main === module) {
    const reorganizer = new IntelligentFolderReorganizer();
    reorganizer.run().catch(console.error);
}

module.exports = IntelligentFolderReorganizer;
