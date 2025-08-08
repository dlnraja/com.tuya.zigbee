// Enhanced by Mega Ultimate Bug Fixer
// Device Type: zigbee
// Category: lights

// Enrichment Date: 2025-08-07T17:53:55.418Z

'use strict';

const { ZigbeeDevice } = require('homey-zigbee');

class ZigbeeLightsDevice extends ZigbeeDevice {
  async onInit() {
    await super.onInit();
    
    // Logique d'initialisation spécifique aux lumières
    this.log('Zigbee Lights Device initialized');
    
    // Enregistrer les capacités
    this.registerCapability('onoff', 'genOnOff');
    this.registerCapability('dim', 'genLevelCtrl');
    this.registerCapability('light_hue', 'lightingColorCtrl');
    this.registerCapability('light_saturation', 'lightingColorCtrl');
    this.registerCapability('light_temperature', 'lightingColorCtrl');
    
    // Écouteurs d'événements
    this.on('capability:onoff:changed', this.onCapabilityOnOff.bind(this));
    this.on('capability:dim:changed', this.onCapabilityDim.bind(this));
    this.on('capability:light_hue:changed', this.onCapabilityLightHue.bind(this));
    this.on('capability:light_saturation:changed', this.onCapabilityLightSaturation.bind(this));
    this.on('capability:light_temperature:changed', this.onCapabilityLightTemperature.bind(this));
  }

  async onCapabilityOnOff(value, opts) {
    try {
      await this.setClusterData('genOnOff', { onOff: value });
      this.log('OnOff capability changed:', value);
    } catch (error) {
      this.error('Error setting onoff capability:', error);
    }
  }

  async onCapabilityDim(value, opts) {
    try {
      await this.setClusterData('genLevelCtrl', { currentLevel: Math.round(value * 100) });
      this.log('Dim capability changed:', value);
    } catch (error) {
      this.error('Error setting dim capability:', error);
    }
  }

  async onCapabilityLightHue(value, opts) {
    try {
      await this.setClusterData('lightingColorCtrl', { currentHue: Math.round(value) });
      this.log('Light hue capability changed:', value);
    } catch (error) {
      this.error('Error setting light hue capability:', error);
    }
  }

  async onCapabilityLightSaturation(value, opts) {
    try {
      await this.setClusterData('lightingColorCtrl', { currentSaturation: Math.round(value) });
      this.log('Light saturation capability changed:', value);
    } catch (error) {
      this.error('Error setting light saturation capability:', error);
    }
  }

  async onCapabilityLightTemperature(value, opts) {
    try {
      await this.setClusterData('lightingColorCtrl', { colorTemperature: Math.round(value) });
      this.log('Light temperature capability changed:', value);
    } catch (error) {
      this.error('Error setting light temperature capability:', error);
    }
  }

  async onSettings(oldSettings, newSettings, changedKeys) {
    // Gestion des paramètres
    this.log('Settings updated:', changedKeys);
  }

  async onDeleted() {
    // Nettoyage lors de la suppression
    this.log('Zigbee Lights Device deleted');
  }
}

module.exports = ZigbeeLightsDevice; 