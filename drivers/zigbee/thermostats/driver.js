'use strict';

const { ZigbeeDevice } = require('homey-zigbee');

class ZigbeeThermostatsDriver extends ZigbeeDevice {
  async onInit() {
    await super.onInit();
    
    // Logique d'initialisation spécifique aux thermostats
    this.log('Zigbee Thermostats Driver initialized');
    
    // Enregistrer les capacités
    this.registerCapability('onoff', 'genOnOff');
    this.registerCapability('target_temperature', 'hvacThermostat');
    this.registerCapability('measure_temperature', 'hvacThermostat');
    this.registerCapability('measure_humidity', 'msRelativeHumidity');
  }

  async onSettings(oldSettings, newSettings, changedKeys) {
    // Gestion des paramètres
    this.log('Settings updated:', changedKeys);
  }

  async onDeleted() {
    // Nettoyage lors de la suppression
    this.log('Zigbee Thermostats Device deleted');
  }
}

module.exports = ZigbeeThermostatsDriver; 