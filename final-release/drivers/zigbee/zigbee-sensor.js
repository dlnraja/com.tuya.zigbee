/**
 * 🌡️ zigbee-sensor
 * Driver pour appareils ZIGBEE - sensors
 * Généré automatiquement par DriversGeneratorUltimate
 */

const { ZigbeeDevice } = require('homey-meshdriver');

class Zigbeesensor extends ZigbeeDevice {
  
  async onMeshInit() {
    // Configuration des capacités
    this.registerCapability('measure_temperature', 'genOnOff');
    this.registerCapability('measure_humidity', 'genOnOff');
    
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

module.exports = Zigbeesensor;
