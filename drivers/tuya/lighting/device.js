// Enhanced by Mega Ultimate Bug Fixer
// Device Type: tuya
// Category: lighting

// Enrichment Date: 2025-08-07T17:53:54.766Z

'use strict';

const { TuyaDevice } = require('homey-tuya');

class TuyaLightingDevice extends TuyaDevice {
  async onInit() {
    await super.onInit();
    
    // Logique d'initialisation spécifique aux appareils d'éclairage
    this.log('Tuya Lighting Device initialized');
    
    // Enregistrer les capacités
    this.registerCapability('onoff', 'switch_1');
    this.registerCapability('dim', 'bright_value_1');
    this.registerCapability('light_hue', 'colour_data');
    this.registerCapability('light_saturation', 'colour_data');
    this.registerCapability('light_temperature', 'temp_value');
    
    // Écouteurs d'événements
    this.on('capability:onoff:changed', this.onCapabilityOnOff.bind(this));
    this.on('capability:dim:changed', this.onCapabilityDim.bind(this));
    this.on('capability:light_hue:changed', this.onCapabilityLightHue.bind(this));
    this.on('capability:light_saturation:changed', this.onCapabilityLightSaturation.bind(this));
    this.on('capability:light_temperature:changed', this.onCapabilityLightTemperature.bind(this));
  }

  async onCapabilityOnOff(value, opts) {
    try {
      await this.setDataPoint('switch_1', value);
      this.log('OnOff capability changed:', value);
    } catch (error) {
      this.error('Error setting onoff capability:', error);
    }
  }

  async onCapabilityDim(value, opts) {
    try {
      await this.setDataPoint('bright_value_1', Math.round(value * 100));
      this.log('Dim capability changed:', value);
    } catch (error) {
      this.error('Error setting dim capability:', error);
    }
  }

  async onCapabilityLightHue(value, opts) {
    try {
      const currentData = this.getDataPoint('colour_data') || {};
      currentData.hue = Math.round(value);
      await this.setDataPoint('colour_data', currentData);
      this.log('Light hue capability changed:', value);
    } catch (error) {
      this.error('Error setting light hue capability:', error);
    }
  }

  async onCapabilityLightSaturation(value, opts) {
    try {
      const currentData = this.getDataPoint('colour_data') || {};
      currentData.saturation = Math.round(value);
      await this.setDataPoint('colour_data', currentData);
      this.log('Light saturation capability changed:', value);
    } catch (error) {
      this.error('Error setting light saturation capability:', error);
    }
  }

  async onCapabilityLightTemperature(value, opts) {
    try {
      await this.setDataPoint('temp_value', Math.round(value));
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
    this.log('Tuya Lighting Device deleted');
  }
}

module.exports = TuyaLightingDevice; 