'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class vimarSwitch_19Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('vimar-switch-19 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = vimarSwitch_19Driver;
