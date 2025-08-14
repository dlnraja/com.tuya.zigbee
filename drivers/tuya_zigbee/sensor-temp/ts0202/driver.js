'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Ts0202DeviceStandardDefaultDriver extends ZigBeeDriver {
  
  async onNodeInit({ zclNode, hasChildren }) {
    await super.onNodeInit({ zclNode, hasChildren });
    
    this.log('Driver initialized for:', this.getData().id);
    
    // Configuration des capabilities
    this.registerCapability('onoff', 'genOnOff');
    
    // Si c'est un driver de lumière, ajouter les capabilities appropriées
    if (category === 'light') {
      this.registerCapability('dim', 'genLevelCtrl');
      this.registerCapability('light_hue', 'genLevelCtrl');
      this.registerCapability('light_saturation', 'genLevelCtrl');
      this.registerCapability('light_temperature', 'genLevelCtrl');
    }
    
    // Si c'est un capteur, ajouter les capabilities appropriées
    if (category.startsWith('sensor-')) {
      if (category.includes('temp')) {
        this.registerCapability('measure_temperature', 'genBasic');
      }
      if (category.includes('humidity')) {
        this.registerCapability('measure_humidity', 'genBasic');
      }
      if (category.includes('motion')) {
        this.registerCapability('alarm_motion', 'genBasic');
      }
      if (category.includes('contact')) {
        this.registerCapability('alarm_contact', 'genBasic');
      }
    }
  }
  
  async onPairListDevices() {
    return [];
  }
}

module.exports = Ts0202DeviceStandardDefaultDriver;
