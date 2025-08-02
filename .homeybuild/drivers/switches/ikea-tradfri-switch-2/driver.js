'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class ikeaTradfriSwitch_2Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('ikea-tradfri-switch-2 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = ikeaTradfriSwitch_2Driver;
