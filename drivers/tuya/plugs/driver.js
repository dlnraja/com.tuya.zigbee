'use strict';

const { TuyaDevice } = require('homey-tuya');

<<<<<<< HEAD
class TuyaPlugsDriver extends TuyaDevice {
  async onInit() {
    await super.onInit();
    
    this.log('TuyaPlugsDriver initialized');
    
    // Register capabilities based on category
    
    // Register plug capabilities
=======
class TuyaPlugDriver extends TuyaDevice {
  async onInit() {
    await super.onInit();
    
    this.log('Tuya Plug Driver initialized');
    
    // Register capabilities
>>>>>>> master
    this.registerCapability('onoff', 'switch_1');
    this.registerCapability('measure_power', 'cur_power');
    this.registerCapability('measure_current', 'cur_current');
    this.registerCapability('measure_voltage', 'cur_voltage');
<<<<<<< HEAD
    
    // Setup polling
    this.setupPolling();
    
    // Setup advanced features
    this.setupAdvancedFeatures();
  }

  
    // Register plug capabilities
    this.registerCapability('onoff', 'switch_1');
    this.registerCapability('measure_power', 'cur_power');
    this.registerCapability('measure_current', 'cur_current');
    this.registerCapability('measure_voltage', 'cur_voltage');

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('TuyaPlugsDriver settings changed');
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

module.exports = TuyaPlugsDriver;
=======
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Tuya Plug settings changed');
  }
}

module.exports = TuyaPlugDriver; 
>>>>>>> master
