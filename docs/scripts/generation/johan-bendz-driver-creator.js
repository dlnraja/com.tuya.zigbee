#!/usr/bin/env node

/**
 * JOHAN BENDZ DRIVER CREATOR
 * Creates missing drivers from Johan Bendz analysis for complete coverage
 * Follows unbranded categorization with professional standards
 */

const fs = require('fs');
const path = require('path');

class JohanBenzDriverCreator {
  constructor() {
    this.projectRoot = process.cwd();
    this.driversPath = path.join(this.projectRoot, 'drivers');
    this.templatesPath = path.join(this.projectRoot, 'assets', 'templates');
    
    // Priority drivers to create first
    this.priorityDrivers = [
      // IKEA ecosystem
      { name: 'ikea_tradfri_bulb', category: 'Smart Lighting', class: 'light' },
      { name: 'ikea_styrbar_remote', category: 'Scene Control', class: 'button' },
      { name: 'ikea_symfonisk_remote', category: 'Scene Control', class: 'button' },
      
      // Aqara ecosystem  
      { name: 'aqara_cube', category: 'Scene Control', class: 'button' },
      { name: 'aqara_button', category: 'Scene Control', class: 'button' },
      { name: 'aqara_motion_sensor', category: 'Motion & Presence', class: 'sensor' },
      { name: 'aqara_temperature_sensor', category: 'Environmental Sensors', class: 'sensor' },
      
      // Philips Hue
      { name: 'hue_bulb', category: 'Smart Lighting', class: 'light' },
      { name: 'hue_dimmer', category: 'Scene Control', class: 'button' },
      { name: 'hue_motion_sensor', category: 'Motion & Presence', class: 'sensor' },
      
      // Sonoff ecosystem
      { name: 'sonoff_basic', category: 'Power Management', class: 'socket' },
      { name: 'sonoff_mini', category: 'Wall Switches', class: 'light' },
      { name: 'sonoff_zbbridge', category: 'Scene Control', class: 'other' },
      
      // Advanced sensors
      { name: 'lux_sensor', category: 'Environmental Sensors', class: 'sensor' },
      { name: 'noise_sensor', category: 'Environmental Sensors', class: 'sensor' },
      { name: 'pressure_sensor', category: 'Environmental Sensors', class: 'sensor' },
      { name: 'formaldehyde_sensor', category: 'Environmental Sensors', class: 'sensor' }
    ];
  }

  log(message, type = 'info') {
    const prefix = { 'info': '🔧', 'success': '✅', 'error': '❌', 'warning': '⚠️', 'create': '📝' }[type] || 'ℹ️';
    console.log(`${prefix} ${message}`);
  }

  getDriverTemplate(driverName, category, driverClass) {
    const capabilities = this.getCapabilitiesByClass(driverClass, driverName);
    const manufacturerIds = this.getManufacturerIds(driverName);
    
    return {
      "name": {
        "en": this.generateDriverName(driverName),
        "fr": this.generateDriverName(driverName),
        "de": this.generateDriverName(driverName),
        "nl": this.generateDriverName(driverName)
      },
      "class": driverClass,
      "capabilities": capabilities,
      "energy": this.getEnergyConfig(driverClass),
      "images": {
        "small": `./assets/images/small.png`,
        "large": `./assets/images/large.png`
      },
      "zigbee": {
        "manufacturerName": manufacturerIds.manufacturerName,
        "productId": manufacturerIds.productId,
        "endpoints": {
          "1": {
            "clusters": this.getClusters(driverClass),
            "bindings": this.getBindings(driverClass)
          }
        },
        "learnmode": {
          "image": `./assets/images/large.png`,
          "instruction": {
            "en": this.getLearnModeInstruction(driverName),
            "fr": this.getLearnModeInstruction(driverName),
            "de": this.getLearnModeInstruction(driverName),
            "nl": this.getLearnModeInstruction(driverName)
          }
        }
      }
    };
  }

  generateDriverName(driverName) {
    return driverName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .replace('Ikea', 'IKEA')
      .replace('Aqara', 'Aqara')
      .replace('Hue', 'Philips Hue')
      .replace('Sonoff', 'Sonoff');
  }

