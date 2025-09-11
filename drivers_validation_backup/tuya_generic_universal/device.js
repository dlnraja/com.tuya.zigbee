'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Universal Tuya Generic Device - Optimized for Future/Unknown Models
 * Supports EF00 cluster auto-detection and dynamic capability mapping
 * Based on analysis of Zigbee2MQTT patterns and community feedback
 */
class TuyaGenericUniversalDevice extends ZigBeeDevice {
  constructor() {
    super();
    this.clusterCache = new Map();
  }

  async onNodeInit() {
    await super.onNodeInit();
    
    // Auto-detect device capabilities
    this.deviceProfile = await this.detectDeviceProfile();
    this.dpMappings = this.initializeDPMappings();
    
    // Setup EF00 cluster monitoring
    await this.setupEF00Handler();
    
    // Configure detected capabilities
    await this.configureDetectedCapabilities();
    
    this.log('Universal Tuya device initialized with profile:', this.deviceProfile.type);
  }

  /**
   * Detect device profile based on available clusters and endpoints
   */
  async detectDeviceProfile() {
    const endpoints = this.getClusterEndpoints();
    const clusters = Object.values(endpoints).flat();
    
    // Profile detection patterns (optimized algorithm)
    const profiles = {
      sensor: { 
        clusters: ['msTemperatureMeasurement', 'msRelativeHumidity', 'ssIasZone', 'msOccupancySensing'],
        priority: 1
      },
      light: {
        clusters: ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl'],
        priority: 2
      },
      switch: {
        clusters: ['genOnOff', 'genBinaryInput'],
        priority: 3
      },
      cover: {
        clusters: ['closuresWindowCovering', 'genLevelCtrl'],
        priority: 4
      },
      climate: {
        clusters: ['hvacThermostat', 'hvacFanCtrl', 'msTemperatureMeasurement'],
        priority: 5
      }
    };

    let bestMatch = { type: 'unknown', score: 0 };
    
    for (const [type, config] of Object.entries(profiles)) {
      const matches = config.clusters.filter(cluster => clusters.includes(cluster)).length;
      const score = matches / config.clusters.length;
      
      if (score > bestMatch.score) {
        bestMatch = { type, score, clusters: config.clusters };
    }

    return bestMatch.score > 0.3 ? bestMatch : { type: 'generic', score: 0, clusters: [] };
  }

  /**
   * Initialize DP mappings for EF00 cluster
   */
  initializeDPMappings() {
    const commonMappings = {
      1: 'onoff',
      2: 'level',
      3: 'mode',
      101: 'battery',
      102: 'temperature',
      103: 'humidity',
      104: 'presence',
      105: 'motion'
    };

    // Profile-specific mappings
    const profileMappings = {
      sensor: { 1: 'sensor_state', 2: 'sensor_value' },
      light: { 1: 'onoff', 2: 'brightness', 5: 'color_temp' },
      switch: { 1: 'onoff', 2: 'switch_mode' },
      cover: { 1: 'position', 2: 'direction', 5: 'calibration' },
      climate: { 1: 'target_temp', 2: 'current_temp', 3: 'mode' }
    };

    return {
      ...commonMappings,
      ...(profileMappings[this.deviceProfile.type] || {})
    };
  }

  /**
   * Setup EF00 cluster handler for Tuya-specific communication
   */
  async setupEF00Handler() {
    try {
      if (this.hasCluster('manuSpecificTuya')) {
        const tuyaCluster = this.zclNode.endpoints[1].clusters.manuSpecificTuya;
        
        // Listen for datapoint reports
        tuyaCluster.on('dataReport', this.handleTuyaDataReport.bind(this));
        
        // Request device info
        await this.requestDeviceInfo();
        
        this.log('EF00 Tuya cluster handler configured');
      }
    } catch (error) {
      this.error('Failed to setup EF00 handler:', error);
    }
  }

  /**
   * Handle Tuya EF00 data reports with optimized processing
   */
  async handleTuyaDataReport(data) {
    const { dp, datatype, value } = data;
    
    this.log(`Tuya DP received: ${dp} = ${value} (type: ${datatype})`);
    
    // Map DP to capability
    const capability = this.dpMappings[dp];
    
    if (capability && this.hasCapability(capability)) {
      const processedValue = this.processDPValue(dp, value, datatype);
      await this.setCapabilityValue(capability, processedValue);
    } else {
      // Log unknown DP for future enhancement
      this.logUnknownDP(dp, value, datatype);
    }
  }

  /**
   * Process DP values based on type and expected range
   */
  processDPValue(dp, value, datatype) {
    // Common processing patterns
    switch (dp) {
      case 1: // Primary function (usually on/off)
        return datatype === 'bool' ? value : value > 0;
      
      case 2: // Level/brightness
        return typeof value === 'number' ? Math.max(0, Math.min(1, value / 255)) : value;
      
      case 101: // Battery
        return Math.max(0, Math.min(100, value));
      
      case 102: // Temperature
        return value / 10; // Usually in 0.1°C units
      
      case 103: // Humidity or presence
        return datatype === 'bool' ? value : Math.max(0, Math.min(100, value));
      
      default:
        return value;
    }

  /**
   * Configure capabilities based on detected profile
   */
  async configureDetectedCapabilities() {
    const profileCapabilities = {
      sensor: ['measure_temperature', 'measure_humidity', 'alarm_motion', 'measure_battery'],
      light: ['onoff', 'dim', 'light_temperature', 'light_hue', 'light_saturation'],
      switch: ['onoff'],
      cover: ['windowcoverings_state', 'dim'],
      climate: ['target_temperature', 'measure_temperature', 'thermostat_mode'],
      generic: ['onoff', 'measure_battery']
    };

    const capabilities = profileCapabilities[this.deviceProfile.type] || profileCapabilities.generic;
    
    // Add capabilities that exist on device
    for (const capability of capabilities) {
      if (this.hasCapability(capability)) {
        await this.setupCapabilityListener(capability);
      }
    }
  }

  /**
   * Setup capability listeners with optimized handlers
   */
  async setupCapabilityListener(capability) {
    this.registerCapabilityListener(capability, async (value) => {
      return this.sendTuyaCommand(capability, value);
    });
  }

  /**
   * Send Tuya commands via EF00 cluster
   */
  async sendTuyaCommand(capability, value) {
    const dpMapping = Object.entries(this.dpMappings)
      .find(([dp, cap]) => cap === capability);
    
    if (!dpMapping) {
      this.error(`No DP mapping found for capability: ${capability}`);
      return;
    }

    const [dp] = dpMapping;
    const processedValue = this.formatValueForTuya(capability, value);
    
    try {
      await this.zclNode.endpoints[1].clusters.manuSpecificTuya.dataRequest({
        dp: parseInt(dp),
        datatype: this.getDataType(capability, processedValue),
        data: processedValue
      });
    } catch (error) {
      this.error(`Failed to send Tuya command for ${capability}:`, error);
      throw error;
    }
  }

  /**
   * Format values for Tuya transmission
   */
  formatValueForTuya(capability, value) {
    switch (capability) {
      case 'onoff':
        return value;
      case 'dim':
        return Math.round(value * 255);
      case 'target_temperature':
        return Math.round(value * 10);
      default:
        return value;
    }

  /**
   * Get appropriate data type for Tuya commands
   */
  getDataType(capability, value) {
    if (typeof value === 'boolean') return 'bool';
    if (Number.isInteger(value)) return 'value';
    return 'raw';
  }

  /**
   * Log unknown DPs for community enhancement
   */
  logUnknownDP(dp, value, datatype) {
    const unknownDP = {
      timestamp: new Date().toISOString(),
      manufacturerName: this.getData().manufacturerName,
      modelId: this.getData().productId,
      dp,
      value,
      datatype,
      deviceProfile: this.deviceProfile.type
    };

    this.log('Unknown DP detected:', unknownDP);
    
    // Trigger flow for advanced users
    this.homey.flow.getDeviceTriggerCard('unknown_dp_received')
      .trigger(this, { dp: dp.toString(), value: value.toString() })
      .catch(this.error);
  }

  /**
   * Request device information from Tuya device
   */
  async requestDeviceInfo() {
    try {
      await this.zclNode.endpoints[1].clusters.manuSpecificTuya.dataQuery({
        dp: 0 // Device info DP
      });
    } catch (error) {
      this.log('Could not request device info:', error.message);
    }
  }

}

module.exports = TuyaGenericUniversalDevice;
