const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const DEVICE_DB_FILE = path.join(PROJECT_ROOT, 'data', 'device-database', 'device-database.json');
const ENHANCED_DB_FILE = path.join(PROJECT_ROOT, 'data', 'device-database', 'enhanced-device-database.json');

// Additional device data
const ADDITIONAL_DEVICES = [
  // Smart Plugs
  {
    model: 'TS0121',
    manufacturer: 'Tuya',
    description: 'Smart Plug with Power Monitoring',
    type: 'On/Off Plug',
    features: ['onoff', 'power_measurement', 'energy_measurement'],
    supported: true,
    specifications: {
      voltage: '100-240V',
      maxPower: '3680W',
      protocol: 'Zigbee 3.0',
      certification: 'CE, RoHS, FCC',
      dimensions: '65x45x40mm',
      weight: '80g',
      communication: '802.15.4',
      frequency: '2.4GHz',
      transmissionDistance: '100m (open area)'
    },
    capabilities: {
      onoff: {
        type: 'boolean',
        gettable: true,
        settable: true,
        description: 'Turn the device on or off'
      },
      measure_power: {
        type: 'number',
        unit: 'W',
        description: 'Current power consumption in watts'
      },
      meter_power: {
        type: 'number',
        unit: 'kWh',
        description: 'Total energy consumption in kilowatt-hours'
      }
    },
    settings: [
      {
        name: 'powerOnState',
        type: 'enum',
        values: ['on', 'off', 'last'],
        default: 'last',
        description: 'State to return to after power failure'
      }
    ]
  },
  
  // Temperature & Humidity Sensors
  {
    model: 'TS0201',
    manufacturer: 'Tuya',
    description: 'Temperature & Humidity Sensor',
    type: 'Sensor',
    features: ['temperature', 'humidity', 'battery'],
    supported: true,
    specifications: {
      temperatureRange: '-20°C to 60°C',
      temperatureAccuracy: '±0.5°C',
      humidityRange: '0% to 99.9%',
      humidityAccuracy: '±3%',
      batteryType: 'CR2450',
      batteryLife: '1-2 years',
      protocol: 'Zigbee 3.0',
      dimensions: '55x55x15mm',
      weight: '35g'
    },
    capabilities: {
      measure_temperature: {
        type: 'number',
        unit: 'celsius',
        description: 'Current temperature in Celsius'
      },
      measure_humidity: {
        type: 'number',
        unit: 'percentage',
        description: 'Current relative humidity percentage'
      },
      measure_battery: {
        type: 'number',
        unit: 'percentage',
        description: 'Remaining battery percentage'
      },
      alarm_battery: {
        type: 'boolean',
        description: 'Indicates low battery status'
      }
    },
    settings: [
      {
        name: 'temperatureUnit',
        type: 'enum',
        values: ['celsius', 'fahrenheit'],
        default: 'celsius',
        description: 'Temperature unit for display'
      },
      {
        name: 'humidityThreshold',
        type: 'number',
        min: 30,
        max: 90,
        default: 60,
        description: 'Humidity threshold for alerts (%)'
      }
    ]
  },
  
  // RGB LED Controller
  {
    model: 'TS0501B',
    manufacturer: 'Tuya',
    description: 'RGB LED Controller',
    type: 'Light',
    features: ['onoff', 'dim', 'color_rgb'],
    supported: false,
    specifications: {
      inputVoltage: '12-24V DC',
      maxLoad: '72W',
      colorTemperature: 'RGB',
      dimmingRange: '1-100%',
      protocol: 'Zigbee 3.0',
      dimensions: '85x50x25mm',
      weight: '100g'
    },
    capabilities: {
      onoff: {
        type: 'boolean',
        gettable: true,
        settable: true,
        description: 'Turn the light on or off'
      },
      dim: {
        type: 'number',
        min: 0,
        max: 1,
        step: 0.01,
        description: 'Brightness level from 0 to 1'
      },
      light_hue: {
        type: 'number',
        min: 0,
        max: 1,
        description: 'Hue value from 0 to 1'
      },
      light_saturation: {
        type: 'number',
        min: 0,
        max: 1,
        description: 'Saturation value from 0 to 1'
      }
    },
    settings: [
      {
        name: 'transitionTime',
        type: 'number',
        min: 0,
        max: 60,
        default: 1,
        unit: 'seconds',
        description: 'Transition time for color/brightness changes'
      },
      {
        name: 'powerOnBehavior',
        type: 'enum',
        values: ['last', 'on', 'off'],
        default: 'last',
        description: 'Behavior when power is restored'
      }
    ]
  },
  
  // Motion Sensor
  {
    model: 'TS0202',
    manufacturer: 'Tuya',
    description: 'Motion Sensor',
    type: 'Sensor',
    features: ['motion', 'illuminance', 'battery'],
    supported: false,
    specifications: {
      detectionAngle: '120°',
      detectionDistance: '5-8m',
      illuminationRange: '0-1000 lux',
      batteryType: 'CR2450',
      batteryLife: '1-2 years',
      protocol: 'Zigbee 3.0',
      dimensions: '45x45x30mm',
      weight: '50g'
    },
    capabilities: {
      alarm_motion: {
        type: 'boolean',
        description: 'Motion detected'
      },
      measure_luminance: {
        type: 'number',
        unit: 'lux',
        description: 'Current light level in lux'
      },
      measure_battery: {
        type: 'number',
        unit: 'percentage',
        description: 'Remaining battery percentage'
      },
      alarm_battery: {
        type: 'boolean',
        description: 'Indicates low battery status'
      }
    },
    settings: [
      {
        name: 'sensitivity',
        type: 'enum',
        values: ['low', 'medium', 'high'],
        default: 'medium',
        description: 'Motion detection sensitivity'
      },
      {
        name: 'detectionInterval',
        type: 'number',
        min: 5,
        max: 60,
        default: 30,
        unit: 'seconds',
        description: 'Time between motion detections'
      }
    ]
  },
  
  // Smart Button
  {
    model: 'TS004F',
    manufacturer: 'Tuya',
    description: 'Wireless Smart Button',
    type: 'Remote',
    features: ['button', 'battery'],
    supported: false,
    specifications: {
      buttonType: 'Momentary',
      batteryType: 'CR2032',
      batteryLife: '1 year',
      protocol: 'Zigbee 3.0',
      dimensions: '40x40x15mm',
      weight: '25g',
      operatingTemperature: '-10°C to 40°C',
      humidity: '5% to 85% RH (non-condensing)'
    },
    capabilities: {
      button: {
        type: 'enum',
        values: ['single', 'double', 'hold', 'release'],
        description: 'Button press type'
      },
      measure_battery: {
        type: 'number',
        unit: 'percentage',
        description: 'Remaining battery percentage'
      },
      alarm_battery: {
        type: 'boolean',
        description: 'Indicates low battery status'
      }
    },
    settings: [
      {
        name: 'buttonAction',
        type: 'enum',
        values: ['toggle', 'on', 'off', 'scene'],
        default: 'toggle',
        description: 'Action to perform on button press'
      },
      {
        name: 'buttonPressTime',
        type: 'number',
        min: 100,
        max: 1000,
        default: 200,
        unit: 'ms',
        description: 'Time to register a button press'
      }
    ],
    flow: {
      triggers: [
        {
          id: 'button_pressed',
          title: 'Button pressed',
          args: [
            {
              name: 'action',
              type: 'dropdown',
              values: [
                { id: 'single', label: 'Single press' },
                { id: 'double', label: 'Double press' },
                { id: 'hold', label: 'Long press' },
                { id: 'release', label: 'Button released' }
              ]
            }
          ]
        }
      ],
      conditions: [
        {
          id: 'battery_status',
          title: 'Battery level',
          args: [
            {
              name: 'operator',
              type: 'dropdown',
              values: [
                { id: 'lt', label: 'is below' },
                { id: 'gt', label: 'is above' }
              ]
            },
            {
              name: 'level',
              type: 'number',
              min: 1,
              max: 100,
              default: 20,
              unit: '%'
            }
          ]
        }
      ]
    }
  },
  
  // Smart Plug with USB
  {
    model: 'TS011F',
    manufacturer: 'Tuya',
    description: 'Smart Plug with USB and Power Monitoring',
    type: 'On/Off Plug',
    features: ['onoff', 'power_measurement', 'energy_measurement', 'usb'],
    supported: false,
    specifications: {
      inputVoltage: '100-240V',
      outputVoltage: '100-240V',
      maxPower: '2500W',
      usbOutput: '5V/2.1A',
      protocol: 'Zigbee 3.0',
      dimensions: '65x65x45mm',
      weight: '120g',
      communication: '802.15.4',
      frequency: '2.4GHz',
      transmissionDistance: '100m (open area)'
    },
    capabilities: {
      onoff: {
        type: 'boolean',
        gettable: true,
        settable: true,
        description: 'Turn the device on or off'
      },
      usb_onoff: {
        type: 'boolean',
        gettable: true,
        settable: true,
        description: 'Control the USB port on/off state'
      },
      measure_power: {
        type: 'number',
        unit: 'W',
        description: 'Current power consumption in watts'
      },
      meter_power: {
        type: 'number',
        unit: 'kWh',
        description: 'Total energy consumption in kilowatt-hours'
      },
      measure_voltage: {
        type: 'number',
        unit: 'V',
        description: 'Current voltage'
      },
      measure_current: {
        type: 'number',
        unit: 'A',
        description: 'Current amperage'
      }
    },
    settings: [
      {
        name: 'powerOnState',
        type: 'enum',
        values: ['on', 'off', 'last'],
        default: 'last',
        description: 'State to return to after power failure'
      },
      {
        name: 'usbPowerOnState',
        type: 'enum',
        values: ['on', 'off', 'last'],
        default: 'last',
        description: 'USB state after power failure'
      },
      {
        name: 'powerThreshold',
        type: 'number',
        min: 0,
        max: 2500,
        default: 0,
        unit: 'W',
        description: 'Power threshold for alerts (0 = disabled)'
      },
      {
        name: 'energyReset',
        type: 'boolean',
        default: false,
        description: 'Reset energy counter to zero'
      }
    ],
    flow: {
      triggers: [
        {
          id: 'power_threshold',
          title: 'Power threshold reached',
          args: [
            {
              name: 'condition',
              type: 'dropdown',
              values: [
                { id: 'above', label: 'Above' },
                { id: 'below', label: 'Below' }
              ]
            },
            {
              name: 'watts',
              type: 'number',
              min: 0,
              max: 2500,
              default: 100,
              unit: 'W'
            }
          ]
        },
        {
          id: 'energy_consumed',
          title: 'Energy consumed',
          args: [
            {
              name: 'kwh',
              type: 'number',
              min: 0.1,
              max: 1000,
              default: 1,
              unit: 'kWh'
            }
          ]
        }
      ],
      conditions: [
        {
          id: 'power_consumption',
          title: 'Power consumption',
          args: [
            {
              name: 'operator',
              type: 'dropdown',
              values: [
                { id: 'gt', label: 'is above' },
                { id: 'lt', label: 'is below' }
              ]
            },
            {
              name: 'watts',
              type: 'number',
              min: 0,
              max: 2500,
              default: 100,
              unit: 'W'
            }
          ]
        },
        {
          id: 'energy_consumed',
          title: 'Energy consumed since',
          args: [
            {
              name: 'operator',
              type: 'dropdown',
              values: [
                { id: 'gt', label: 'more than' },
                { id: 'lt', label: 'less than' }
              ]
            },
            {
              name: 'kwh',
              type: 'number',
              min: 0.1,
              max: 1000,
              default: 1,
              unit: 'kWh'
            },
            {
              name: 'period',
              type: 'dropdown',
              values: [
                { id: 'hour', label: 'last hour' },
                { id: 'day', label: 'last 24 hours' },
                { id: 'week', label: 'last 7 days' },
                { id: 'month', label: 'last 30 days' },
                { id: 'year', label: 'last year' }
              ]
            }
          ]
        }
      ],
      actions: [
        {
          id: 'set_power',
          title: 'Turn plug',
          args: [
            {
              name: 'onoff',
              type: 'dropdown',
              values: [
                { id: 'on', label: 'On' },
                { id: 'off', label: 'Off' },
                { id: 'toggle', label: 'Toggle' }
              ]
            }
          ]
        },
        {
          id: 'set_usb_power',
          title: 'Set USB port',
          args: [
            {
              name: 'onoff',
              type: 'dropdown',
              values: [
                { id: 'on', label: 'On' },
                { id: 'off', label: 'Off' },
                { id: 'toggle', label: 'Toggle' }
              ]
            }
          ]
        },
        {
          id: 'reset_energy',
          title: 'Reset energy counter',
          args: []
        }
      ]
    }
  }
];

