const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaUniversalFallbackDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Tuya Universal Fallback Driver initialized');
    
    // This driver catches ALL unknown Tuya devices for analysis
    this.catchAllMode = true;
    this.deviceLearningDatabase = new Map();
    
    // Flow cards for unknown device analysis
    this.setupFlowCards();
  }

  setupFlowCards() {
    // Trigger card for unknown DP detection
    this.homey.flow.getDeviceTriggerCard('unknown_dp_received')
      .registerRunListener(async (args, state) => {
        return args.dp === state.dp;
      });

    // Action card to manually map DP
    this.homey.flow.getDeviceActionCard('map_dp_to_capability')
      .registerRunListener(async (args) => {
        const device = args.device;
        await device.mapDPToCapability(args.dp, args.capability);
        return true;
      });
  }

  async onPair(session) {
    this.log('Universal fallback pairing started');
    
    session.setHandler('list_devices', async () => {
      return await this.onPairListDevices();
    });

    session.setHandler('manual_pairing', async (data) => {
      return await this.handleManualPairing(data);
    });
  }

  async onPairListDevices() {
    const discoveredDevices = this.getDiscoveredDevices();
    const fallbackDevices = [];
    
    // Only catch devices that haven't been handled by other drivers
    for (const [deviceId, device] of Object.entries(discoveredDevices)) {
      if (this.shouldCatchDevice(device)) {
        const deviceConfig = this.createFallbackDeviceConfig(device);
        fallbackDevices.push(deviceConfig);
        
        this.log("Caught unknown device: ${device.manufacturerName} - ${device.modelId}");
      }
    
    return fallbackDevices;
  }

  shouldCatchDevice(device) {
    const manufacturerName = device.manufacturerName || '';
    const modelId = device.modelId || '';
    
    // Catch any Tuya device that might be unknown
    const isTuyaDevice = manufacturerName.startsWith('_TZ') || 
                        manufacturerName.includes('Tuya') ||
                        modelId.startsWith('TS');
    
    // Also catch devices with EF00 cluster (manuSpecificTuya)
    const hasEF00 = device.clusters && device.clusters.includes(61184);
    
    return isTuyaDevice || hasEF00;
  }

  createFallbackDeviceConfig(device) {
    return {
      name: this.generateFallbackName(device),
      data: {
        ieeeAddress: device.ieeeAddress,
        networkAddress: device.networkAddress,
        modelId: device.modelId || 'UNKNOWN',
        manufacturerName: device.manufacturerName || 'UNKNOWN_TUYA'
      },
      capabilities: ['onoff'], // Start minimal, will expand dynamically
      settings: {
        device_learning_mode: true,
        log_all_data: true,
        auto_map_capabilities: true,
        ai_enhancement_mode: false
      },
      store: {
        fallback_device: true,
        discovery_timestamp: Date.now(),
        learning_phase: 'initial'
      }
    };
  }

  generateFallbackName(device) {
    const manufacturerName = device.manufacturerName || 'Unknown';
    const modelId = device.modelId || 'Device';
    const deviceSuffix = device.ieeeAddress ? 
      device.ieeeAddress.substr(-4) : 
      Math.random().toString(16).substr(-4);
    
    return `${manufacturerName} ${modelId} (${deviceSuffix})`;
  }

  async handleManualPairing(data) {
    this.log('Manual pairing data received:', data);
    
    // Allow manual device configuration
    return {
      name: data.name || 'Manual Tuya Device',
      data: data.deviceData,
      capabilities: data.capabilities || ['onoff'],
      settings: {
        device_learning_mode: true,
        log_all_data: true,
        auto_map_capabilities: true,
        ai_enhancement_mode: data.aiMode || false
      }
    };
  }

  // Universal device matching - catch everything unknown
  onMapDeviceClass(device) {
    if (this.shouldCatchDevice(device)) {
      this.log('Universal fallback caught device:', device.manufacturerName);
      return 'other'; // Generic class for unknown devices
    }
    
    return null;
  }

  // Store learning data for future driver development
  async storeDeviceLearningData(deviceId, learningData) {
    const existingData = this.deviceLearningDatabase.get(deviceId) || [];
    existingData.push({
      ...learningData,
      timestamp: Date.now()
    });
    
    this.deviceLearningDatabase.set(deviceId, existingData);
    
    // Periodically save to file for analysis
    if (existingData.length % 10 === 0) {
      await this.saveLearningDatabase();
    }

  async saveLearningDatabase() {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const databasePath = path.join(__dirname, '../../../data/device-learning-database.json');
      const data = Object.fromEntries(this.deviceLearningDatabase);
      
      await fs.writeFile(databasePath, JSON.stringify(data, null, 2));
      this.log('Learning database saved with', Object.keys(data).length, 'devices');
      
    } catch (error) {
      this.error('Failed to save learning database:', error);
    }

  async onDeleted() {
    // Save all learning data before deletion
    await this.saveLearningDatabase();
    this.log('Universal fallback driver cleaned up');
  }

}

module.exports = TuyaUniversalFallbackDriver;
