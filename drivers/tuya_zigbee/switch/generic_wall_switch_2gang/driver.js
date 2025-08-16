#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class GenericWallSwitch2gangDriver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 GenericWallSwitch2gangDriver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('onoff', 'genOnOff');
        
        // Configuration des clusters
        this.registerClusterCapability('genOnOff', 'onoff');
    }
}

module.exports = GenericWallSwitch2gangDriver;