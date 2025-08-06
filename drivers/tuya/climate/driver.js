'use strict';

const { TuyaDevice } = require('homey-tuya');

class TuyaClimateDriver extends TuyaDevice {
  async onInit() {
    await super.onInit();
    
    this.log('TuyaClimateDriver initialized');
    
    // Register capabilities based on category
    
    // Register climate capabilities
    this.registerCapability('measure_temperature', 'cur_temp');
    this.registerCapability('measure_humidity', 'cur_humidity');
    this.registerCapability('target_temperature', 'temp_set');
    
    // Setup polling
    this.setupPolling();
    
    // Setup advanced features
    this.setupAdvancedFeatures();
  }

  
    // Register climate capabilities
    this.registerCapability('measure_temperature', 'cur_temp');
    this.registerCapability('measure_humidity', 'cur_humidity');
    this.registerCapability('target_temperature', 'temp_set');

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('TuyaClimateDriver settings changed');
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

module.exports = TuyaClimateDriver;