/**
 * Main function to enhance the device database
 */
async function enhanceDeviceDatabase() {
  console.log('🚀 Enhancing device database...');
  
  // Load existing device database
  let deviceDatabase = { devices: [] };
  
  if (fs.existsSync(DEVICE_DB_FILE)) {
    const data = fs.readFileSync(DEVICE_DB_FILE, 'utf8');
    try {
      deviceDatabase = JSON.parse(data);
      console.log(`📊 Loaded ${deviceDatabase.devices?.length || 0} devices from existing database`);
    } catch (error) {
      console.error('❌ Error parsing device database:', error.message);
      process.exit(1);
    }
  } else {
    console.log('ℹ️ No existing device database found, creating a new one');
  }
  
  // Merge with additional devices
  const existingModels = new Set(deviceDatabase.devices.map(d => d.model.toLowerCase()));
  let newDevices = 0;
  
  for (const device of ADDITIONAL_DEVICES) {
    if (!existingModels.has(device.model.toLowerCase())) {
      deviceDatabase.devices.push(device);
      newDevices++;
      console.log(`➕ Added new device: ${device.manufacturer} ${device.model} - ${device.description}`);
    } else {
      // Update existing device
      const index = deviceDatabase.devices.findIndex(d => d.model.toLowerCase() === device.model.toLowerCase());
      if (index !== -1) {
        // Merge the existing device with the new data
        deviceDatabase.devices[index] = { ...deviceDatabase.devices[index], ...device };
        console.log(`🔄 Updated device: ${device.manufacturer} ${device.model}`);
      }
    }
  }
  
  // Save enhanced database
  fs.writeFileSync(ENHANCED_DB_FILE, JSON.stringify(deviceDatabase, null, 2));
  
  console.log(`\n✨ Device database enhanced successfully!`);
  console.log(`📊 Total devices: ${deviceDatabase.devices.length}`);
  console.log(`🆕 New devices added: ${newDevices}`);
  console.log(`💾 Enhanced database saved to: ${ENHANCED_DB_FILE}`);
  
  return deviceDatabase;
}

// Run the enhancement
enhanceDeviceDatabase().catch(error => {
  console.error('❌ Error enhancing device database:', error);
  process.exit(1);
});
