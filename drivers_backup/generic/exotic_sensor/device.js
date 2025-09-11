const BaseZigbeeDevice = require('../../common/BaseZigbeeDevice');
const { CLUSTER } = require('zigbee-clusters');

class TuyaExoticSensorDevice extends BaseZigbeeDevice {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    
    // Initialize exotic sensor detection system
    this.sensorType = this.getSetting('sensor_type') || 'auto';
    this.dpMappings = new Map();
    this.unknownDPs = new Set();
    
    // Enhanced DP mapping for exotic devices
    this.commonDPMappings = {
      // Standard mappings from Zigbee2MQTT
      1: 'onoff',           // Common on/off state
      2: 'brightness',      // Brightness/level
      101: 'battery',       // Battery percentage
      102: 'temperature',   // Temperature (soil sensors)
      103: 'humidity',      // Humidity/moisture
      104: 'presence',      // Motion/presence (radar)
      105: 'co2',          // CO2 level (air quality)
      106: 'pm25',         // PM2.5 (air quality)
      107: 'rain_state',   // Rain detection
      108: 'leak_state',   // Water leak
      109: 'illuminance'   // Light sensor
    };
    
    await this.initializeExoticSensor();
  }

  async initializeExoticSensor() {
    // Auto-detect sensor type based on manufacturer/model
    if (this.sensorType === 'auto') {
      this.sensorType = await this.detectSensorType();
      this.log("Auto-detected sensor type: ${this.sensorType}");
    }
    
    // Configure based on detected type
    await this.configureSensorType();
    
    // Setup EF00 cluster monitoring for exotic devices
    await this.setupEF00Monitoring();
    
    this.log("Exotic sensor initialized as ${this.sensorType}");
  }

  async detectSensorType() {
    const manufacturerName = this.getData().manufacturerName || '';
    const modelId = this.getData().modelId || '';
    
    // Detection logic based on manufacturer patterns from memories
    if (manufacturerName.includes('_TZ3000_4fjiwweb') || modelId === 'QT-07S') {
      return 'soil_moisture';
    } else if (manufacturerName.includes('_TZE200_ztc6ggyl') && modelId === 'TS0601') {
      return 'radar_motion';
    } else if (manufacturerName.includes('_TZE200_yvx5lh6k') && modelId === 'TS0601') {
      return 'air_quality';
    } else if (manufacturerName.includes('_TZ3000_ocjlo4ea')) {
      return 'rain_sensor';
    } else if (manufacturerName.includes('_TZE200_qq9mpfhw')) {
      return 'fingerbot';
    } else if (manufacturerName.includes('_TZE204_xalsoe3m')) {
      return 'advanced_thermostat';
    }
    
    return 'generic_exotic';
  }

  async configureSensorType() {
    const capabilities = [];
    
    switch (this.sensorType) {
      case 'soil_moisture':
        capabilities.push('measure_temperature', 'measure_humidity', 'measure_battery');
        break;
        
      case 'radar_motion':
        capabilities.push('alarm_motion', 'measure_battery');
        break;
        
      case 'air_quality':
        capabilities.push('measure_co2', 'measure_pm25', 'measure_temperature', 'measure_humidity');
        break;
        
      case 'rain_sensor':
      case 'flood_sensor':
        capabilities.push('alarm_water', 'measure_battery', 'measure_temperature');
        break;
        
      default:
        // Generic: enable all possible capabilities for unknown devices
        capabilities.push('measure_temperature', 'measure_humidity', 'measure_battery', 'alarm_motion');
    }
    
    // Register only the capabilities this device needs
    for (const capability of capabilities) {
      if (this.hasCapability(capability)) {
        await this.configureCapabilityForExotic(capability);
      }
  }

  async configureCapabilityForExotic(capability) {
    try {
      switch (capability) {
        case 'measure_temperature':
          this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
            reportParser: (value) => this.parseTemperatureDP(value)
          });
          break;
          
        case 'measure_humidity':
          this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT, {
            reportParser: (value) => this.parseHumidityDP(value)
          });
          break;
          
        case 'measure_battery':
          this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
            reportParser: (value) => this.parseBatteryDP(value)
          });
          break;
          
        case 'alarm_motion':
          this.registerCapability('alarm_motion', CLUSTER.OCCUPANCY_SENSING, {
            reportParser: (value) => this.parseMotionDP(value)
          });
          break;
          
        case 'measure_co2':
          this.registerCapability('measure_co2', CLUSTER.CARBON_DIOXIDE_MEASUREMENT, {
            reportParser: (value) => this.parseCO2DP(value)
          });
          break;
      }
    } catch (error) {
      this.error("Failed to configure capability ${capability}:", error);
    }

  async setupEF00Monitoring() {
    try {
      // Monitor EF00 cluster for Tuya-specific datapoints
      if (this.zclNode.endpoints[1]?.clusters?.manuSpecificTuya) {
        this.zclNode.endpoints[1].clusters.manuSpecificTuya.on('datapoint', (dp, value) => {
          this.handleTuyaDatapoint(dp, value);
        });
        
        this.log('EF00 cluster monitoring enabled for exotic device');
      }
    } catch (error) {
      this.error('Failed to setup EF00 monitoring:', error);
    }

  handleTuyaDatapoint(dp, value) {
    const debugLogging = this.getSetting('debug_dp_logging');
    
    if (debugLogging) {
      this.log("Tuya DP received: ${dp} = ${value}");
    }
    
    // Check if we have a known mapping
    if (this.commonDPMappings[dp]) {
      const mappedCapability = this.commonDPMappings[dp];
      this.handleMappedDP(dp, value, mappedCapability);
    } else {
      // Unknown DP - log for future mapping
      this.unknownDPs.add(dp);
      this.log("Unknown DP detected: ${dp} with value: ${value}");
      
      if (this.getSetting('dp_mapping_mode')) {
        this.attemptAutoMapping(dp, value);
      }
  }

  handleMappedDP(dp, value, mappedCapability) {
    try {
      switch (mappedCapability) {
        case 'temperature':
          if (this.hasCapability('measure_temperature')) {
            const temp = this.parseTemperatureDP(value);
            this.setCapabilityValue('measure_temperature', temp);
          }
          break;
          
        case 'humidity':
          if (this.hasCapability('measure_humidity')) {
            const humidity = this.parseHumidityDP(value);
            this.setCapabilityValue('measure_humidity', humidity);
          }
          break;
          
        case 'battery':
          if (this.hasCapability('measure_battery')) {
            const battery = this.parseBatteryDP(value);
            this.setCapabilityValue('measure_battery', battery);
          }
          break;
          
        case 'presence':
          if (this.hasCapability('alarm_motion')) {
            const motion = this.parseMotionDP(value);
            this.setCapabilityValue('alarm_motion', motion);
          }
          break;
      }
    } catch (error) {
      this.error("Error handling mapped DP ${dp}:", error);
    }

  attemptAutoMapping(dp, value) {
    // Intelligent auto-mapping based on value patterns
    if (typeof value === 'boolean') {
      this.log("DP ${dp} appears to be boolean (alarm/state)");
    } else if (typeof value === 'number') {
      if (value >= 0 && value <= 100) {
        this.log("DP ${dp} appears to be percentage (battery/humidity)");
      } else if (value > 100 && value < 1000) {
        this.log("DP ${dp} appears to be measurement (temperature/CO2)");
      } else if (value >= 1000) {
        this.log("DP ${dp} appears to be large measurement (PM2.5/illuminance)");
      }
  }

  // Enhanced parsing methods with exotic device support
  parseTemperatureDP(value) {
    // Handle different temperature formats from exotic sensors
    if (this.sensorType === 'soil_moisture') {
      return value / 10; // Soil sensors often report in tenths
    }
    return value;
  }

  parseHumidityDP(value) {
    // Soil moisture sensors report differently than air humidity
    if (this.sensorType === 'soil_moisture') {
      return Math.max(0, Math.min(100, value)); // Ensure 0-100 range
    }
    return value;
  }

  parseBatteryDP(value) {
    // Enhanced battery parsing for exotic devices
    let battery = value;
    
    if (value > 100 && value <= 200) {
      battery = value / 2; // Some exotic devices report 0-200
    } else if (value > 1 && value <= 3) {
      battery = (value / 3) * 100; // Voltage-based reporting
    }
    
    return Math.max(0, Math.min(100, Math.round(battery)));
  }

  parseMotionDP(value) {
    // Radar sensors may have different motion values
    if (this.sensorType === 'radar_motion') {
      return value > 0; // Any non-zero value indicates motion
    }
    return Boolean(value);
  }

  parseCO2DP(value) {
    // Air quality sensors CO2 parsing
    return Math.max(0, value); // Ensure positive values
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Exotic sensor settings changed:', changedKeys);
    
    for (const key of changedKeys) {
      switch (key) {
        case 'sensor_type':
          if (newSettings.sensor_type !== 'auto') {
            this.sensorType = newSettings.sensor_type;
            await this.configureSensorType();
            this.log("Sensor type manually set to: ${this.sensorType}");
          }
          break;
          
        case 'dp_mapping_mode':
          this.log("DP auto-mapping ${newSettings.dp_mapping_mode ? 'enabled' : 'disabled'}");
          break;
          
        case 'debug_dp_logging':
          this.log("DP debug logging ${newSettings.debug_dp_logging ? 'enabled' : 'disabled'}");
          break;
      }
  }

  onDeleted() {
    this.log('Tuya exotic sensor device removed');
  }

module.exports = TuyaExoticSensorDevice;
