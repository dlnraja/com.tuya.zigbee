const { ZigBeeDriver } = require('homey-zigbeedriver');

class RS0201MotionSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('RS0201 Motion Sensor Driver has been initialized');
    
    // Enable debug mode for development
    this.enableDebug();
    
    // Initialize driver-specific configurations
    await this.initializeDriverConfig();
  }

  async initializeDriverConfig() {
    // Configure driver settings specific to RS0201
    this.driverConfig = {
      supportedClusters: ['genBasic', 'genIdentify', 'genPowerCfg', 'msOccupancySensing'],
      defaultSettings: {
        sensitivity: 5,
        apply_battery_fix: true
      },
      batteryReportingFix: true
    };
    
    this.log('Driver configuration initialized:', this.driverConfig);
  }

  async onPair(session) {
    this.log('RS0201 Motion Sensor pairing started');
    
    session.setHandler('list_devices', async () => {
      return await this.onPairListDevices();
    });

    session.setHandler('pincode', async (pincode) => {
      return await this.onPairPincode(pincode);
    });

    session.setHandler('get_device', async (device) => {
      return await this.onPairGetDevice(device);
    });
  }

  async onPairListDevices() {
    this.log('Listing RS0201 devices for pairing...');
    
    // Get discovered devices from Zigbee network
    const discoveredDevices = this.getDiscoveredDevices();
    
    return Object.values(discoveredDevices).map(device => {
      this.log('Found RS0201 device:', device.modelId);
      
      return {
        name: `RS0201 Motion Sensor (${device.ieeeAddress.substr(-4)})`,
        data: {
          ieeeAddress: device.ieeeAddress,
          networkAddress: device.networkAddress,
          modelId: device.modelId || 'RS0201',
          manufacturerName: device.manufacturerName || '_TZ3000_qaaysllp'
        },
        capabilities: ['alarm_motion', 'measure_battery'],
        capabilitiesOptions: {
          alarm_motion: {
            title: {
              en: 'Motion',
              fr: 'Mouvement'
            }
          },
          measure_battery: {
            title: {
              en: 'Battery',
              fr: 'Batterie'
            },
            units: '%'
          }
        },
        settings: this.driverConfig.defaultSettings
      };
    });
  }

  async onPairPincode(pincode) {
    this.log('Pincode received for RS0201:', pincode);
    // RS0201 typically uses standard Zigbee pairing without pincode
    return true;
  }

  async onPairGetDevice(device) {
    this.log('Configuring RS0201 device:', device.data.ieeeAddress);
    
    // Apply device-specific configuration
    device.settings = {
      ...this.driverConfig.defaultSettings,
      ...device.settings
    };
    
    // Configure clusters and bindings
    if (device.data.modelId === 'RS0201') {
      device.store = {
        batteryFix: this.driverConfig.batteryReportingFix,
        lastMotionReset: Date.now()
      };
    }
    
    return device;
  }

  // Device matching for automatic discovery
  onMapDeviceClass(device) {
    const { modelId, manufacturerName } = device;
    
    // Match RS0201 variants
    if (modelId === 'RS0201' || 
        (manufacturerName && manufacturerName.includes('_TZ3000_qaaysllp')) ||
        (manufacturerName && manufacturerName.includes('_TZ3000_'))) {
      
      this.log('RS0201 device matched:', { modelId, manufacturerName });
      return 'sensor';
    }
    
    return null;
  }

  // Handle device removal
  async onDeleted() {
    this.log('RS0201 Motion Sensor Driver cleaned up');
  }

  // Utility methods for RS0201 specific functionality
  async applyBatteryFix(device) {
    if (!device.getSetting('apply_battery_fix')) return;
    
    try {
      // Community patch for battery reporting issues
      await device.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600, // 1 hour
          maxInterval: 21600, // 6 hours  
          minChange: 5 // 5% change
        }
      ]);
      
      this.log('Battery reporting fix applied to RS0201');
    } catch (error) {
      this.error('Failed to apply battery fix:', error);
    }

  async configureMotionSensing(device) {
    try {
      // Configure motion detection reporting
      await device.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: 'msOccupancySensing',
          attributeName: 'occupancy',
          minInterval: 0, // Immediate reporting
          maxInterval: 300, // 5 minutes max
          minChange: 1 // Any change
        }
      ]);
      
      this.log('Motion sensing configured for RS0201');
    } catch (error) {
      this.error('Failed to configure motion sensing:', error);
    }

}

module.exports = RS0201MotionSensorDriver;
