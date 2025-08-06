'use strict';

const { TuyaDevice } = require('homey-tuya');

class TuyaSensorsDriver extends TuyaDevice {
  async onInit() {
    await super.onInit();
    
    this.log('TuyaSensorsDriver initialized');
    
    // Register capabilities based on category
    
    // Register sensor capabilities
    this.registerCapability('measure_temperature', 'va_temperature');
    this.registerCapability('measure_humidity', 'va_humidity');
    this.registerCapability('alarm_motion', 'pir_1');
    this.registerCapability('alarm_contact', 'doorcontact_state');
    
    // Setup polling
    this.setupPolling();
    
    // Setup advanced features
    this.setupAdvancedFeatures();
  }

  
    // Register sensor capabilities
    this.registerCapability('measure_temperature', 'va_temperature');
    this.registerCapability('measure_humidity', 'va_humidity');
    this.registerCapability('alarm_motion', 'pir_1');
    this.registerCapability('alarm_contact', 'doorcontact_state');

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('TuyaSensorsDriver settings changed');
  }

  setupPolling() {
    const pollInterval = this.getSetting('poll_interval') || 30000;
    this.pollTimer = this.homey.setInterval(async () => {
      try {
        await this.poll();
      } catch (error) {
        this.error('Polling error:', error);
      }
    }, pollInterval);
  }

  setupAdvancedFeatures() {
    // Advanced features for Tuya devices
    this.enableDebug();
    this.setupErrorHandling();
    this.setupLogging();
  }

  setupErrorHandling() {
    this.on('error', (error) => {
      this.error('Device error:', error);
    });
  }

  setupLogging() {
    this.on('data', (data) => {
      this.log('Device data received:', data);
    });
  }

  async poll() {
    try {
      await this.getData();
    } catch (error) {
      this.error('Poll error:', error);
    }
  }

  async onUninit() {
    if (this.pollTimer) {
      this.homey.clearInterval(this.pollTimer);
    }
  }
}

module.exports = TuyaSensorsDriver;