  getCapabilitiesByClass(driverClass, driverName) {
    const baseCapabilities = {
      'light': ['onoff', 'dim'],
      'sensor': ['alarm_motion', 'measure_temperature'],
      'button': ['alarm_battery'],
      'socket': ['onoff', 'measure_power'],
      'other': ['onoff']
    };

    let capabilities = baseCapabilities[driverClass] || ['onoff'];
    
    // Add specific capabilities based on driver name
    if (driverName.includes('rgb') || driverName.includes('hue')) {
      capabilities.push('light_hue', 'light_saturation');
    }
    if (driverName.includes('temperature')) {
      capabilities = ['measure_temperature', 'measure_humidity'];
    }
    if (driverName.includes('motion')) {
      capabilities = ['alarm_motion', 'alarm_battery'];
    }
    if (driverName.includes('lux')) {
      capabilities = ['measure_luminance'];
    }
    if (driverName.includes('noise')) {
      capabilities = ['measure_noise'];
    }
    if (driverName.includes('pressure')) {
      capabilities = ['measure_pressure'];
    }
    
    // Add battery for wireless devices
    if (['sensor', 'button'].includes(driverClass)) {
      if (!capabilities.includes('alarm_battery')) {
        capabilities.push('alarm_battery');
      }
    }
    
    return capabilities;
  }

  getManufacturerIds(driverName) {
    const manufacturerMap = {
      'ikea_': { manufacturerName: ['IKEA of Sweden'], productId: ['TRADFRI bulb E27 WS opal 980lm'] },
      'aqara_': { manufacturerName: ['Aqara', 'LUMI'], productId: ['lumi.sensor_cube.aqgl01'] },
      'hue_': { manufacturerName: ['Philips'], productId: ['LCT012', 'RWL021'] },
      'sonoff_': { manufacturerName: ['SONOFF'], productId: ['BASICZBR3', 'ZBMINI'] },
      'lux_': { manufacturerName: ['Tuya'], productId: ['TS0222'] },
      'noise_': { manufacturerName: ['Tuya'], productId: ['TS0601'] },
      'pressure_': { manufacturerName: ['Tuya'], productId: ['TS0601'] },
      'formaldehyde_': { manufacturerName: ['Tuya'], productId: ['TS0601'] }
    };

    for (const [prefix, data] of Object.entries(manufacturerMap)) {
      if (driverName.startsWith(prefix)) {
        return data;
      }
    }
    
    return { manufacturerName: ['Tuya'], productId: ['TS0601'] };
  }

  getClusters(driverClass) {
    const clusterMap = {
      'light': [0, 3, 4, 5, 6, 8],
      'sensor': [0, 1, 3, 1024, 1026, 1029],
      'button': [0, 1, 3, 6, 8],
      'socket': [0, 3, 6, 1794, 2820],
      'other': [0, 3, 6]
    };
    
    return clusterMap[driverClass] || [0, 3, 6];
  }

  getBindings(driverClass) {
    if (['light', 'socket'].includes(driverClass)) {
      return [6, 8];
    }
    return [1];
  }

  getEnergyConfig(driverClass) {
    if (driverClass === 'socket') {
      return {
        "approximation": {
          "usageConstant": 5
        }
      };
    } else if (['sensor', 'button'].includes(driverClass)) {
      return {
        "batteries": ["CR2032"]
      };
    }
    return {};
  }

  getLearnModeInstruction(driverName) {
    const instructions = {
      'ikea_': 'Turn the device on and off 6 times within 10 seconds to enter pairing mode.',
      'aqara_': 'Press and hold the reset button for 3 seconds until the LED starts blinking.',
      'hue_': 'Use the Philips Hue Bridge or hold the setup button for 3 seconds.',
      'sonoff_': 'Press and hold the pairing button for 5 seconds until LED blinks rapidly.',
      'default': 'Follow the device manual to enter Zigbee pairing mode.'
    };

    for (const [prefix, instruction] of Object.entries(instructions)) {
      if (driverName.startsWith(prefix)) {
        return instruction;
      }
    }
    
    return instructions.default;
  }

