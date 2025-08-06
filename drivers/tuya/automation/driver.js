'use strict';

const { TuyaDevice } = require('homey-tuya');

class TuyaAutomationDriver extends TuyaDevice {
  async onInit() {
    await super.onInit();
    
    this.log('TuyaAutomationDriver initialized');
    
    // Register capabilities based on category
    
    // Register automation capabilities
    this.registerCapability('button', 'button_1');
    
    // Setup polling
    this.setupPolling();
    
    // Setup advanced features
    this.setupAdvancedFeatures();
  }

  
    // Register automation capabilities
    this.registerCapability('button', 'button_1');

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('TuyaAutomationDriver settings changed');
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

module.exports = TuyaAutomationDriver;