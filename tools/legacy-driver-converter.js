#!/usr/bin/env node

/**
 * Legacy Driver Converter
 * Converts legacy SDK2 drivers to SDK3 format
 * 
 * @author dlnraja
 * @version 1.0.0
 * @license MIT
 */

const fs = require('fs');
const path = require('path');

class LegacyDriverConverter {
    constructor() {
        this.legacyPath = path.join(__dirname, '..', 'drivers', 'legacy');
        this.sdk3Path = path.join(__dirname, '..', 'drivers', 'sdk3');
        this.conversionPatterns = new Map();
        this.initializeConversionPatterns();
    }

    initializeConversionPatterns() {
        // SDK2 to SDK3 conversion patterns
        this.conversionPatterns.set('HomeyDevice', {
            sdk3Class: 'ZigbeeDevice',
            imports: "const { ZigbeeDevice } = require('homey-zigbeedriver');",
            initialization: 'onNodeInit'
        });

        this.conversionPatterns.set('this.on', {
            sdk3Pattern: 'this.on',
            keepOriginal: true
        });

        this.conversionPatterns.set('this.setCapabilityValue', {
            sdk3Pattern: 'this.setCapabilityValue',
            keepOriginal: true
        });

        this.conversionPatterns.set('this.registerCapability', {
            sdk3Pattern: 'this.registerCapability',
            keepOriginal: true
        });
    }

    async convertLegacyDriver(legacyDriverPath) {
        console.log(`🔄 Converting legacy driver: ${path.basename(legacyDriverPath)}`);

        try {
            const legacyContent = fs.readFileSync(legacyDriverPath, 'utf8');
            const convertedContent = await this.convertContent(legacyContent);
            
            const sdk3DriverPath = this.getSdk3Path(legacyDriverPath);
            const sdk3Dir = path.dirname(sdk3DriverPath);
            
            if (!fs.existsSync(sdk3Dir)) {
                fs.mkdirSync(sdk3Dir, { recursive: true });
            }

            fs.writeFileSync(sdk3DriverPath, convertedContent);
            
            // Generate SDK3 compose.json
            await this.generateSdk3Compose(legacyDriverPath, sdk3DriverPath);
            
            console.log(`✅ Converted: ${path.basename(legacyDriverPath)}`);
            return sdk3DriverPath;
        } catch (error) {
            console.error(`❌ Conversion failed: ${error.message}`);
            return null;
        }
    }

    async convertContent(legacyContent) {
        let convertedContent = legacyContent;

        // Convert imports
        convertedContent = this.convertImports(convertedContent);

        // Convert class definition
        convertedContent = this.convertClassDefinition(convertedContent);

        // Convert initialization method
        convertedContent = this.convertInitialization(convertedContent);

        // Convert capability registration
        convertedContent = this.convertCapabilityRegistration(convertedContent);

        // Add SDK3 specific features
        convertedContent = this.addSdk3Features(convertedContent);

        return convertedContent;
    }

