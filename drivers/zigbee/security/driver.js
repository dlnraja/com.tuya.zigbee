'use strict';

const { ZigbeeDevice } = require('homey-zigbee');

class ZigbeeSecurityDriver extends ZigbeeDevice {
  async onInit() {
    await super.onInit();
    
    // Logique d'initialisation spécifique à la sécurité
    this.log('Zigbee Security Driver initialized');
    
    // Enregistrer les capacités
    this.registerCapability('onoff', 'genOnOff');
    this.registerCapability('alarm_contact', 'ssIasZone');
    this.registerCapability('alarm_motion', 'ssIasZone');
  }

  async onSettings(oldSettings, newSettings, changedKeys) {
    // Gestion des paramètres
    this.log('Settings updated:', changedKeys);
  }

  async onDeleted() {
    // Nettoyage lors de la suppression
    this.log('Zigbee Security Device deleted');
  }
}

module.exports = ZigbeeSecurityDriver; 