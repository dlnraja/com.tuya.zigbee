const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const DEVICE_DB_FILE = path.join(PROJECT_ROOT, 'data', 'device-database', 'device-database.json');
const DRIVERS_DIR = path.join(PROJECT_ROOT, 'drivers');
const TEMPLATES_DIR = path.join(DRIVERS_DIR, '_templates');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'generated-drivers');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Load templates
const DEVICE_TEMPLATE = fs.readFileSync(path.join(TEMPLATES_DIR, 'device.js'), 'utf8');
const DRIVER_TEMPLATE = fs.readFileSync(path.join(TEMPLATES_DIR, 'driver.js'), 'utf8');
const DRIVER_COMPOSE_TEMPLATE = fs.readFileSync(path.join(TEMPLATES_DIR, 'driver.compose.json'), 'utf8');

/**
 * Load the device database
 */
function loadDeviceDatabase() {
  if (!fs.existsSync(DEVICE_DB_FILE)) {
    console.error('❌ Device database not found. Please run the research tools first.');
    process.exit(1);
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(DEVICE_DB_FILE, 'utf8'));
    return Array.isArray(data) ? data : (data.devices || []);
  } catch (error) {
    console.error('❌ Error loading device database:', error.message);
    process.exit(1);
  }
}

/**
 * Generate a driver name from a device model
 */
function generateDriverName(device) {
  // Extract model number (e.g., TS0121 -> ts0121)
  const model = device.model.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `tuya_${model}`;
}

/**
 * Generate a human-readable device name
 */
function generateDeviceName(device) {
  // Extract manufacturer and model
  const manufacturer = device.manufacturer || 'Tuya';
  const model = device.model || 'Device';
  return `${manufacturer} ${model}`;
}

/**
 * Generate capabilities based on device features
 */
function generateCapabilities(device) {
  const capabilities = new Set();
  const features = device.features || [];
  
  // Map features to capabilities
  if (features.some(f => f.includes('temperature'))) {
    capabilities.add('measure_temperature');
  }
  if (features.some(f => f.includes('humidity'))) {
    capabilities.add('measure_humidity');
  }
  if (features.some(f => f.includes('onoff') || f.includes('switch'))) {
    capabilities.add('onoff');
  }
  if (features.some(f => f.includes('dimmer') || f.includes('brightness'))) {
    capabilities.add('dim');
  }
  if (features.some(f => f.includes('color') || f.includes('rgb'))) {
    capabilities.add('light_hue');
    capabilities.add('light_saturation');
  }
  if (features.some(f => f.includes('motion') || f.includes('presence'))) {
    capabilities.add('alarm_motion');
  }
  if (features.some(f => f.includes('contact') || f.includes('door') || f.includes('window'))) {
    capabilities.add('alarm_contact');
  }
  if (features.some(f => f.includes('water') || f.includes('leak'))) {
    capabilities.add('alarm_water');
  }
  if (features.some(f => f.includes('battery'))) {
    capabilities.add('measure_battery');
    capabilities.add('alarm_battery');
  }
  
  // Default capabilities
  if (capabilities.size === 0) {
    capabilities.add('onoff');
  }
  
  return Array.from(capabilities);
}

/**
 * Generate a device driver file
 */
function generateDeviceDriver(device, driverName) {
  const className = `${driverName.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}Device`;
  const capabilities = generateCapabilities(device);
  
  // Generate imports
  let imports = 'const { ZigbeeDevice } = require("homey-zigbeedriver");\n';
  if (capabilities.includes('light_hue') || capabilities.includes('light_saturation')) {
    imports += 'const { CLUSTER } = require("zigbee-clusters");\n';
  }
  
  // Generate capability handlers
  const capabilityHandlers = capabilities.map(cap => {
    switch (cap) {
      case 'onoff':
        return `
  async onOff(value) {
    this.log('onOff', value);
    // Implement on/off logic here
    // Example: await this.zclNode.endpoints[1].clusters.onOff.set({ onOff: value });
  }`;
      
      case 'dim':
        return `
  async dim(value) {
    this.log('dim', value);
    // Implement dimming logic here
    // Example: await this.zclNode.endpoints[1].clusters.levelControl.moveToLevel({
    //   level: Math.round(value * 254),
    //   transitionTime: 0
    // });
  }`;
      
      case 'measure_temperature':
        return `
  async onZigbeeInit() {
    // Configure temperature reporting
    await this.configureReporting('temperatureMeasurement', {
      minInterval: 0,
      maxInterval: 300,
      minChange: 10, // 0.1°C
    });
  }`;
      
      case 'measure_humidity':
        return `
  async onZigbeeInit() {
    // Configure humidity reporting
    await this.configureReporting('humidityMeasurement', {
      minInterval: 0,
      maxInterval: 300,
      minChange: 20, // 0.5%
    });
  }`;
      
      default:
        return `
  // TODO: Implement ${cap} capability`;
    }
  }).join('\n\n');
  
  // Generate the device class
  const deviceClass = `
/**
 * ${generateDeviceName(device)} device
 */
class ${className} extends ZigbeeDevice {
  ${capabilityHandlers}
  
  /**
   * onInit is called when the device is initialized.
   */
  async onNodeInit() {
    this.log('${className} has been initialized');
    
    // Register capabilities
    ${capabilities.map(cap => `this.registerCapability('${cap}', '${cap.startsWith('measure_') || cap.startsWith('alarm_') ? 'measure' : 'onoff'}');`).join('\n    ')}
    
    // Call parent onNodeInit
    await super.onNodeInit();
  }
  
  /**
   * onAdded is called when the user adds the device.
   */
  async onAdded() {
    this.log('${className} has been added');
  }
  
  /**
   * onSettings is called when the user changes the device settings.
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('${className} settings were changed');
    // Handle settings changes here
  }
  
  /**
   * onRenamed is called when the user changes the device name.
   */
  async onRenamed(name) {
    this.log('${className} was renamed to', name);
  }
  
  /**
   * onDeleted is called when the user deletes the device.
   */
  async onDeleted() {
    this.log('${className} has been deleted');
    await super.onDeleted();
  }
}

module.exports = ${className};`;

  return `${imports}${deviceClass}`;
}

