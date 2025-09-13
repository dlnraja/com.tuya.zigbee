'use strict';

const Homey = require('homey');

class TuyaZigbeeApp extends Homey.App {

  async onInit() {
    this.log('Tuya Zigbee App has been initialized');
    this.log('Supporting 650+ Tuya Zigbee devices with local communication only');
    
    // Initialize basic app settings following Johan Benz standards
    await this.initializeAppSettings();
    
    this.log('Tuya Zigbee App ready - Professional device support enabled');
  }

  /**
   * Initialize basic app settings following Johan Benz standards
   */
  async initializeAppSettings() {
    try {
      // Battery reporting optimization 
      this.batteryReportingInterval = 300000; // 5 minutes
      
      // Motion sensor debounce
      this.motionDebounceTime = 30000; // 30 seconds
      
      // Temperature/Humidity reporting interval
      this.sensorReportingInterval = 300000; // 5 minutes
      
      this.log('Basic app settings initialized successfully');
    } catch (error) {
      this.error('Failed to initialize app settings:', error);
    }
  }

}

module.exports = TuyaZigbeeApp;
