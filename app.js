'use strict';

const Homey = require('homey');
const IntelligentDeviceSelector = require('./lib/IntelligentDeviceSelector');
const DeviceImageGenerator = require('./lib/DeviceImageGenerator');

class UltimateZigbeeHubApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('Ultimate Zigbee Hub has been initialized with 850+ device coverage');
    
    // Initialize intelligent device selection system
    this.deviceSelector = new IntelligentDeviceSelector();
    this.imageGenerator = new DeviceImageGenerator();
    
    this.log('Intelligent device selection system loaded');
    this.log('Device categories available:', Object.keys(this.deviceSelector.deviceCategories).length);
    this.log('Manufacturer database entries:', Object.keys(this.deviceSelector.manufacturerDatabase).length);
    
    // Generate device matrix for enhanced user experience
    const deviceMatrix = this.deviceSelector.generateDeviceMatrix();
    this.log('Generated device matrix with Johan Benz organization standards');
    
    // Store for driver access
    this.homey.app.deviceMatrix = deviceMatrix;
    this.homey.app.deviceSelector = this.deviceSelector;
    this.homey.app.imageGenerator = this.imageGenerator;
  }

  /**
   * Get device recommendations for pairing
   */
  getDeviceRecommendations(category) {
    return this.deviceSelector.getRecommendedDevices(category);
  }

  /**
   * Get intelligent pairing assistance
   */
  getPairingAssistance(deviceType, manufacturerId) {
    return {
      instructions: this.deviceSelector.getPairingInstructions(deviceType, manufacturerId),
      description: this.imageGenerator.generatePairingInstructions(deviceType),
      deviceInfo: this.imageGenerator.generateDeviceInfo(deviceType)
    };
  }

  /**
   * Generate comprehensive device documentation
   */
  generateDeviceDocumentation() {
    return {
      categories: this.deviceSelector.generateDeviceMatrix(),
      devices: this.imageGenerator.generateDeviceMatrix(),
      totalDevices: Object.keys(this.imageGenerator.deviceIcons).length,
      totalCategories: Object.keys(this.deviceSelector.deviceCategories).length
    };
  }
}

module.exports = UltimateZigbeeHubApp;
