'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class TuyaTS011FDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('TS011F Device has been initialized');

    // Enregistrement des capacités de base
    this.registerCapability('onoff', CLUSTER.ON_OFF);
    
    // Enregistrement des capacités de mesure avancées
    this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
      get: 'activePower',
      report: 'activePower',
      reportParser: value => value / 10, // Conversion en Watts
    });

    this.registerCapability('measure_voltage', CLUSTER.ELECTRICAL_MEASUREMENT, {
      get: 'rmsVoltage',
      report: 'rmsVoltage',
      reportParser: value => value, // Conservation de la valeur en Volts
    });

    this.registerCapability('measure_current', CLUSTER.ELECTRICAL_MEASUREMENT, {
      get: 'rmsCurrent',
      report: 'rmsCurrent',
      reportParser: value => value / 1000, // Conversion en Ampères
    });

    this.registerCapability('meter_power', CLUSTER.METERING, {
      get: 'currentSummationDelivered',
      report: 'currentSummationDelivered',
      reportParser: value => value / 1000, // Conversion en kWh
    });

    // Initialisation du score de fiabilité
    this._reliabilityScore = this.calculateReliabilityScore();
    this.log(`Reliability score initialized: ${this._reliabilityScore}`);

    // Gestion des paramètres spécifiques
    this.registerSettings();
  }

  // Calcul du score de fiabilité basé sur les sources
  calculateReliabilityScore() {
    const sources = this.getStoreValue('sources') || [];
    const weights = {
      'tuya-official': 1.0,
      'blakadder': 0.9,
      'zigbee2mqtt': 0.8,
      'homey-forum': 0.7,
      'user-submitted': 0.6
    };
    
    return sources.reduce((score, source) => {
      return score + (weights[source.type] || 0.5) * source.confidence;
    }, 0);
  }

  registerSettings() {
    // Paramètre pour l'état au démarrage
    this.registerSetting('powerOnState', value => ({
      powerOnState: value ? 1 : 0
    }));

    // Contrôle de la LED
    this.registerSetting('ledIndicator', value => ({
      ledIndicator: value ? 1 : 0
    }));

    // Verrouillage enfant
    this.registerSetting('childLock', value => ({
      childLock: value ? 1 : 0
    }));
  }

  // Mise à jour automatique via le système d'automatisation
  async updateFromSources(sources) {
    this.setStoreValue('sources', sources);
    this._reliabilityScore = this.calculateReliabilityScore();
    this.log(`Reliability score updated: ${this._reliabilityScore}`);
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('TS011F settings were changed');
    // Handle settings changes if needed
  }

  onDeleted() {
    this.log('TS011F device removed');
  }
}

module.exports = TuyaTS011FDevice;
