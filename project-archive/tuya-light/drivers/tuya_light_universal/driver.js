const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaLightUniversal extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('Universal Tuya Light initialized');
    
    // Auto-detect capabilities based on supported clusters
    await this.autoDetectCapabilities(zclNode);
    
    // Apply universal optimizations
    await this.applyUniversalOptimizations();
  }
  
  async autoDetectCapabilities(zclNode) {
    const endpoint = zclNode.endpoints[1];
    if (!endpoint) return;
    
    // Always register basic on/off
    if (endpoint.clusters.onOff) {
      this.registerCapability('onoff', 'onOff');
    }
    
    // Check for dimming support
    if (endpoint.clusters.levelControl) {
      if (!this.hasCapability('dim')) {
        await this.addCapability('dim');
      }
      this.registerCapability('dim', 'levelControl');
    }
    
    // Check for color control
    if (endpoint.clusters.colorControl) {
      const colorCapabilities = endpoint.clusters.colorControl.attributes;
      
      // Color temperature
      if (colorCapabilities.colorTemperature) {
        if (!this.hasCapability('light_temperature')) {
          await this.addCapability('light_temperature');
        }
        this.registerCapability('light_temperature', 'colorControl');
      }
      
      // Hue and Saturation (RGB)
      if (colorCapabilities.currentHue && colorCapabilities.currentSaturation) {
        if (!this.hasCapability('light_hue')) {
          await this.addCapability('light_hue');
        }
        if (!this.hasCapability('light_saturation')) {
          await this.addCapability('light_saturation');
        }
        this.registerCapability('light_hue', 'colorControl');
        this.registerCapability('light_saturation', 'colorControl');
      }
    }
  }
  
  async applyUniversalOptimizations() {
    // Set energy approximation based on detected capabilities
    let usageConstant = 5; // Base consumption
    
    if (this.hasCapability('dim')) usageConstant += 2;
    if (this.hasCapability('light_temperature')) usageConstant += 1;
    if (this.hasCapability('light_hue')) usageConstant += 2;
    
    this.setEnergyApproximation({ usageConstant });
    
    // Optimize reporting intervals for smooth operation
    this.configureReporting();
  }
  
  configureReporting() {
    const reportOpts = {
      configureAttributeReporting: {
        minInterval: 1,
        maxInterval: 3600,
        minChange: 1,
      },
    };
    
    // Apply to all registered capabilities
    ['onoff', 'dim', 'light_temperature', 'light_hue', 'light_saturation'].forEach(cap => {
      if (this.hasCapability(cap)) {
        // Reconfigure with optimized settings
        const cluster = this.getClusterCapability(cap);
        if (cluster) {
          this.registerCapability(cap, cluster, { reportOpts });
        }
      }
    });
  }
}

module.exports = TuyaLightUniversal;