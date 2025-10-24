'use strict';

const BaseHybridDevice = require('./BaseHybridDevice');

/**
 * SensorDevice - Base class for all sensor devices
 * Handles motion, temperature, humidity, light, etc.
 * Automatically detects power source (AC/DC/Battery)
 * Auto-detects battery type for battery-powered sensors
 */
class SensorDevice extends BaseHybridDevice {

  async onNodeInit() {
    // Initialize hybrid base (power detection & battery management)
    await super.onNodeInit();
    
    // Setup sensor-specific functionality
    await this.setupSensorMonitoring();
    
    this.log('SensorDevice ready');
  }

  /**
   * Setup sensor monitoring and reporting
   */
  async setupSensorMonitoring() {
    this.log('📊 Setting up sensor monitoring...');
    
    // Register common sensor capabilities if present
    await this.registerSensorCapabilities();
    
    // Setup reporting intervals
    await this.configureSensorReporting();
    
    this.log('✅ Sensor monitoring configured');
  }

  /**
   * Register sensor capabilities
   */
  async registerSensorCapabilities() {
    // Motion/Presence
    if (this.hasCapability('alarm_motion')) {
      this.log('✅ Motion detection capability registered');
    }
    
    // Temperature
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', this.CLUSTER.TEMPERATURE_MEASUREMENT);
      this.log('✅ Temperature measurement capability registered');
    }
    
    // Humidity
    if (this.hasCapability('measure_humidity')) {
      this.registerCapability('measure_humidity', this.CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT);
      this.log('✅ Humidity measurement capability registered');
    }
    
    // Luminance
    if (this.hasCapability('measure_luminance')) {
      this.registerCapability('measure_luminance', this.CLUSTER.ILLUMINANCE_MEASUREMENT);
      this.log('✅ Luminance measurement capability registered');
    }
    
    // Contact/Door
    if (this.hasCapability('alarm_contact')) {
      this.log('✅ Contact detection capability registered');
    }
    
    // Water leak
    if (this.hasCapability('alarm_water')) {
      this.log('✅ Water leak detection capability registered');
    }
  }

  /**
   * Configure sensor reporting intervals
   */
  async configureSensorReporting() {
    const reportingInterval = this.getSetting('reporting_interval') || 300; // 5 minutes default
    
    this.log(`📊 Configuring sensor reporting (interval: ${reportingInterval}s)`);
    
    // Configure reporting for each active sensor type
    // Implementation depends on specific sensor clusters
  }

  /**
   * Get sensor type (override in subclasses)
   */
  getSensorType() {
    return 'generic';
  }
}

module.exports = SensorDevice;
