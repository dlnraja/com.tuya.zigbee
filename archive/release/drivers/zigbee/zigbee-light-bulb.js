#!/usr/bin/env node
'use strict';

/**
 * 💡 zigbee-light-bulb
 * Driver pour appareils ZIGBEE - lights
 * Généré automatiquement par DriversGeneratorUltimate
 */

const { ZigbeeDevice } = require('homey-meshdriver');

class Zigbeelightbulb extends ZigbeeDevice {
  
  async onMeshInit() {
    // Configuration des capacités
    this.registerCapability('onoff', 'genOnOff');
    this.registerCapability('dim', 'genOnOff');
    this.registerCapability('light_temperature', 'genOnOff');
    
    // Configuration des événements
    this.registerReportListener('genOnOff', 'attr', (report) => {
      this.log('Rapport reçu:', report);
    });
  }
  
  async onSettings(oldSettings, newSettings, changedKeys) {
    this.log('Paramètres mis à jour:', changedKeys);
  }
  
  async onDeleted() {
    this.log('Appareil supprimé');
  }
}

module.exports = Zigbeelightbulb;
