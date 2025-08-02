'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class legrandSwitch_11Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('legrand-switch-11 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = legrandSwitch_11Driver;
