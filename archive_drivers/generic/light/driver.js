#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class GenericLightDriver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 GenericLightDriver initialisé (fallback intelligent)');
        
        // Configuration générique des capabilities
        this.registerCapability('onoff', 'genOnOff');
        this.registerCapability('dim', 'genLevelCtrl');
        this.registerCapability('light_temperature', 'lightingColorCtrl');
        this.registerCapability('light_mode', 'genBasic');
    }
}

module.exports = GenericLightDriver;