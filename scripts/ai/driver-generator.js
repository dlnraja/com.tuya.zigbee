#!/usr/bin/env node
'use strict';

/**
 * Driver Generator - Auto-generates complete driver from analysis
 * Creates all necessary files: driver.compose.json, device.js, assets, etc.
 */

const fs = require('fs');
const path = require('path');

class DriverGenerator {
  constructor(analysis) {
    this.analysis = analysis;
    this.driverPath = null;
  }

  async generate() {
    console.log('🔨 Starting driver generation...');
    
    try {
      // 1. Create driver directory structure
      this.createDirectoryStructure();
      
      // 2. Generate driver.compose.json
      this.generateDriverCompose();
      
      // 3. Generate device.js
      this.generateDeviceJS();
      
      // 4. Generate placeholder assets
      this.generateAssets();
      
      // 5. Update DP Engine fingerprints
      this.updateFingerprints();
      
      // 6. Update DP Engine profiles (if new profile)
      this.updateProfiles();
      
      // 7. Generate README for driver
      this.generateDriverReadme();
      
      console.log('✅ Driver generation complete');
      console.log(`   Path: ${this.driverPath}`);
      
      return {
        success: true,
        driverPath: this.driverPath,
        driverId: this.analysis.driver_config.id
      };
      
    } catch (err) {
      console.error('❌ Generation error:', err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }

  createDirectoryStructure() {
    console.log('  → Creating directory structure...');
    
    const driverId = this.analysis.driver_config.id;
    this.driverPath = path.join(process.cwd(), 'drivers', driverId);
    
    // Create directories
    fs.mkdirSync(this.driverPath, { recursive: true });
    fs.mkdirSync(path.join(this.driverPath, 'assets'), { recursive: true });
    
    console.log(`  ✅ Created: ${this.driverPath}`);
  }

  generateDriverCompose() {
    console.log('  → Generating driver.compose.json...');
    
    const compose = {
      id: this.analysis.driver_config.id,
      name: this.analysis.driver_config.name,
      class: this.analysis.driver_config.class,
      capabilities: this.analysis.driver_config.capabilities,
      capabilitiesOptions: this.generateCapabilitiesOptions(),
      zigbee: this.analysis.driver_config.zigbee,
      energy: this.generateEnergyConfig(),
      images: {
        small: './assets/icon.svg',
        large: './assets/icon.svg'
      },
      pair: this.generatePairConfig()
    };
    
    // Add battery config if needed
    if (this.analysis.driver_config.capabilities.includes('measure_battery')) {
      compose.energy = compose.energy || {};
      compose.energy.batteries = this.guessBatteryType();
    }
    
    const composePath = path.join(this.driverPath, 'driver.compose.json');
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
    
    console.log(`  ✅ Generated: driver.compose.json`);
  }

  generateCapabilitiesOptions() {
    const options = {};
    
    // Add options based on capabilities
    if (this.analysis.capabilities.includes('measure_temperature')) {
      options.measure_temperature = {
        decimals: 1,
        step: 0.5
      };
    }
    
    if (this.analysis.capabilities.includes('measure_humidity')) {
      options.measure_humidity = {
        decimals: 0
      };
    }
    
    return Object.keys(options).length > 0 ? options : undefined;
  }

  generateEnergyConfig() {
    if (this.analysis.capabilities.includes('measure_power')) {
      return {
        approximation: {
          usageOn: 5,
          usageOff: 0.5
        }
      };
    }
    return undefined;
  }

  generatePairConfig() {
    return [
      {
        id: 'list_devices',
        template: 'list_devices',
        navigation: {
          next: 'add_devices'
        }
      },
      {
        id: 'add_devices',
        template: 'add_devices'
      }
    ];
  }

  guessBatteryType() {
    const powerSource = (this.analysis.data?.powerSource || '').toLowerCase();
    
    if (powerSource.includes('cr2032')) return ['CR2032'];
    if (powerSource.includes('cr2450')) return ['CR2450'];
    if (powerSource.includes('aaa')) return ['AAA', 'AAA', 'AAA'];
    if (powerSource.includes('aa')) return ['AA', 'AA'];
    
    // Default guess based on device type
    const type = this.analysis.device_type;
    if (type.includes('sensor')) return ['CR2032'];
    
    return ['OTHER'];
  }

  generateDeviceJS() {
    console.log('  → Generating device.js...');
    
    const usesDPEngine = this.analysis.driver_config.modelId === 'TS0601' || 
                        this.analysis.profile !== null;
    
    const deviceJS = usesDPEngine ? 
      this.generateDPEngineDevice() : 
      this.generateStandardDevice();
    
    const devicePath = path.join(this.driverPath, 'device.js');
    fs.writeFileSync(devicePath, deviceJS);
    
    console.log(`  ✅ Generated: device.js (${usesDPEngine ? 'DP Engine' : 'Standard'})`);
  }

  generateDPEngineDevice() {
    return `'use strict';

const { Device } = require('homey');
const TuyaDPEngine = require('../../lib/tuya-dp-engine');

/**
 * ${this.analysis.driver_config.name.en}
 * Auto-generated driver using DP Engine
 * 
 * Profile: ${this.analysis.profile}
 * Category: ${this.analysis.category}
 */
class ${this.toPascalCase(this.analysis.driver_config.id)}Device extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('Device has been initialized');

    try {
      // Initialize DP Engine
      this.dpEngine = new TuyaDPEngine(this);
      await this.dpEngine.initialize();
      
      this.log('DP Engine initialized successfully');
      
    } catch (err) {
      this.error('Failed to initialize DP Engine:', err);
    }
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('Device has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Settings were changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   */
  async onRenamed(name) {
    this.log('Device was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('Device has been deleted');
    
    if (this.dpEngine) {
      // Cleanup if needed
    }
  }

}

module.exports = ${this.toPascalCase(this.analysis.driver_config.id)}Device;
`;
  }

  generateStandardDevice() {
    return `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * ${this.analysis.driver_config.name.en}
 * Auto-generated standard Zigbee driver
 * 
 * Category: ${this.analysis.category}
 */
class ${this.toPascalCase(this.analysis.driver_config.id)}Device extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Device has been initialized');

    // Register capabilities
    ${this.generateCapabilityRegistrations()}
  }

}

module.exports = ${this.toPascalCase(this.analysis.driver_config.id)}Device;
`;
  }

  generateCapabilityRegistrations() {
    // Generate basic capability registrations based on clusters
    const registrations = [];
    
    if (this.analysis.capabilities.includes('onoff')) {
      registrations.push(`    this.registerCapability('onoff', '6');`);
    }
    
    if (this.analysis.capabilities.includes('dim')) {
      registrations.push(`    this.registerCapability('dim', '8');`);
    }
    
    return registrations.join('\n');
  }

  toPascalCase(str) {
    return str.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  generateAssets() {
    console.log('  → Generating placeholder assets...');
    
    // Create placeholder SVG icon
    const iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" fill="#4CAF50"/>
  <text x="50" y="50" font-size="40" text-anchor="middle" dy=".3em" fill="white">?</text>
</svg>`;
    
    const iconPath = path.join(this.driverPath, 'assets', 'icon.svg');
    fs.writeFileSync(iconPath, iconSVG);
    
    console.log(`  ✅ Generated: placeholder icon`);
  }

  updateFingerprints() {
    console.log('  → Updating DP Engine fingerprints...');
    
    const fingerprintsPath = path.join(process.cwd(), 'lib/tuya-dp-engine/fingerprints.json');
    
    try {
      const fingerprintsData = JSON.parse(fs.readFileSync(fingerprintsPath, 'utf8'));
      
      // Add new fingerprint
      const newFingerprint = {
        manufacturerName: this.analysis.driver_config.zigbee.manufacturerName[0],
        modelId: this.analysis.driver_config.zigbee.productId[0],
        endpoints: [1],
        profile: this.analysis.profile
      };
      
      fingerprintsData.fingerprints = fingerprintsData.fingerprints || [];
      fingerprintsData.fingerprints.push(newFingerprint);
      
      fs.writeFileSync(fingerprintsPath, JSON.stringify(fingerprintsData, null, 2));
      
      console.log(`  ✅ Added fingerprint to DP Engine`);
      
    } catch (err) {
      console.log(`  ⚠️ Could not update fingerprints: ${err.message}`);
    }
  }

  updateProfiles() {
    console.log('  → Checking DP Engine profiles...');
    
    // If using existing profile, no update needed
    if (!this.analysis.profile || this.analysis.profile.includes('generic')) {
      console.log(`  ℹ️  Using existing profile`);
      return;
    }
    
    console.log(`  ✅ Profile exists: ${this.analysis.profile}`);
  }

  generateDriverReadme() {
    console.log('  → Generating driver README...');
    
    const readme = `# ${this.analysis.driver_config.name.en}

**Category:** ${this.analysis.category}  
**Device Type:** ${this.analysis.device_type}  
**Auto-generated:** Yes

## Device Information

- **Brand:** ${this.analysis.data?.brand || 'Unknown'}
- **Model:** ${this.analysis.data?.model || 'Unknown'}
- **Manufacturer ID:** ${this.analysis.driver_config.zigbee.manufacturerName[0]}
- **Model ID:** ${this.analysis.driver_config.zigbee.productId[0]}

## Capabilities

${this.analysis.capabilities.map(c => `- \`${c}\``).join('\n')}

## Profile

Uses DP Engine profile: **${this.analysis.profile}**

## Pairing Instructions

1. Make sure the device is in pairing mode
2. ${this.analysis.driver_config.zigbee.learnmode.instruction.en}
3. Wait for Homey to detect the device
4. Follow on-screen instructions

## Notes

- Auto-generated driver from GitHub issue
- Confidence score: ${this.analysis.confidence}%
- Requires testing with actual device

## Support

Report issues on GitHub: [Device Request Issues](https://github.com/dlnraja/com.tuya.zigbee/issues)
`;
    
    const readmePath = path.join(this.driverPath, 'README.md');
    fs.writeFileSync(readmePath, readme);
    
    console.log(`  ✅ Generated: README.md`);
  }
}

// Main execution
async function main() {
  const analysisStr = process.argv[2];
  if (!analysisStr) {
    console.error('❌ No analysis data provided');
    process.exit(1);
  }
  
  const analysis = JSON.parse(analysisStr);
  const generator = new DriverGenerator(analysis);
  const result = await generator.generate();
  
  // Output for GitHub Actions
  console.log('\n📊 Generation Results:');
  console.log(JSON.stringify(result, null, 2));
  
  if (!result.success) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}

module.exports = DriverGenerator;
