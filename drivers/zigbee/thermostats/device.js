'use strict';

const { ZigbeeDevice } = require('homey-zigbee');

class ZigbeeThermostatsDevice extends ZigbeeDevice {
  async onInit() {
    await super.onInit();
    
    // Logique d'initialisation spécifique aux thermostats
    this.log('Zigbee Thermostats Device initialized');
    
    // Enregistrer les capacités
    this.registerCapability('onoff', 'genOnOff');
    this.registerCapability('target_temperature', 'hvacThermostat');
    this.registerCapability('measure_temperature', 'hvacThermostat');
    this.registerCapability('measure_humidity', 'msRelativeHumidity');
    
    // Écouteurs d'événements
    this.on('capability:onoff:changed', this.onCapabilityOnOff.bind(this));
    this.on('capability:target_temperature:changed', this.onCapabilityTargetTemperature.bind(this));
  }

  async onCapabilityOnOff(value, opts) {
    try {
      await this.setClusterData('genOnOff', { onOff: value });
      this.log('OnOff capability changed:', value);
    } catch (error) {
      this.error('Error setting onoff capability:', error);
    }
  }

  async onCapabilityTargetTemperature(value, opts) {
    try {
      await this.setClusterData('hvacThermostat', { occupiedHeatingSetpoint: value * 100 });
      this.log('Target temperature capability changed:', value);
    } catch (error) {
      this.error('Error setting target temperature capability:', error);
    }
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

module.exports = ZigbeeThermostatsDevice; 