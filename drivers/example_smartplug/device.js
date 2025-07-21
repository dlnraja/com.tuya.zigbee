'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');

class SmartPlugDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // Enregistre le cluster spécifique Tuya
    this.tuyaSpecificCluster = this.zclNode.endpoints[1].addCluster(TuyaSpecificCluster);
    
    // Enregistre les listeners pour les données entrantes
    this.tuyaSpecificCluster.on('dataReport', this.onDataReport.bind(this));
    
    // Initialisation des capabilities
    this.registerCapability('onoff', CLUSTER.ON_OFF);
    
    // Si l'appareil prend en charge la mesure de puissance
    if (this.hasCapability('measure_power')) {
      this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT);
    }
    
    this.log('Smart Plug device initialized');
  }
  
  // Gestion des rapports de données Tuya
  onDataReport(data) {
    this.log('Received data report:', data);
    
    // Traitement selon l'ID du datapoint
    switch(data.dpId) {
      case 1: // État on/off
        const onoff = data.data[0] === 1;
        this.setCapabilityValue('onoff', onoff).catch(this.error);
        break;
        
      case 4: // Consommation électrique (si supporté)
        if (this.hasCapability('measure_power')) {
          const power = data.data.readUInt32BE(0) / 10; // Watts
          this.setCapabilityValue('measure_power', power).catch(this.error);
        }
        break;
    }
  }
}

module.exports = SmartPlugDevice;
