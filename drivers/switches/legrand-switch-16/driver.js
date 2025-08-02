'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class legrandSwitch_16Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('legrand-switch-16 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = legrandSwitch_16Driver;
