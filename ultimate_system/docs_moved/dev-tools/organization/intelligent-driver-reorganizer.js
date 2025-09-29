#!/usr/bin/env node

/**
 * Intelligent Driver Reorganizer - Reorganizes drivers by logical types and themes
 * Ensures user-friendly categorization with proper naming and structure
 */

const fs = require('fs-extra');
const path = require('path');

class IntelligentDriverReorganizer {
    constructor() {
        this.projectRoot = process.cwd();
        this.reorganizedDrivers = [];
        
        // Logical categorization with user-friendly themes
        this.categoryMappings = {
            'motion_sensors': {
                keywords: ['motion', 'pir', 'presence', 'radar', 'human_presence'],
                displayName: 'Motion & Presence Detection',
                description: 'PIR sensors, radar detectors, presence sensors'
            },
            'environmental_sensors': {
                keywords: ['temperature', 'humidity', 'air_quality', 'soil', 'multisensor', 'thermo'],
                displayName: 'Environmental Monitoring', 
                description: 'Temperature, humidity, air quality, soil sensors'
            },
            'contact_security': {
                keywords: ['door', 'window', 'contact', 'vibration'],
                displayName: 'Contact & Security',
                description: 'Door/window sensors, contact detection'
            },
            'smart_lighting': {
                keywords: ['light', 'bulb', 'lamp', 'led', 'rgb', 'brightness'],
                displayName: 'Smart Lighting',
                description: 'Bulbs, LED strips, smart lights'
            },
            'switches_dimmers': {
                keywords: ['switch', 'dimmer', 'button', 'scene', 'gang', 'knob', 'rotary'],
                displayName: 'Switches & Dimmers',
                description: 'Wall switches, dimmers, scene controllers'
            },
            'power_energy': {
                keywords: ['plug', 'socket', 'energy', 'power', 'metering'],
                displayName: 'Power & Energy Management',
                description: 'Smart plugs, power monitoring, energy meters'
            },
            'safety_detection': {
                keywords: ['smoke', 'co', 'gas', 'leak', 'water', 'detector'],
                displayName: 'Safety & Detection',
                description: 'Smoke detectors, gas sensors, leak detection'
            },
            'climate_control': {
                keywords: ['thermostat', 'valve', 'fan', 'heater', 'climate'],
                displayName: 'Climate Control',
                description: 'Thermostats, radiator valves, fans'
            },
            'covers_access': {
                keywords: ['curtain', 'blind', 'cover', 'motor', 'garage'],
                displayName: 'Covers & Access Control',
                description: 'Curtains, blinds, garage doors'
            }
        };
    }

    async reorganizeAllDrivers() {
        console.log('🔄 Reorganizing drivers by logical types and themes...');
        
        await this.analyzeCurrentDrivers();
        await this.createNewCategoryStructure();
        await this.moveDriversToCategories();
        await this.updateDriverNames();
        await this.generateCategoryDocumentation();
        
        console.log(`✅ Reorganized ${this.reorganizedDrivers.length} drivers into logical categories`);
        return this.reorganizedDrivers;
    }

    async analyzeCurrentDrivers() {
        const driversDir = path.join(this.projectRoot, 'drivers');
        const currentCategories = await fs.readdir(driversDir);
        
        console.log('📊 Analyzing current driver structure...');
        
        for (const category of currentCategories) {
            const categoryPath = path.join(driversDir, category);
            const stat = await fs.stat(categoryPath);
            if (!stat.isDirectory()) continue;
            
            const drivers = await fs.readdir(categoryPath);
            
            for (const driver of drivers) {
                const driverPath = path.join(categoryPath, driver);
                const driverStat = await fs.stat(driverPath);
                if (!driverStat.isDirectory()) continue;
                
                const newCategory = this.categorizeDriver(driver);
                
                this.reorganizedDrivers.push({
                    originalCategory: category,
                    originalName: driver,
                    newCategory: newCategory,
                    cleanName: this.cleanDriverName(driver),
                    originalPath: driverPath
                });
            }
        }
        
        console.log(`   📋 Found ${this.reorganizedDrivers.length} drivers to reorganize`);
    }

    categorizeDriver(driverName) {
        const name = driverName.toLowerCase();
        
        // Score each category based on keyword matches
        let bestCategory = 'environmental_sensors'; // default
        let bestScore = 0;
        
        for (const [category, config] of Object.entries(this.categoryMappings)) {
            let score = 0;
            
            for (const keyword of config.keywords) {
                if (name.includes(keyword)) {
                    score += keyword.length; // Longer keywords get higher score
                }
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestCategory = category;
            }
        }
        
        return bestCategory;
    }

