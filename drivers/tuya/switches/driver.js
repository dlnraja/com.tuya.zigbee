'use strict';

const { TuyaDevice } = require('homey-tuya');

<<<<<<< HEAD
class TuyaSwitchesDriver extends TuyaDevice {
  async onInit() {
    await super.onInit();
    
    this.log('TuyaSwitchesDriver initialized');
    
    // Register capabilities based on category
    
    // Register switch capabilities
    this.registerCapability('onoff', 'switch_1');
    
    // Setup polling
    this.setupPolling();
    
    // Setup advanced features
    this.setupAdvancedFeatures();
  }

  
    // Register switch capabilities
    this.registerCapability('onoff', 'switch_1');

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('TuyaSwitchesDriver settings changed');
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

module.exports = TuyaSwitchesDriver;
=======
class TuyaSwitchDriver extends TuyaDevice {
  async onInit() {
    await super.onInit();
    
    this.log('Tuya Switch Driver initialized');
    
    // Register capabilities
    this.registerCapability('onoff', 'switch_1');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Tuya Switch settings changed');
  }
}

module.exports = TuyaSwitchDriver; 
>>>>>>> master
