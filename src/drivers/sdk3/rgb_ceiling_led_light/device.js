'use strict';

const TuyaZigBeeLightDevice = require('../../lib/TuyaZigBeeLightDevice');

class Rgbceilingledlight extends TuyaZigBeeLightDevice {
  
  async onNodeInit({ zclNode }) {
    // SDK3 compatibility - Homey Mini/Bridge/Pro
    await super.onNodeInit({ zclNode });
    
    this.log('Rgbceilingledlight RGB Enhanced initialized');
    
    // Enhanced RGB capabilities with SDK3 syntax
    await this.registerCapability('onoff', CLUSTER.ON_OFF);
    await this.registerCapability('dim', CLUSTER.LEVEL_CONTROL);
    await this.registerCapability('light_hue', CLUSTER.COLOR_CONTROL);
    await this.registerCapability('light_saturation', CLUSTER.COLOR_CONTROL);
    await this.registerCapability('light_temperature', CLUSTER.COLOR_CONTROL);
    await this.registerCapability('light_mode', CLUSTER.COLOR_CONTROL);
    
    // Enhanced RGB control with defaults
    this.setCapabilityValue('light_mode', 'color');
    
    // Enhanced color temperature range
    this.setCapabilityValue('light_temperature', 2700);
    
    this.printNode();
  }
  
  // SDK3 compatible methods with enhanced RGB handling
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    await super.onSettings({ oldSettings, newSettings, changedKeys });
    this.log('Enhanced RGB settings updated:', changedKeys);
  }
  
  async onDeleted() {
    await super.onDeleted();
    this.log('Rgbceilingledlight RGB Enhanced deleted');
  }
  
  // Enhanced RGB error handling
  async onError(error) {
    this.log('Enhanced RGB error handling:', error);
    await super.onError(error);
  }
}

module.exports = Rgbceilingledlight;
