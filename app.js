'use strict';

const { App } = require('homey');

class TuyaZigbeeApp extends App {
  
  async onInit() {
    this.log('Tuya Zigbee App is running...');
    
    // Initialisation des drivers
    this.log('Initializing drivers...');
    
    // Log des informations de l'app
    this.log('App ID:', this.homey.manifest.id);
    this.log('App Version:', this.homey.manifest.version);
    this.log('SDK Version:', this.homey.manifest.sdk);
  }
  
  async onUninit() {
    this.log('Tuya Zigbee App is stopping...');
  }
}

module.exports = TuyaZigbeeApp;