  createDriverStructure(driverName) {
    const driverPath = path.join(this.driversPath, driverName);
    const assetsPath = path.join(driverPath, 'assets');
    const imagesPath = path.join(assetsPath, 'images');
    const pairPath = path.join(driverPath, 'pair');
    
    // Create directories
    [driverPath, assetsPath, imagesPath, pairPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    return { driverPath, assetsPath, imagesPath, pairPath };
  }

  createDeviceJS(driverPath, driverName, driverClass) {
    const deviceTemplate = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${this.toPascalCase(driverName)} extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    // Initialize device
    this.log('${this.generateDriverName(driverName)} initialized');
    
    ${this.getDeviceInitCode(driverClass)}
  }
  
  ${this.getDeviceMethodsCode(driverClass)}
}

module.exports = ${this.toPascalCase(driverName)};`;

    fs.writeFileSync(path.join(driverPath, 'device.js'), deviceTemplate);
  }

  toPascalCase(str) {
    return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
  }

  getDeviceInitCode(driverClass) {
    switch (driverClass) {
      case 'light':
        return `    // Register capability listeners
    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
    if (this.hasCapability('dim')) {
      this.registerCapabilityListener('dim', this.onCapabilityDim.bind(this));
    }`;
      case 'sensor':
        return `    // Register attribute reporting
    if (zclNode.endpoints[1]?.clusters?.msTemperatureMeasurement) {
      zclNode.endpoints[1].clusters.msTemperatureMeasurement.on('attr.measuredValue', (value) => {
        this.setCapabilityValue('measure_temperature', value / 100).catch(this.error);
      });
    }`;
      case 'button':
        return `    // Register button events
    if (zclNode.endpoints[1]?.clusters?.genOnOff) {
      zclNode.endpoints[1].clusters.genOnOff.on('attr.onOff', () => {
        this.homey.flow.getDeviceTriggerCard('button_pressed').trigger(this).catch(this.error);
      });
    }`;
      default:
        return `    // Basic device initialization
    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));`;
    }
  }

  getDeviceMethodsCode(driverClass) {
    if (driverClass === 'light' || driverClass === 'socket') {
      return `
  async onCapabilityOnoff(value) {
    await this.zclNode.endpoints[1].clusters.genOnOff.setOn(value);
    return value;
  }
  
  async onCapabilityDim(value) {
    if (this.zclNode.endpoints[1].clusters.genLevelCtrl) {
      await this.zclNode.endpoints[1].clusters.genLevelCtrl.moveToLevel({
        level: Math.round(value * 254),
        transtime: 1
      });
    }
    return value;
  }`;
    }
    return '';
  }

  async createDriver(driverData) {
    const { name: driverName, category, class: driverClass } = driverData;
    
    this.log(`Creating driver: ${driverName}`, 'create');
    
    try {
      // Create directory structure
      const { driverPath } = this.createDriverStructure(driverName);
      
      // Create driver.compose.json
      const composeData = this.getDriverTemplate(driverName, category, driverClass);
      fs.writeFileSync(
        path.join(driverPath, 'driver.compose.json'),
        JSON.stringify(composeData, null, 2)
      );
      
      // Create device.js
      this.createDeviceJS(driverPath, driverName, driverClass);
      
      // Create placeholder images (will be replaced by image generator)
      const placeholderSizes = ['small.png', 'large.png'];
      placeholderSizes.forEach(size => {
        const placeholderPath = path.join(this.projectRoot, 'assets', 'icons', 'placeholder.svg');
        const targetPath = path.join(driverPath, 'assets', 'images', size);
        if (fs.existsSync(placeholderPath)) {
          fs.copyFileSync(placeholderPath, targetPath.replace('.png', '.svg'));
        }
      });
      
      this.log(`Created ${driverName} successfully`, 'success');
      return true;
      
    } catch (error) {
      this.log(`Failed to create ${driverName}: ${error.message}`, 'error');
      return false;
    }
  }

  async run() {
    this.log('🚀 JOHAN BENDZ DRIVER CREATOR STARTING', 'info');
    this.log(`Creating ${this.priorityDrivers.length} priority drivers`, 'info');
    this.log('=' * 80, 'info');
    
    let created = 0;
    let skipped = 0;
    
    for (const driverData of this.priorityDrivers) {
      const driverPath = path.join(this.driversPath, driverData.name);
      
      if (fs.existsSync(driverPath)) {
        this.log(`Skipping ${driverData.name} - already exists`, 'warning');
        skipped++;
        continue;
      }
      
      const success = await this.createDriver(driverData);
      if (success) {
        created++;
      }
    }
    
    this.log('\n📊 DRIVER CREATION COMPLETE', 'success');
    this.log(`Created: ${created} drivers`, 'success');
    this.log(`Skipped: ${skipped} drivers (already exist)`, 'info');
    this.log(`Total: ${created + skipped}/${this.priorityDrivers.length}`, 'info');
    
    if (created > 0) {
      this.log('\n🎨 Next steps:', 'info');
      this.log('1. Generate professional images for new drivers', 'info');
      this.log('2. Update app.json with new drivers', 'info');
      this.log('3. Validate and publish', 'info');
    }
    
    return { created, skipped, total: this.priorityDrivers.length };
  }
}

// Execute if run directly
if (require.main === module) {
  const creator = new JohanBenzDriverCreator();
  creator.run().catch(console.error);
}

module.exports = JohanBenzDriverCreator;
