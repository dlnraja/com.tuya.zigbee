'use strict';

const { TuyaDevice } = require('homey-tuya');

<<<<<<< HEAD
class TuyaLightsDriver extends TuyaDevice {
  async onInit() {
    await super.onInit();
    
    this.log('TuyaLightsDriver initialized');
    
    // Register capabilities based on category
    
    // Register light capabilities
=======
class TuyaLightDriver extends TuyaDevice {
  async onInit() {
    await super.onInit();
    
    this.log('Tuya Light Driver initialized');
    
    // Register capabilities
>>>>>>> master
    this.registerCapability('onoff', 'switch_1');
    this.registerCapability('dim', 'brightness_1');
    this.registerCapability('light_hue', 'colour_data');
    this.registerCapability('light_saturation', 'colour_data');
    this.registerCapability('light_temperature', 'colour_data');
<<<<<<< HEAD
    
    // Setup polling
    this.setupPolling();
    
    // Setup advanced features
    this.setupAdvancedFeatures();
  }

  
    // Register light capabilities
    this.registerCapability('onoff', 'switch_1');
    this.registerCapability('dim', 'brightness_1');
    this.registerCapability('light_hue', 'colour_data');
    this.registerCapability('light_saturation', 'colour_data');
    this.registerCapability('light_temperature', 'colour_data');

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('TuyaLightsDriver settings changed');
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

module.exports = TuyaLightsDriver;
=======
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Tuya Light settings changed');
  }
}

module.exports = TuyaLightDriver; 
>>>>>>> master
