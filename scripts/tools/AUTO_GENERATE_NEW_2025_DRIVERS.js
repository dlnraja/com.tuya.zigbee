#!/usr/bin/env node
'use strict';

/**
 * AUTO GENERATE NEW 2025 DRIVERS
 * 
 * Génération automatique des 10 nouveaux drivers 2024-2025
 * basée sur l'analyse intelligente des nouveaux produits
 */

const fs = require('fs-extra');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const REPORT_PATH = path.join(ROOT, 'reports', 'NEW_PRODUCTS_2025_INTEGRATION.json');

class Auto2025DriverGenerator {
  
  async run() {
    console.log('🏗️  AUTO GENERATE NEW 2025 DRIVERS\n');
    console.log('═'.repeat(70) + '\n');
    
    // Load report
    const report = await fs.readJson(REPORT_PATH);
    
    console.log(`Found ${report.driversToCreate.length} drivers to create\n`);
    
    let created = 0;
    
    for (const driverSpec of report.driversToCreate) {
      try {
        await this.generateDriver(driverSpec);
        created++;
        console.log(`✅ ${driverSpec.id} created\n`);
      } catch (err) {
        console.error(`❌ ${driverSpec.id} failed:`, err.message, '\n');
      }
    }
    
    console.log('═'.repeat(70));
    console.log(`\n✅ Generation complete: ${created}/${report.driversToCreate.length} drivers created\n`);
  }
  
  async generateDriver(spec) {
    const driverDir = path.join(DRIVERS_DIR, spec.id);
    
    // Check if already exists
    if (await fs.pathExists(driverDir)) {
      console.log(`⚠️  ${spec.id} already exists, skipping`);
      return;
    }
    
    await fs.ensureDir(driverDir);
    
    console.log(`📦 Generating ${spec.id}...`);
    
    // 1. driver.compose.json
    await this.generateCompose(spec, driverDir);
    console.log(`   ✓ driver.compose.json`);
    
    // 2. device.js
    await this.generateDevice(spec, driverDir);
    console.log(`   ✓ device.js`);
    
    // 3. driver.js
    await this.generateDriverJS(spec, driverDir);
    console.log(`   ✓ driver.js`);
    
    // 4. Assets placeholders
    await this.generateAssets(spec, driverDir);
    console.log(`   ✓ assets/`);
  }
  
  async generateCompose(spec, driverDir) {
    const compose = {
      id: spec.id,
      name: this.generateNames(spec),
      class: spec.class,
      capabilities: spec.capabilities || [],
      images: {
        small: './assets/small.png',
        large: './assets/large.png',
        xlarge: './assets/xlarge.png'
      },
      zigbee: {
        manufacturerName: spec.manufacturerName || [],
        productId: spec.productId || [],
        endpoints: {
          '1': {
            clusters: spec.clusters || [],
            bindings: this.getBindings(spec.clusters || [])
          }
        },
        learnmode: {
          image: './assets/large.png',
          instruction: this.getLearnmodeInstructions(spec)
        }
      }
    };
    
    // Add energy if batteries
    if (spec.energy && spec.energy.batteries) {
      compose.energy = spec.energy;
    } else if (spec.id.includes('battery')) {
      compose.energy = { batteries: ['CR2032'] };
    }
    
    const filePath = path.join(driverDir, 'driver.compose.json');
    await fs.writeJson(filePath, compose, { spaces: 2 });
  }
  
  async generateDevice(spec, driverDir) {
    const className = this.toPascalCase(spec.id) + 'Device';
    
    const capabilities = (spec.capabilities || []).map(cap => this.generateCapabilityCode(cap)).join('\n');
    
    const deviceCode = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * ${this.generateNames(spec).en}
 * 
 * Generated: ${new Date().toISOString().split('T')[0]}
 * Products: ${spec.productCount}
 * Brands: ${(spec.brands || []).join(', ')}
 */
class ${className} extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('${spec.id} initialized');
    this.log('Manufacturer:', this.getData().manufacturerName);
    this.log('Model:', this.getData().productId);

    // Call parent
    await super.onNodeInit({ zclNode });

    // Register capabilities
    await this.registerCapabilities();

    // Mark as available
    await this.setAvailable();
  }