    cleanDriverName(originalName) {
        let cleaned = originalName;
        
        // Remove common prefixes/suffixes
        const prefixesToRemove = [
            'tuya_', 'moes_', 'zigbee_', 'smart_', 'device_request_',
            'enhanced_', 'intelligent_', 'mini_', 'wireless_'
        ];
        
        for (const prefix of prefixesToRemove) {
            if (cleaned.startsWith(prefix)) {
                cleaned = cleaned.substring(prefix.length);
            }
        }
        
        // Replace underscores with proper spacing for readability
        cleaned = cleaned.replace(/_/g, ' ');
        
        // Capitalize first letter of each word
        cleaned = cleaned.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        
        // Convert back to valid directory name
        cleaned = cleaned.toLowerCase().replace(/\s+/g, '_');
        
        return cleaned;
    }

    async createNewCategoryStructure() {
        console.log('📁 Creating new logical category structure...');
        
        const driversDir = path.join(this.projectRoot, 'drivers');
        
        for (const [category, config] of Object.entries(this.categoryMappings)) {
            const categoryPath = path.join(driversDir, category);
            await fs.ensureDir(categoryPath);
            
            // Create category README
            const readmeContent = `# ${config.displayName}

## Description
${config.description}

## Keywords
${config.keywords.join(', ')}

## Drivers in this Category
This category contains drivers that match the following patterns:
${config.keywords.map(k => `- Contains "${k}"`).join('\n')}

---
*Auto-generated category documentation*
*Last updated: ${new Date().toISOString()}*`;
            
            await fs.writeFile(
                path.join(categoryPath, 'README.md'),
                readmeContent
            );
            
            console.log(`   ✅ Created category: ${config.displayName}`);
        }
    }

    async moveDriversToCategories() {
        console.log('🚚 Moving drivers to logical categories...');
        
        const driversDir = path.join(this.projectRoot, 'drivers');
        
        for (const driver of this.reorganizedDrivers) {
            const newCategoryPath = path.join(driversDir, driver.newCategory);
            const newDriverPath = path.join(newCategoryPath, driver.cleanName);
            
            // Skip if already in correct location
            if (driver.originalPath === newDriverPath) {
                continue;
            }
            
            try {
                // Move driver to new location
                await fs.move(driver.originalPath, newDriverPath, { overwrite: true });
                
                // Update driver references
                await this.updateDriverReferences(driver, newDriverPath);
                
                console.log(`   📦 Moved: ${driver.originalName} → ${driver.newCategory}/${driver.cleanName}`);
                
            } catch (error) {
                console.log(`   ⚠️  Failed to move ${driver.originalName}: ${error.message}`);
            }
        }
    }

    async updateDriverReferences(driver, newPath) {
        // Update driver.compose.json with new ID and clean names
        const composeFile = path.join(newPath, 'driver.compose.json');
        
        if (await fs.pathExists(composeFile)) {
            const compose = await fs.readJson(composeFile);
            
            // Update driver ID to match new path structure  
            const newId = `${driver.newCategory}.${driver.cleanName}`;
            compose.id = newId;
            
            // Update display names to be user-friendly
            if (compose.name) {
                compose.name.en = this.generateUserFriendlyName(driver.cleanName);
            }
            
            await fs.writeJson(composeFile, compose, { spaces: 2 });
        }
        
        // Update any references in app.json drivers array
        await this.updateAppJsonReferences(driver);
    }

