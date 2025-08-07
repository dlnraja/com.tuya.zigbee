'use strict';

const { TuyaDevice } = require('homey-tuya');

class TuyaLightingDriver extends TuyaDevice {
  async onInit() {
    await super.onInit();
    
    // Logique d'initialisation spécifique aux appareils d'éclairage
    this.log('Tuya Lighting Driver initialized');
    
    // Enregistrer les capacités
    this.registerCapability('onoff', 'switch_1');
    this.registerCapability('dim', 'bright_value_1');
    this.registerCapability('light_hue', 'colour_data');
    this.registerCapability('light_saturation', 'colour_data');
    this.registerCapability('light_temperature', 'temp_value');
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

module.exports = TuyaLightingDriver; 