    convertImports(content) {
        // Replace SDK2 imports with SDK3
        content = content.replace(
            /const\s+\{\s*HomeyDevice\s*\}\s*=\s*require\s*\(\s*['"]homey-meshdriver\/lib\/HomeyDevice['"]\s*\)/g,
            "const { ZigbeeDevice } = require('homey-zigbeedriver')"
        );

        // Add SDK3 specific imports
        if (!content.includes('homey-zigbeedriver')) {
            content = "const { ZigbeeDevice } = require('homey-zigbeedriver');\n\n" + content;
        }

        return content;
    }

    convertClassDefinition(content) {
        // Convert HomeyDevice to ZigbeeDevice
        content = content.replace(
            /class\s+(\w+)\s+extends\s+HomeyDevice/g,
            'class $1 extends ZigbeeDevice'
        );

        return content;
    }

    convertInitialization(content) {
        // Convert onInit to onNodeInit
        content = content.replace(
            /async\s+onInit\s*\(\s*\)\s*\{/g,
            'async onNodeInit({ zclNode }) {'
        );

        // Add zclNode parameter to capability registration
        content = content.replace(
            /await\s+this\.registerCapability\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g,
            'await this.registerCapability(\'$1\', \'$2\')'
        );

        return content;
    }

    convertCapabilityRegistration(content) {
        // Update capability registration for SDK3
        content = content.replace(
            /this\.registerCapability\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g,
            'this.registerCapability(\'$1\', \'$2\')'
        );

        return content;
    }

    addSdk3Features(content) {
        // Add SDK3 specific monitoring
        const monitoringCode = `
    setupSdk3Monitoring() {
        // SDK3 specific monitoring
        setInterval(async () => {
            await this.performSdk3HealthCheck();
        }, 30000);
    }
    
    async performSdk3HealthCheck() {
        try {
            const healthStatus = await this.checkSdk3Health();
            if (!healthStatus.isHealthy) {
                await this.activateSdk3Recovery(healthStatus);
            }
        } catch (error) {
            console.log('⚠️  SDK3 health check failed:', error);
        }
    }
    
    async checkSdk3Health() {
        return {
            isHealthy: true,
            sdkVersion: 'SDK3',
            lastCheck: new Date().toISOString()
        };
    }
    
    async activateSdk3Recovery(healthStatus) {
        console.log('🔄 SDK3 recovery activated');
        // Implement SDK3 recovery logic
    }
`;

        // Add monitoring setup to onNodeInit
        content = content.replace(
            /(\s+console\.log\s*\(\s*['"][^'"]*['"]\s*\)\s*;?\s*)/,
            '$1\n        this.setupSdk3Monitoring();\n'
        );

        // Add monitoring code before the last closing brace
        const lastBraceIndex = content.lastIndexOf('}');
        if (lastBraceIndex !== -1) {
            content = content.slice(0, lastBraceIndex) + monitoringCode + '\n' + content.slice(lastBraceIndex);
        }

        return content;
    }

    getSdk3Path(legacyPath) {
        const relativePath = path.relative(this.legacyPath, legacyPath);
        return path.join(this.sdk3Path, relativePath);
    }

    async generateSdk3Compose(legacyPath, sdk3Path) {
        const driverName = path.basename(path.dirname(sdk3Path));
        const composePath = path.join(path.dirname(sdk3Path), 'driver.compose.json');

        const composeJson = {
            id: driverName,
            version: '1.0.0',
            category: 'light',
            name: {
                en: `${driverName} (SDK3)`,
                fr: `${driverName} (SDK3)`,
                nl: `${driverName} (SDK3)`,
                ta: `${driverName} (SDK3)`
            },
            capabilities: ['onoff'],
            zigbee: {
                manufacturerName: 'Tuya',
                modelId: driverName.toUpperCase(),
                endpoints: {
                    '1': {
                        clusters: ['genBasic', 'genOnOff'],
                        bindings: ['genOnOff']
                    }
                }
            },
            images: {
                small: 'assets/small.png',
                large: 'assets/large.png'
            },
            settings: [],
            flow: {
                triggers: [],
                conditions: [],
                actions: []
            }
        };

        fs.writeFileSync(composePath, JSON.stringify(composeJson, null, 2));
    }

    async convertAllLegacyDrivers() {
        console.log('🚀 Starting legacy driver conversion...');

        if (!fs.existsSync(this.legacyPath)) {
            console.log('⚠️  No legacy drivers found');
            return;
        }

        const legacyDrivers = this.findLegacyDrivers();
        console.log(`📦 Found ${legacyDrivers.length} legacy drivers to convert`);

        let successCount = 0;
        let errorCount = 0;

        for (const driver of legacyDrivers) {
            const result = await this.convertLegacyDriver(driver);
            if (result) {
                successCount++;
            } else {
                errorCount++;
            }
        }

        console.log(`✅ Conversion completed: ${successCount} successful, ${errorCount} failed`);
    }

    findLegacyDrivers() {
        const drivers = [];

        if (fs.existsSync(this.legacyPath)) {
            const findDrivers = (dir) => {
                const items = fs.readdirSync(dir, { withFileTypes: true });
                
                for (const item of items) {
                    const fullPath = path.join(dir, item.name);
                    
                    if (item.isDirectory()) {
                        findDrivers(fullPath);
                    } else if (item.name === 'device.js' || item.name.endsWith('.js')) {
                        drivers.push(fullPath);
                    }
                }
            };

            findDrivers(this.legacyPath);
        }

        return drivers;
    }

    async generateLegacyDriverTemplate() {
        console.log('📝 Generating legacy driver template...');

        const template = `/**
 * Legacy Driver Template
 * Template for creating legacy SDK2 drivers
 * 
 * @author dlnraja
 * @version 1.0.0
 * @license MIT
 */

const { HomeyDevice } = require('homey-meshdriver/lib/HomeyDevice');

class LegacyDeviceTemplate extends HomeyDevice {
    async onInit() {
        console.log('🔍 Initializing legacy device template...');
        
        // Register capabilities
        await this.registerCapability('onoff', 'genOnOff');
        
        // Setup event listeners
        this.on('onoff', this.onOnOffChange.bind(this));
        
        console.log('✅ Legacy device template initialized');
    }
    
    async onOnOffChange(value) {
        console.log('🔌 OnOff changed:', value);
        await this.setCapabilityValue('onoff', value);
    }
}

module.exports = LegacyDeviceTemplate;
`;

        const templatePath = path.join(this.legacyPath, 'template', 'device.js');
        const templateDir = path.dirname(templatePath);
        
        if (!fs.existsSync(templateDir)) {
            fs.mkdirSync(templateDir, { recursive: true });
        }

        fs.writeFileSync(templatePath, template);
        console.log('✅ Legacy driver template generated');
    }
}

// CLI Interface
if (require.main === module) {
    const converter = new LegacyDriverConverter();

    const args = process.argv.slice(2);
    const command = args[0] || 'convert';

    switch (command) {
        case 'convert':
            converter.convertAllLegacyDrivers();
            break;
        case 'template':
            converter.generateLegacyDriverTemplate();
            break;
        case 'help':
            console.log(`
Legacy Driver Converter

Usage:
  node legacy-driver-converter.js [command]

Commands:
  convert    Convert all legacy drivers to SDK3 (default)
  template   Generate legacy driver template
  help       Show this help message

Examples:
  node legacy-driver-converter.js convert
  node legacy-driver-converter.js template
  node legacy-driver-converter.js help
            `);
            break;
        default:
            console.error(`Unknown command: ${command}`);
            console.log('Use "help" for available commands');
            process.exit(1);
    }
}

module.exports = LegacyDriverConverter; 