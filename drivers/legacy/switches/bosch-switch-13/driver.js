'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class boschSwitch_13Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('bosch-switch-13 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = boschSwitch_13Driver;
