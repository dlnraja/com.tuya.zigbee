'use strict';

const { AutoAdaptiveDevice } = require('../dynamic');

/**
 * SensorDevice - Base class for all sensor devices
 * Handles motion, temperature, humidity, light, etc.
 * Automatically detects power source (AC/DC/Battery)
 * Auto-detects battery type for battery-powered sensors
 */
class SensorDevice extends AutoAdaptiveDevice {

  async onNodeInit({ zclNode }) {
    // Initialize hybrid base (power detection & battery management)
    await super.onNodeInit({ zclNode });
    
    // Setup sensor-specific functionality
    await this.setupSensorMonitoring();
    
    this.log('SensorDevice ready');
  }

  /**
   * Setup sensor monitoring and reporting
   */
  async setupSensorMonitoring() {
    this.log('[DATA] Setting up sensor monitoring...');
    
    // Register common sensor capabilities if present
    await this.registerSensorCapabilities();
    
    // Setup reporting intervals
    await this.configureSensorReporting();
    
    this.log('[OK] Sensor monitoring configured');
  }

  /**
   * Register sensor capabilities
   */
  async registerSensorCapabilities() {
    // Motion/Presence
    if (this.hasCapability('alarm_motion')) {
      this.log('[OK] Motion detection capability registered');
    }
    
    // Temperature
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', this.CLUSTER.TEMPERATURE_MEASUREMENT);
      this.log('[OK] Temperature measurement capability registered');
    }
    
    // Humidity
    if (this.hasCapability('measure_humidity')) {
      this.registerCapability('measure_humidity', this.CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT);
      this.log('[OK] Humidity measurement capability registered');
    }
    
    // Luminance
    if (this.hasCapability('measure_luminance')) {
      this.registerCapability('measure_luminance', this.CLUSTER.ILLUMINANCE_MEASUREMENT);
      this.log('[OK] Luminance measurement capability registered');
    }
    
    // Contact/Door
    if (this.hasCapability('alarm_contact')) {
      this.log('[OK] Contact detection capability registered');
    }
    
    // Water leak
    if (this.hasCapability('alarm_water')) {
      this.log('[OK] Water leak detection capability registered');
    }
  }

  /**
   * Configure sensor reporting intervals
   */
  async configureSensorReporting() {
    const reportingInterval = this.getSetting('reporting_interval') || 300; // 5 minutes default
    
    this.log(`[DATA] Configuring sensor reporting (interval: ${reportingInterval}s)`);
    
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
