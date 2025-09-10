const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const DEVICE_DB_FILE = path.join(PROJECT_ROOT, 'data', 'device-database', 'enhanced-device-database.json');
const DRIVERS_DIR = path.join(PROJECT_ROOT, 'drivers');
const TEMPLATES_DIR = path.join(DRIVERS_DIR, '_templates');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'improved-drivers');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Load templates
const DEVICE_TEMPLATE = fs.readFileSync(path.join(TEMPLATES_DIR, 'device.js'), 'utf8');
const DRIVER_TEMPLATE = fs.readFileSync(path.join(TEMPLATES_DIR, 'driver.js'), 'utf8');
const DRIVER_COMPOSE_TEMPLATE = fs.readFileSync(path.join(TEMPLATES_DIR, 'driver.compose.json'), 'utf8');

/**
 * Load the enhanced device database
 */
function loadDeviceDatabase() {
  if (!fs.existsSync(DEVICE_DB_FILE)) {
    console.error('❌ Enhanced device database not found. Please run enhance-device-database.js first.');
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
  return `tuya_${device.model.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
}

/**
 * Generate a human-readable device name
 */
function generateDeviceName(device) {
  return `${device.manufacturer} ${device.model}`;
}

/**
 * Generate capability handlers based on device features
 */
function generateCapabilityHandlers(device) {
  const handlers = [];
  const capabilities = device.capabilities || {};

  // Generate handlers for each capability
  for (const [capability, config] of Object.entries(capabilities)) {
    switch (capability) {
      case 'onoff':
        handlers.push(`
  /**
   * Handle "onoff" capability
   */
  async onCapabilityOnOff(value, opts = {}) {
    this.log('onCapabilityOnOff:', value);

    try {
      // Send command to device
      await this.zclNode.endpoints[1].clusters.onOff.set({ onOff: value });

      // Update device state
      this.setCapabilityValue('onoff', value).catch(this.error);

      return true;
    } catch (error) {
      this.error('Error setting onoff:', error);
      throw error;
    }
  }`);
        break;

      case 'dim':
        handlers.push(`
  /**
   * Handle "dim" capability
   */
  async onCapabilityDim(value, opts = {}) {
    this.log('onCapabilityDim:', value);

    try {
      // Convert 0-1 range to 0-254 for Zigbee
      const level = Math.round(value * 254);

      // Send command to device
      await this.zclNode.endpoints[1].clusters.levelControl.moveToLevel({
        level: level,
        transitionTime: 0
      });

      // Update device state
      this.setCapabilityValue('dim', value).catch(this.error);

      return true;
    } catch (error) {
      this.error('Error setting dim level:', error);
      throw error;
    }
  }`);
        break;

      case 'measure_temperature':
        handlers.push(`
  /**
   * Configure temperature reporting
   */
  async configureTemperatureReporting() {
    try {
      await this.configureReporting('temperatureMeasurement', {
        minInterval: 0,
        maxInterval: 300,
        minChange: 10, // 0.1°C
      });
      this.log('Configured temperature reporting');
    } catch (error) {
      this.error('Failed to configure temperature reporting:', error);
    }
  }`);
        break;

      case 'measure_humidity':
        handlers.push(`
  /**
   * Configure humidity reporting
   */
  async configureHumidityReporting() {
    try {
      await this.configureReporting('humidityMeasurement', {
        minInterval: 0,
        maxInterval: 300,
        minChange: 20, // 0.5%
      });
      this.log('Configured humidity reporting');
    } catch (error) {
      this.error('Failed to configure humidity reporting:', error);
    }
  }`);
        break;

      case 'measure_power':
        handlers.push(`
  /**
   * Configure power reporting
   */
  async configurePowerReporting() {
    try {
      await this.configureReporting('electricalMeasurement', {
        minInterval: 0,
        maxInterval: 300,
        minChange: 5, // 5W
      }, 'activePower');
      this.log('Configured power reporting');
    } catch (error) {
      this.error('Failed to configure power reporting:', error);
    }
  }`);
        break;

      case 'alarm_motion':
        handlers.push(`
  /**
   * Handle occupancy change
   */
  onOccupancyChange(occupancy) {
    this.log('onOccupancyChange:', occupancy);
    this.setCapabilityValue('alarm_motion', occupancy).catch(this.error);
  }`);
        break;

      // Add more capability handlers as needed
    }
  }

  // Add battery reporting if device has battery
  if (capabilities.measure_battery) {
    handlers.push(`
  /**
   * Configure battery reporting
   */
  async configureBatteryReporting() {
    try {
      await this.configureReporting('powerConfiguration', {
        minInterval: 0,
        maxInterval: 3600, // 1 hour
        minChange: 5, // 5%
      }, 'batteryPercentageRemaining');
      this.log('Configured battery reporting');
    } catch (error) {
      this.error('Failed to configure battery reporting:', error);
    }
  }`);
  }

  return handlers.join('\n\n');
}

/**
 * Generate cluster bindings based on device capabilities
 */
function generateClusterBindings(device) {
  const capabilities = device.capabilities || {};
  const bindings = [];

  if (capabilities.onoff) {
    bindings.push("      // On/Off cluster\n      onOff: {\n        attributes: {\n          onOff: {}\n        },\n        commands: {\n          off: true,\n          on: true,\n          toggle: true\n        }\n      }");
  }

  if (capabilities.dim) {
    bindings.push("      // Level Control cluster\n      levelControl: {\n        attributes: {\n          currentLevel: {}\n        },\n        commands: {\n          moveToLevel: true\n        }\n      }");
  }

  if (capabilities.measure_temperature) {
    bindings.push("      // Temperature Measurement cluster\n      temperatureMeasurement: {\n        attributes: {\n          measuredValue: {}\n        }\n      }");
  }

  if (capabilities.measure_humidity) {
    bindings.push("      // Humidity Measurement cluster\n      humidityMeasurement: {\n        attributes: {\n          measuredValue: {}\n        }\n      }");
  }

  if (capabilities.measure_power || capabilities.measure_voltage || capabilities.measure_current) {
    bindings.push("      // Electrical Measurement cluster\n      electricalMeasurement: {\n        attributes: {\n          activePower: {},\n          rmsVoltage: {},\n          rmsCurrent: {}\n        }\n      }");
  }

  if (capabilities.alarm_motion) {
    bindings.push("      // Occupancy Sensing cluster\n      occupancySensing: {\n        attributes: {\n          occupancy: {}\n        }\n      }");
  }

  if (capabilities.measure_battery) {
    bindings.push("      // Power Configuration cluster\n      powerConfiguration: {\n        attributes: {\n          batteryPercentageRemaining: {}\n        }\n      }");
  }

  return `zigbee: {\n    vendor: '${device.manufacturer || 'Tuya'}',\n    description: '${device.description || device.model || 'Device'}',\n    fromZigbee: [\n      // Add fromZigbee converters here\n    ],\n    toZigbee: [\n      // Add toZigbee converters here\n    ],\n    exposes: [\n      // Add Home Assistant MQTT discovery exposes here\n    ],\n    bindings: {\n${bindings.join(',\n\n')}\n    }\n  }`;
}

/**
 * Generate a device driver file with advanced features
 */
function generateDeviceDriver(device, driverName) {
  const className = `${driverName.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}Device`;
  const capabilityHandlers = generateCapabilityHandlers(device);
  const clusterBindings = generateClusterBindings(device);
  const capabilities = Object.keys(device.capabilities || {});

  // Generate imports
  let imports = [
    "'use strict';",
    "",
    "const { ZigbeeDevice } = require('homey-zigbeedriver');",
    "const { CLUSTER } = require('zigbee-clusters');",
    ""
  ];

  // Add specific imports based on capabilities
  if (capabilities.some(cap => ['light_hue', 'light_saturation'].includes(cap))) {
    imports.push("const { ColorControlCluster } = require('zigbee-clusters');");
  }

  // Generate the device class
  const deviceClass = `
/**
 * ${generateDeviceName(device)} device
 * ${device.description || ''}
 *
 * @class ${className}
 * @extends {ZigbeeDevice}
 */
class ${className} extends ZigbeeDevice {
  /**
   * onInit is called when the device is initialized.
   */
  async onNodeInit() {
    this.log('${className} has been initialized');

    // Enable debugging
    this.enableDebug();

    // Print the node info for debugging
    this.printNode();

    // Register capabilities with their clusters
    ${capabilities.map(cap => `this.registerCapability('${cap}', '${cap.startsWith('measure_') || cap.startsWith('alarm_') ? 'measure' : 'onoff'}');`).join('\n    ')}

    // Configure reporting for capabilities
    ${capabilities.includes('measure_temperature') ? 'await this.configureTemperatureReporting();' : ''}
    ${capabilities.includes('measure_humidity') ? 'await this.configureHumidityReporting();' : ''}
    ${capabilities.includes('measure_power') ? 'await this.configurePowerReporting();' : ''}
    ${capabilities.includes('measure_battery') ? 'await this.configureBatteryReporting();' : ''}

    // Register event listeners
    ${capabilities.includes('alarm_motion') ? 'this.registerOccupancyListener();' : ''}

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
    this.log('${className} settings were changed:', changedKeys);

    // Handle settings changes here
    for (const key of changedKeys) {
      switch (key) {
        case 'sensitivity':
          // Handle sensitivity change
          break;
        case 'reportingInterval':
          // Update reporting intervals
          break;
        // Add more settings handlers as needed
      }
    }
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

  // Capability handlers
  ${capabilityHandlers}

  // Cluster bindings and configuration
  ${clusterBindings}
}

module.exports = ${className};`;

  return [...imports, deviceClass].join('\n');
}

/**
 * Generate a driver file with advanced features
 */
function generateDriver(device, driverName) {
  const className = `${driverName.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}Driver`;
  const deviceName = generateDeviceName(device);

  return `'use strict';

const Homey = require('homey');

/**
 * ${deviceName} Driver
 *
 * @class ${className}
 * @extends {Homey.Driver}
 */
class ${className} extends Homey.Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('${className} has been initialized');

    // Register flow cards
    this._registerFlowCards();

    // Register event listeners
    this.homey.on('unload', () => this.onUninit());
  }

  /**
   * onUninit is called when the driver is unloaded.
   */
  onUninit() {
    this.log('${className} is unloading...');
  }

  /**
   * Register flow cards
   */
  _registerFlowCards() {
    // Action cards
    this.flowActionTurnOn = this.homey.flow.getActionCard('${driverName}_turn_on');
    this.flowActionTurnOn.registerRun(this._actionTurnOn.bind(this));

    this.flowActionTurnOff = this.homey.flow.getActionCard('${driverName}_turn_off');
    this.flowActionTurnOff.registerRun(this._actionTurnOff.bind(this));

    this.flowActionToggle = this.homey.flow.getActionCard('${driverName}_toggle');
    this.flowActionToggle.registerRun(this._actionToggle.bind(this));

    // Condition cards
    this.flowConditionIsOn = this.homey.flow.getConditionCard('${driverName}_is_on');
    this.flowConditionIsOn.registerRun(this._conditionIsOn.bind(this));

    // Add more flow cards as needed
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
        store: {
          // Add store data here
        },
        settings: {
          // Add default settings here
          powerOnState: 'last',
          reportingInterval: 300
        },
        capabilities: ${JSON.stringify(Object.keys(device.capabilities || {}))},
        capabilitiesOptions: {
          // Add capability options here
        }
      }
    ];
  }

  /**
   * Action: Turn device on
   */
  async _actionTurnOn(args) {
    try {
      await args.device.setCapabilityValue('onoff', true);
      return true;
    } catch (error) {
      this.error('Error in _actionTurnOn:', error);
      throw error;
    }
  }

  /**
   * Action: Turn device off
   */
  async _actionTurnOff(args) {
    try {
      await args.device.setCapabilityValue('onoff', false);
      return true;
    } catch (error) {
      this.error('Error in _actionTurnOff:', error);
      throw error;
    }
  }

  /**
   * Action: Toggle device
   */
  async _actionToggle(args) {
    try {
      const currentState = args.device.getCapabilityValue('onoff');
      await args.device.setCapabilityValue('onoff', !currentState);
      return true;
    } catch (error) {
      this.error('Error in _actionToggle:', error);
      throw error;
    }
  }

  /**
   * Condition: Check if device is on
   */
  async _conditionIsOn(args) {
    try {
      return args.device.getCapabilityValue('onoff') === true;
    } catch (error) {
      this.error('Error in _conditionIsOn:', error);
      throw error;
    }
  }
}

module.exports = ${className};`;
}

/**
 * Generate a driver.compose.json file with advanced features
 */
function generateDriverCompose(device, driverName) {
  const deviceName = generateDeviceName(device);
  const capabilities = Object.entries(device.capabilities || {});

  const driverCompose = {
    id: driverName,
    name: {
      en: deviceName,
    },
    class: 'other',
    capabilities: capabilities.map(([cap]) => cap),
    capabilitiesOptions: {
      // Add capability options here
    },
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
    settings: [
      {
        type: 'group',
        label: {
          en: 'Device Settings',
        },
        children: [
          {
            id: 'powerOnState',
            type: 'dropdown',
            label: {
              en: 'Power On State',
            },
            value: 'last',
            values: [
              {
                id: 'last',
                label: {
                  en: 'Last State',
                },
              },
              {
                id: 'on',
                label: {
                  en: 'Always On',
                },
              },
              {
                id: 'off',
                label: {
                  en: 'Always Off',
                },
              },
            ],
          },
          {
            id: 'reportingInterval',
            type: 'number',
            label: {
              en: 'Reporting Interval (seconds)',
            },
            value: 300,
            min: 60,
            max: 86400,
          },
        ],
      },
    ],
  };

  return JSON.stringify(driverCompose, null, 2);
}

/**
 * Generate flow cards for the driver
 */
function generateFlowCards(device, driverName) {
  const flowCards = [];
  const capabilities = Object.keys(device.capabilities || {});

  // Action cards
  if (capabilities.includes('onoff')) {
    flowCards.push({
      id: `${driverName}_turn_on`,
      title: {
        en: 'Turn on',
      },
      args: [
        {
          name: 'device',
          type: 'device',
          filter: `driver=${driverName}`,
        },
      ],
    });

    flowCards.push({
      id: `${driverName}_turn_off`,
      title: {
        en: 'Turn off',
      },
      args: [
        {
          name: 'device',
          type: 'device',
          filter: `driver=${driverName}`,
        },
      ],
    });

    flowCards.push({
      id: `${driverName}_toggle`,
      title: {
        en: 'Toggle',
      },
      args: [
        {
          name: 'device',
          type: 'device',
          filter: `driver=${driverName}`,
        },
      ],
    });

    // Condition card
    flowCards.push({
      id: `${driverName}_is_on`,
      title: {
        en: 'Is on',
      },
      args: [
        {
          name: 'device',
          type: 'device',
          filter: `driver=${driverName}`,
        },
      ],
    });
  }

  // Add more flow cards based on capabilities

  return flowCards;
}

/**
 * Generate driver files for a device with advanced features
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

  // Generate flow cards
  const flowCards = generateFlowCards(device, driverName);
  if (flowCards.length > 0) {
    const flowDir = path.join(driverDir, 'flows');
    if (!fs.existsSync(flowDir)) {
      fs.mkdirSync(flowDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(flowDir, 'flow.json'),
      JSON.stringify({
        id: driverName,
        title: {
          en: device.manufacturer || 'Tuya',
        },
        version: '1.0.0',
        homey: '2.0.0',
        triggers: [],
        conditions: flowCards.filter(card => card.id.endsWith('_is_on')),
        actions: flowCards.filter(card => !card.id.endsWith('_is_on')),
      }, null, 2)
    );
  }

  console.log(`✅ Generated driver for ${device.model} in ${driverName}/`);
  return driverName;
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Generating improved driver templates...');

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
        capabilities: Object.keys(device.capabilities || {})
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

  console.log(`\n✨ Successfully generated ${generatedDrivers.length} improved driver templates`);
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
 
