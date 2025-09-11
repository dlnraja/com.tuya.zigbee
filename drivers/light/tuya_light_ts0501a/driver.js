const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaLightTS0501A extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('Tuya Light TS0501A initialized');
    
    // Register capabilities based on device type
        this.registerCapability('onoff', 'onOff');
    this.registerCapability('dim', 'levelControl');
    
    // Apply Tuya-specific optimizations
    await this.applyTuyaLightOptimizations();
    
    // Set energy approximation
    this.setEnergyApproximation({"usageConstant":6});
  }
  
  async applyTuyaLightOptimizations() {
    // Tuya lights often need special handling for smooth dimming
    if (this.hasCapability('dim')) {
      this.registerCapability('dim', 'levelControl', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 1,
            maxInterval: 3600,
            minChange: 1,
          },
      });
    }
    
    // Color temperature optimization for CCT bulbs
    if (this.hasCapability('light_temperature')) {
      this.registerCapability('light_temperature', 'colorControl', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 1,
            maxInterval: 3600,
            minChange: 1,
          },
      });
    }
    
    // RGB color optimization
    if (this.hasCapability('light_hue') && this.hasCapability('light_saturation')) {
      this.registerCapability('light_hue', 'colorControl');
      this.registerCapability('light_saturation', 'colorControl');
    }
}

module.exports = TuyaLightTS0501A;