/**
 * Generate a driver file
 */
function generateDriver(device, driverName) {
  const className = `${driverName.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}Driver`;
  const deviceName = generateDeviceName(device);
  
  return `'use strict';

const Homey = require('homey');

/**
 * ${deviceName} Driver
 */
class ${className} extends Homey.Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('${className} has been initialized');
    
    // Register flow cards, etc.
    // Example: this.homey.flow.getActionCard('action_name').registerRun(this.actionHandler.bind(this));
  }
  
  /**
   * onPairListDevices is called when a user is adding a device.
   */
  async onPairListDevices() {
    return [
      {
        name: '${deviceName}',
        data: {
          id: '${uuidv4()}'
        },
        settings: {
          // Add default settings here
        }
      }
    ];
  }
}

module.exports = ${className};`;
}

/**
 * Generate a driver.compose.json file
 */
function generateDriverCompose(device, driverName) {
  const capabilities = generateCapabilities(device);
  const deviceName = generateDeviceName(device);
  
  const driverCompose = {
    id: driverName,
    name: {
      en: deviceName,
    },
    class: 'other',
    capabilities: capabilities,
    images: {
      large: `./assets/images/large/${driverName}.png`,
      small: `./assets/images/small/${driverName}.png`,
    },
    pair: [
      {
        id: 'list_devices',
        template: 'list_devices',
        navigation: {
          next: 'add_devices',
        },
        options: {
          singular: true,
        },
      },
      {
        id: 'add_devices',
        template: 'add_devices',
      },
    ],
  };
  
  return JSON.stringify(driverCompose, null, 2);
}

/**
 * Generate driver files for a device
 */
function generateDriverFiles(device) {
  const driverName = generateDriverName(device);
  const driverDir = path.join(OUTPUT_DIR, driverName);
  
  // Create driver directory
  if (!fs.existsSync(driverDir)) {
    fs.mkdirSync(driverDir, { recursive: true });
  }
  
  // Generate files
  fs.writeFileSync(path.join(driverDir, 'device.js'), generateDeviceDriver(device, driverName));
  fs.writeFileSync(path.join(driverDir, 'driver.js'), generateDriver(device, driverName));
  fs.writeFileSync(path.join(driverDir, 'driver.compose.json'), generateDriverCompose(device, driverName));
  
  console.log(`✅ Generated driver for ${device.model} in ${driverName}/`);
  return driverName;
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Generating driver templates...');
  
  // Load device database
  const devices = loadDeviceDatabase();
  console.log(`📊 Loaded ${devices.length} devices from database`);
  
  // Filter for Tuya devices that need drivers
  const tuyaDevices = devices.filter(device => 
    (device.manufacturer || '').toLowerCase().includes('tuya') || 
    (device.model || '').match(/^TS\d+/i)
  );
  
  console.log(`🔍 Found ${tuyaDevices.length} Tuya devices`);
  
  // Generate drivers for each device
  const generatedDrivers = [];
  for (const device of tuyaDevices) {
    try {
      const driverName = generateDriverFiles(device);
      generatedDrivers.push({
        model: device.model,
        driver: driverName,
        capabilities: generateCapabilities(device)
      });
    } catch (error) {
      console.error(`❌ Error generating driver for ${device.model}:`, error.message);
    }
  }
  
  // Generate a summary
  const summary = {
    generatedAt: new Date().toISOString(),
    totalDrivers: generatedDrivers.length,
    drivers: generatedDrivers
  };
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  
  console.log(`\n✨ Successfully generated ${generatedDrivers.length} driver templates`);
  console.log(`📋 Summary saved to: ${path.join(OUTPUT_DIR, 'summary.json')}`);
  console.log(`\nNext steps:`);
  console.log(`1. Review the generated drivers in the ${OUTPUT_DIR} directory`);
  console.log(`2. Copy the drivers you want to implement to the drivers/ directory`);
  console.log(`3. Implement the device-specific logic in the generated files`);
  console.log(`4. Test the drivers with actual devices`);
}

// Run the generator
main().catch(error => {
  console.error('❌ Error generating driver templates:', error);
  process.exit(1);
});
