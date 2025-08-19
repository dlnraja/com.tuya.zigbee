#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AqaraStrip599Driver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 AqaraStrip599Driver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('onoff', 'genOnOff');
        this.registerCapability('dim', 'genLevelCtrl');
        this.registerCapability('light_temperature', 'lightingColorCtrl');
        this.registerCapability('light_mode', 'genBasic');
        
        // Configuration des clusters
        this.registerClusterCapability('genOnOff', 'onoff');
        this.registerClusterCapability('genLevelCtrl', 'dim');
        this.registerClusterCapability('lightingColorCtrl', 'light_temperature');
    }
}

module.exports = AqaraStrip599Driver;