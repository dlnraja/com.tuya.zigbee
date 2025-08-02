'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class innrSwitch_8Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('innr-switch-8 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = innrSwitch_8Driver;
