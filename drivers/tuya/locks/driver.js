'use strict';

const { TuyaDevice } = require('homey-tuya');

class TuyaLocksDriver extends TuyaDevice {
  async onInit() {
    await super.onInit();
    
    // Logique d'initialisation spécifique aux serrures
    this.log('Tuya Locks Driver initialized');
    
    // Enregistrer les capacités
    this.registerCapability('onoff', 'switch_1');
    this.registerCapability('lock_state', 'lock_state');
  }

  async onSettings(oldSettings, newSettings, changedKeys) {
    // Gestion des paramètres
    this.log('Settings updated:', changedKeys);
  }

  async onDeleted() {
    // Nettoyage lors de la suppression
    this.log('Tuya Locks Device deleted');
  }
}

module.exports = TuyaLocksDriver; 