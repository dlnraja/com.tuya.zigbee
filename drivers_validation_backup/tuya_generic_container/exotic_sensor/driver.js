const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaExoticSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Tuya Exotic Sensor Driver initialized');
    
    // Enhanced device detection patterns for exotic Tuya devices
    this.exoticPatterns = {
      soil_sensors: ['_TZ3000_4fjiwweb', 'QT-07S', '_TZE200_myd45weu'],
      radar_sensors: ['_TZE200_ztc6ggyl', '_TZE200_7yodxhya', 'BW-IS2'],
      air_quality: ['_TZE200_yvx5lh6k', 'ZAQ01', 'ZM-AQ'],
      rain_sensors: ['_TZ3210_tgvtvdoc', '_TZ3000_ocjlo4ea', 'ZRS01'],
      flood_sensors: ['_TYZB01_sqmd19i1', 'ZBWL-EXT'],
      fingerbot: ['_TZE200_qq9mpfhw', 'ZFB01'],
      advanced_trv: ['_TZE204_xalsoe3m', 'GS361A-H04'],
      co_sensors: ['_TZ3000_1mtm8tkr', 'ZCO01']
    };
  }

  async onPair(session) {
    this.log('Exotic sensor pairing started');
    
    session.setHandler('list_devices', async () => {
      return await this.onPairListDevices();
    });

    session.setHandler('configure_device', async (device) => {
      return await this.configureExoticDevice(device);
    });
  }

  async onPairListDevices() {
    const discoveredDevices = this.getDiscoveredDevices();
    const exoticDevices = [];
    
    for (const [deviceId, device] of Object.entries(discoveredDevices)) {
      const sensorType = this.identifyExoticSensorType(device);
      
      if (sensorType !== 'unknown') {
        const deviceConfig = this.createExoticDeviceConfig(device, sensorType);
        exoticDevices.push(deviceConfig);
        this.log("Discovered exotic ${sensorType}: ${device.manufacturerName}");
      }
    
    return exoticDevices;
  }

  identifyExoticSensorType(device) {
    const manufacturerName = device.manufacturerName || '';
    const modelId = device.modelId || '';
    
    // Check against known exotic patterns
    for (const [type, patterns] of Object.entries(this.exoticPatterns)) {
      if (patterns.some(pattern => 
        manufacturerName.includes(pattern) || modelId.includes(pattern)
      )) {
        return type;
      }
    
    // Check for generic Tuya EF00 devices that might be exotic
    if (manufacturerName.startsWith('_TZ') && modelId === 'TS0601') {
      return 'generic_tuya_ef00';
    }
    
    return 'unknown';
  }

  createExoticDeviceConfig(device, sensorType) {
    const config = {
      name: this.generateDeviceName(device, sensorType),
      data: {
        ieeeAddress: device.ieeeAddress,
        networkAddress: device.networkAddress,
        modelId: device.modelId,
        manufacturerName: device.manufacturerName,
        sensorType: sensorType
      },
      capabilities: this.getCapabilitiesForType(sensorType),
      settings: {
        sensor_type: sensorType,
        dp_mapping_mode: true,
        debug_dp_logging: false
      },
      store: {
        detected_type: sensorType,
        discovery_method: 'pattern_matching'
      }
    };
    
    return config;
  }

  generateDeviceName(device, sensorType) {
    const typeNames = {
      soil_sensors: 'Soil Moisture Sensor',
      radar_sensors: 'Radar Motion Sensor',
      air_quality: 'Air Quality Sensor',
      rain_sensors: 'Rain Detector',
      flood_sensors: 'Flood Sensor',
      fingerbot: 'Smart Button Pusher',
      advanced_trv: 'Advanced Thermostat',
      co_sensors: 'CO Detector',
      generic_tuya_ef00: 'Generic Tuya Sensor'
    };
    
    const typeName = typeNames[sensorType] || 'Exotic Sensor';
    const deviceSuffix = device.ieeeAddress ? 
      device.ieeeAddress.substr(-4) : 
      Math.random().toString(16).substr(-4);
    
    return `${typeName} (${deviceSuffix})`;
  }

  getCapabilitiesForType(sensorType) {
    const capabilityMap = {
      soil_sensors: ['measure_temperature', 'measure_humidity', 'measure_battery'],
      radar_sensors: ['alarm_motion', 'measure_battery'],
      air_quality: ['measure_co2', 'measure_pm25', 'measure_temperature', 'measure_humidity'],
      rain_sensors: ['alarm_water', 'measure_battery', 'measure_temperature'],
      flood_sensors: ['alarm_water', 'measure_temperature', 'measure_humidity'],
      fingerbot: ['onoff'],
      advanced_trv: ['target_temperature', 'measure_temperature', 'measure_battery'],
      co_sensors: ['alarm_co', 'measure_battery'],
      generic_tuya_ef00: ['measure_temperature', 'measure_humidity', 'measure_battery']
    };
    
    return capabilityMap[sensorType] || ['measure_temperature', 'measure_battery'];
  }

  async configureExoticDevice(device) {
    this.log("Configuring exotic device: ${device.data.sensorType}");
    
    // Apply sensor-specific configuration
    switch (device.data.sensorType) {
      case 'soil_sensors':
        await this.configureSoilSensor(device);
        break;
        
      case 'radar_sensors':
        await this.configureRadarSensor(device);
        break;
        
      case 'air_quality':
        await this.configureAirQualitySensor(device);
        break;
        
      case 'rain_sensors':
      case 'flood_sensors':
        await this.configureWaterSensor(device);
        break;
        
      default:
        await this.configureGenericExotic(device);
    }
    
    return device;
  }

  async configureSoilSensor(device) {
    // Soil sensor specific configuration based on community feedback
    device.settings.temperature_offset = 0;
    device.settings.humidity_calibration = 1.0;
    device.settings.battery_reporting_interval = 3600; // 1 hour
    
    this.log('Soil sensor configured with calibration settings');
  }

  async configureRadarSensor(device) {
    // Radar sensor configuration for battery optimization
    device.settings.motion_sensitivity = 5;
    device.settings.detection_delay = 30; // 30 seconds
    device.settings.clear_delay = 60; // 1 minute
    
    this.log('Radar sensor configured with motion parameters');
  }

  async configureAirQualitySensor(device) {
    // Air quality sensor configuration
    device.settings.co2_threshold = 1000; // ppm
    device.settings.pm25_threshold = 35; // µg/m³
    device.settings.measurement_interval = 300; // 5 minutes
    
    this.log('Air quality sensor configured with thresholds');
  }

  async configureWaterSensor(device) {
    // Water detection sensor configuration  
    device.settings.sensitivity_level = 'medium';
    device.settings.alarm_duration = 300; // 5 minutes
    device.settings.test_mode = false;
    
    this.log('Water sensor configured with detection parameters');
  }

  async configureGenericExotic(device) {
    // Generic configuration for unknown exotic devices
    device.settings.auto_discovery = true;
    device.settings.learning_mode = true;
    device.settings.report_unknown_data = true;
    
    this.log('Generic exotic device configured for auto-discovery');
  }

  // Enhanced device matching for exotic devices
  onMapDeviceClass(device) {
    const sensorType = this.identifyExoticSensorType(device);
    
    if (sensorType !== 'unknown') {
      this.log("Matched exotic device: ${sensorType} - ${device.manufacturerName}");
      return 'sensor';
    }
    
    // Check for potential Tuya devices with EF00 cluster
    if (device.manufacturerName && device.manufacturerName.startsWith('_TZ')) {
      this.log('Potential Tuya exotic device detected');
      return 'sensor';
    }
    
    return null;
  }

  async onDeleted() {
    this.log('Exotic sensor driver cleaned up');
  }

}

module.exports = TuyaExoticSensorDriver;
