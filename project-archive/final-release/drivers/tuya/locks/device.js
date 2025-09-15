// Enhanced by Mega Ultimate Bug Fixer
// Device Type: tuya
// Category: locks

// Enrichment Date: 2025-08-07T17:53:54.830Z

'use strict';

const { TuyaDevice } = require('homey-tuya');

class TuyaLocksDevice extends TuyaDevice {
  async onInit() {
    await super.onInit();
    
    // Logique d'initialisation spécifique aux serrures
    this.log('Tuya Locks Device initialized');
    
    // Enregistrer les capacités
    this.registerCapability('onoff', 'switch_1');
    this.registerCapability('lock_state', 'lock_state');
    
    // Écouteurs d'événements
    this.on('capability:onoff:changed', this.onCapabilityOnOff.bind(this));
    this.on('capability:lock_state:changed', this.onCapabilityLockState.bind(this));
  }

  async onCapabilityOnOff(value, opts) {
    try {
      await this.setDataPoint('switch_1', value);
      this.log('OnOff capability changed:', value);
    } catch (error) {
      this.error('Error setting onoff capability:', error);
    }
  }

  async onCapabilityLockState(value, opts) {
    try {
      await this.setDataPoint('lock_state', value);
      this.log('Lock state capability changed:', value);
    } catch (error) {
      this.error('Error setting lock state capability:', error);
    }
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

module.exports = TuyaLocksDevice; 