  /**
   * Register all device capabilities
   */
  async registerCapabilities() {
${capabilities}
  }

  /**
   * Handle device deletion
   */
  async onDeleted() {
    this.log('${spec.id} deleted');
  }

}

module.exports = ${className};
`;

    const filePath = path.join(driverDir, 'device.js');
    await fs.writeFile(filePath, deviceCode);
  }
  
  async generateDriverJS(spec, driverDir) {
    const className = this.toPascalCase(spec.id) + 'Driver';
    
    const driverCode = `'use strict';

const { Driver } = require('homey');

/**
 * ${this.generateNames(spec).en} Driver
 * 
 * Generated: ${new Date().toISOString().split('T')[0]}
 */
class ${className} extends Driver {

  async onInit() {
    this.log('${spec.id} driver initialized');
  }

  async onPair(session) {
    this.log('Pairing ${spec.id}...');
    
    session.setHandler('list_devices', async () => {
      return [];
    });
  }

}

module.exports = ${className};
`;

    const filePath = path.join(driverDir, 'driver.js');
    await fs.writeFile(filePath, driverCode);
  }
  
  async generateAssets(spec, driverDir) {
    const assetsDir = path.join(driverDir, 'assets');
    await fs.ensureDir(assetsDir);
    
    const sizes = ['small', 'large', 'xlarge'];
    for (const size of sizes) {
      const placeholder = path.join(assetsDir, `${size}.png.placeholder`);
      const content = `TODO: Create ${size}.png for ${spec.id}
