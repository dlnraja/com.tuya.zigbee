'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const attachZBVerbose = require('../../..//lib/zb-verbose');

class generic_zigbee_switchDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode, node }) {
    await super.onNodeInit({ zclNode, node });
    
    // Logique spécifique à l'appareil générique
    this.log('Appareil générique initialisé:', node.label);
    
    // Enregistrer les capabilities de base
    await this.registerCapability('onoff', 'genOnOff');
  }
}

module.exports = generic_zigbee_switchDevice;
