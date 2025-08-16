#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class generic_wall_switch_2gangDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode, node }) {
    await super.onNodeInit({ zclNode, node });
    
    // Logique spécifique à l'appareil générique
    this.log('Appareil générique initialisé:', node.label);
    
    // Enregistrer les capabilities de base
    await this.registerCapability('onoff', 'genOnOff');
  }
}

module.exports = generic_wall_switch_2gangDevice;