Standards: Johan Bendz design
Category: ${spec.name}
Products: ${spec.productCount}
Brands: ${(spec.brands || []).join(', ')}
`;
      await fs.writeFile(placeholder, content);
    }
  }
  
  generateNames(spec) {
    const baseName = spec.id
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    
    return {
      en: baseName,
      fr: baseName,
      nl: baseName,
      de: baseName
    };
  }
  
  generateCapabilityCode(capability) {
    const configs = {
      'onoff': {
        cluster: 'ON_OFF',
        config: `get: 'onOff',\n          report: 'onOff',\n          set: 'toggle'`
      },
      'dim': {
        cluster: 'LEVEL_CONTROL',
        config: `get: 'currentLevel',\n          report: 'currentLevel',\n          set: 'moveToLevelWithOnOff'`
      },
      'light_hue': {
        cluster: 'COLOR_CONTROL',
        config: `get: 'currentHue',\n          report: 'currentHue',\n          set: 'moveToHue'`
      },
      'light_saturation': {
        cluster: 'COLOR_CONTROL',
        config: `get: 'currentSaturation',\n          report: 'currentSaturation',\n          set: 'moveToSaturation'`
      },
      'light_temperature': {
        cluster: 'COLOR_CONTROL',
        config: `get: 'colorTemperature',\n          report: 'colorTemperature',\n          set: 'moveToColorTemp'`
      },
      'light_mode': {
        cluster: 'COLOR_CONTROL',
        config: `get: 'colorMode',\n          report: 'colorMode'`
      },
      'alarm_motion': {
        cluster: 'OCCUPANCY_SENSING',
        config: `get: 'occupancy',\n          report: 'occupancy',\n          reportParser: value => value === 1`
      },
      'alarm_contact': {
        cluster: 'ON_OFF',
        config: `get: 'onOff',\n          report: 'onOff',\n          reportParser: value => !value`
      },
      'alarm_generic': {
        cluster: 'IAS_ZONE',
        config: `zoneType: 'alarm',\n          get: 'zoneStatus',\n          report: 'zoneStatus'`
      },
      'alarm_water': {
        cluster: 'IAS_ZONE',
        config: `zoneType: 'waterSensor',\n          get: 'zoneStatus',\n          report: 'zoneStatus'`
      },
      'measure_battery': {
        cluster: 'POWER_CONFIGURATION',
        config: `get: 'batteryPercentageRemaining',\n          report: 'batteryPercentageRemaining',\n          reportParser: value => value / 2`
      },
      'measure_temperature': {
        cluster: 'TEMPERATURE_MEASUREMENT',
        config: `get: 'measuredValue',\n          report: 'measuredValue',\n          reportParser: value => value / 100`
      },
      'measure_humidity': {
        cluster: 'RELATIVE_HUMIDITY_MEASUREMENT',
        config: `get: 'measuredValue',\n          report: 'measuredValue',\n          reportParser: value => value / 100`
      },
      'measure_luminance': {
        cluster: 'ILLUMINANCE_MEASUREMENT',
        config: `get: 'measuredValue',\n          report: 'measuredValue',\n          reportParser: value => Math.pow(10, (value - 1) / 10000)`
      },
      'measure_power': {
        cluster: 'ELECTRICAL_MEASUREMENT',
        config: `get: 'activePower',\n          report: 'activePower',\n          reportParser: value => value / 10`
      },
      'measure_voltage': {
        cluster: 'ELECTRICAL_MEASUREMENT',
        config: `get: 'rmsVoltage',\n          report: 'rmsVoltage',\n          reportParser: value => value / 10`
      },
      'measure_current': {
        cluster: 'ELECTRICAL_MEASUREMENT',
        config: `get: 'rmsCurrent',\n          report: 'rmsCurrent',\n          reportParser: value => value / 1000`
      },
      'meter_power': {
        cluster: 'METERING',
        config: `get: 'currentSummDelivered',\n          report: 'currentSummDelivered',\n          reportParser: value => value / 1000`
      },
      'locked': {
        cluster: 'DOOR_LOCK',
        config: `get: 'lockState',\n          report: 'lockState',\n          set: 'lockDoor'`
      }
    };
    
    const config = configs[capability] || {
      cluster: 'BASIC',
      config: `// TODO: Configure ${capability}`
    };
    
    return `    // ${capability} capability
    if (this.hasCapability('${capability}')) {
      try {
        this.registerCapability('${capability}', CLUSTER.${config.cluster}, {
          ${config.config}
        });
        this.log('✅ ${capability} capability registered');
      } catch (err) {
        this.error('${capability} capability failed:', err.message);
      }
    }`;
  }
  
  getBindings(clusters) {
    const bindable = [1, 5, 6, 8, 768, 1024, 1026, 1029, 1030, 1280, 2820];
    return clusters.filter(c => bindable.includes(c));
  }
  
  getLearnmodeInstructions(spec) {
    return {
      en: `1. Make sure the device is powered\n2. Press the pairing button for 5 seconds\n3. Wait for the device to appear in Homey\n4. The device is now paired`,
      fr: `1. Assurez-vous que l'appareil est alimenté\n2. Appuyez sur le bouton d'appairage pendant 5 secondes\n3. Attendez que l'appareil apparaisse dans Homey\n4. L'appareil est maintenant apparié`,
      nl: `1. Zorg ervoor dat het apparaat is ingeschakeld\n2. Druk 5 seconden op de koppelknop\n3. Wacht tot het apparaat verschijnt in Homey\n4. Het apparaat is nu gekoppeld`,
      de: `1. Stellen Sie sicher, dass das Gerät eingeschaltet ist\n2. Drücken Sie die Kopplungstaste 5 Sekunden lang\n3. Warten Sie, bis das Gerät in Homey angezeigt wird\n4. Das Gerät ist jetzt gekoppelt`
    };
  }
  
  toPascalCase(str) {
    return str
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }
}

// === MAIN ===
async function main() {
  const generator = new Auto2025DriverGenerator();
  await generator.run();
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