    generateUserFriendlyName(cleanName) {
        return cleanName
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    async updateAppJsonReferences(driver) {
        const appJsonPath = path.join(this.projectRoot, 'app.json');
        
        if (await fs.pathExists(appJsonPath)) {
            const appJson = await fs.readJson(appJsonPath);
            
            if (appJson.drivers) {
                // Find and update driver reference
                const driverRef = appJson.drivers.find(d => 
                    d.id && d.id.includes(driver.originalName)
                );
                
                if (driverRef) {
                    const newId = `${driver.newCategory}.${driver.cleanName}`;
                    driverRef.id = newId;
                    
                    await fs.writeJson(appJsonPath, appJson, { spaces: 2 });
                }
            }
        }
    }

    async updateDriverNames() {
        console.log('✏️  Updating driver names for consistency...');
        
        // Clean up old empty category directories
        const driversDir = path.join(this.projectRoot, 'drivers');
        const allItems = await fs.readdir(driversDir);
        
        for (const item of allItems) {
            const itemPath = path.join(driversDir, item);
            const stat = await fs.stat(itemPath);
            
            if (stat.isDirectory() && !this.categoryMappings[item]) {
                // Check if directory is empty
                const contents = await fs.readdir(itemPath);
                const nonReadmeContents = contents.filter(f => f !== 'README.md');
                
                if (nonReadmeContents.length === 0) {
                    await fs.remove(itemPath);
                    console.log(`   🗑️  Removed empty category: ${item}`);
                }
            }
        }
    }

    async generateCategoryDocumentation() {
        const docPath = path.join(this.projectRoot, 'documentation', 'categories');
        await fs.ensureDir(docPath);
        
        // Generate comprehensive category documentation
        const categoryDoc = `# Ultimate Zigbee Hub - Device Categories

## Logical Organization

The Ultimate Zigbee Hub organizes devices by **function and purpose** rather than by manufacturer brand. This ensures users can easily find devices based on what they want to accomplish.

## Categories

${Object.entries(this.categoryMappings).map(([id, config]) => `
### ${config.displayName}
**Directory:** \`drivers/${id}/\`
**Description:** ${config.description}
**Keywords:** ${config.keywords.join(', ')}

`).join('')}

## Benefits of This Organization

1. **User-Focused:** Find devices by what they do, not who made them
2. **Scalable:** Easy to add new devices to appropriate categories
3. **Consistent:** Predictable structure across all device types
4. **Professional:** Clean, unbranded organization following Johan Benz standards

## Driver Naming Convention

- **Clean Names:** Removed manufacturer prefixes (tuya_, moes_, etc.)
- **Descriptive:** Names describe function, not brand
- **Consistent:** Standardized naming across categories
- **User-Friendly:** Easy to understand and navigate

---
*Generated: ${new Date().toISOString()}*
*Categories: ${Object.keys(this.categoryMappings).length}*
*Drivers Reorganized: ${this.reorganizedDrivers.length}*`;

        await fs.writeFile(
            path.join(docPath, 'DEVICE_CATEGORIES.md'),
            categoryDoc
        );

        // Generate category matrix for reference
        const categoryMatrix = {
            timestamp: new Date().toISOString(),
            categories: this.categoryMappings,
            reorganized_drivers: this.reorganizedDrivers.length,
            driver_mappings: this.reorganizedDrivers
        };

        await fs.writeJson(
            path.join(this.projectRoot, 'project-data', 'matrices', 'category_matrix.json'),
            categoryMatrix,
            { spaces: 2 }
        );

        console.log('📚 Generated category documentation and matrices');
    }

    async generateReorganizationReport() {
        const report = {
            timestamp: new Date().toISOString(),
            total_drivers: this.reorganizedDrivers.length,
            categories_created: Object.keys(this.categoryMappings).length,
            reorganization_summary: {},
            benefits: [
                'User-focused organization by function',
                'Removed manufacturer branding from structure', 
                'Consistent naming conventions',
                'Scalable category system',
                'Professional Johan Benz compliant structure'
            ]
        };

        // Group by new category
        for (const driver of this.reorganizedDrivers) {
            if (!report.reorganization_summary[driver.newCategory]) {
                report.reorganization_summary[driver.newCategory] = [];
            }
            report.reorganization_summary[driver.newCategory].push({
                original_name: driver.originalName,
                clean_name: driver.cleanName,
                original_category: driver.originalCategory
            });
        }

        await fs.ensureDir(path.join(this.projectRoot, 'reports'));
        await fs.writeJson(
            path.join(this.projectRoot, 'reports', 'driver-reorganization-report.json'),
            report,
            { spaces: 2 }
        );

        console.log('\n📊 Reorganization Summary:');
        Object.entries(report.reorganization_summary).forEach(([category, drivers]) => {
            const config = this.categoryMappings[category];
            console.log(`   ${config.displayName}: ${drivers.length} drivers`);
        });
    }
}

// Execute if run directly
if (require.main === module) {
    const reorganizer = new IntelligentDriverReorganizer();
    reorganizer.reorganizeAllDrivers()
        .then(() => reorganizer.generateReorganizationReport())
        .catch(console.error);
}

module.exports = IntelligentDriverReorganizer;
